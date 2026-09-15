import localforage from 'localforage';
import { create } from 'zustand';
import { useHistoryStore } from '@/stores';
import type { History } from '@/types';
import { pruneToolImages, runAgent } from './core/agent';
import { BEEDLY_SYSTEM_PROMPT } from './core/system-prompt';
import type { ChatMessage } from './core/types';
import { getActiveProfile, getTransport, useBeedlySettings } from './settings';
import { editorTools } from './tools';
import {
	type StreamDraft,
	type ToolMeta,
	emptyDraft,
	titleFromPrompt,
} from './transcript';

/**
 * Beedly conversations: the messages sent to the model, the run in progress
 * and the saved history of chats.
 */

export interface Conversation {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	messages: ChatMessage[];
	toolMeta: Record<string, ToolMeta>;
	/** Error that ended the last run. */
	error: string | null;
}

export type ConversationSummary = Pick<
	Conversation,
	'id' | 'title' | 'updatedAt'
>;

const MAX_CONVERSATIONS = 30;

interface ConversationState {
	current: Conversation;
	conversations: ConversationSummary[];
	running: boolean;
	/** Conversation of the run in progress (the user may open another one). */
	runningConversationId: string | null;
	draft: StreamDraft | null;
	runningToolId: string | null;
	/** Undo step of the last finished response, and its conversation. */
	lastRun: { conversationId: string; entry: History } | null;
	loaded: boolean;

	load: () => Promise<void>;
	send: (text: string) => void;
	retry: () => void;
	stop: () => void;
	newConversation: () => void;
	openConversation: (id: string) => Promise<void>;
	deleteConversation: (id: string) => Promise<void>;
}

const storage = localforage.createInstance({
	name: 'karbonized',
	storeName: 'beedly-conversations',
});

const INDEX_KEY = 'index';
const conversationKey = (id: string) => `conversation:${id}`;

const createConversation = (): Conversation => ({
	id: `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
	title: 'New chat',
	createdAt: Date.now(),
	updatedAt: Date.now(),
	messages: [],
	toolMeta: {},
	error: null,
});

let controller: AbortController | null = null;

export const useBeedlyConversation = create<ConversationState>((set, get) => {
	const update = (patch: Partial<Conversation>) =>
		set((state) => ({
			current: { ...state.current, ...patch, updatedAt: Date.now() },
		}));

	const persist = async (conversation: Conversation) => {
		if (conversation.messages.length === 0) return;

		try {
			await storage.setItem(conversationKey(conversation.id), {
				...conversation,
				messages: pruneToolImages(conversation.messages),
			});

			const summaries = [
				{
					id: conversation.id,
					title: conversation.title,
					updatedAt: conversation.updatedAt,
				},
				...get().conversations.filter((item) => item.id !== conversation.id),
			];
			const kept = summaries.slice(0, MAX_CONVERSATIONS);
			await Promise.all(
				summaries
					.slice(MAX_CONVERSATIONS)
					.map((item) => storage.removeItem(conversationKey(item.id))),
			);
			await storage.setItem(INDEX_KEY, kept);
			set({ conversations: kept });
		} catch (error) {
			console.error('Could not save the Beedly conversation:', error);
		}
	};

	const run = async () => {
		const profile = getActiveProfile(useBeedlySettings.getState());
		if (!profile || get().running) return;

		controller = new AbortController();
		const { signal } = controller;
		const recorded = new Set<History>();

		// The run keeps writing to its own conversation, even if the user
		// opens another one meanwhile.
		let conversation: Conversation = { ...get().current, error: null };
		const apply = (patch: Partial<Conversation>) => {
			conversation = { ...conversation, ...patch, updatedAt: Date.now() };
			if (get().current.id === conversation.id) set({ current: conversation });
		};

		set({
			running: true,
			runningConversationId: conversation.id,
			draft: emptyDraft(),
			runningToolId: null,
		});
		apply({ error: null });

		try {
			for await (const event of runAgent({
				profile,
				transport: getTransport(),
				system: BEEDLY_SYSTEM_PROMPT,
				messages: conversation.messages,
				tools: editorTools,
				signal,
			})) {
				switch (event.type) {
					case 'step-start':
						set({ draft: emptyDraft() });
						break;
					case 'text-delta':
						set((state) => ({
							draft: state.draft && {
								...state.draft,
								text: state.draft.text + event.text,
							},
						}));
						break;
					case 'reasoning-delta':
						set((state) => ({
							draft: state.draft && {
								...state.draft,
								reasoning: state.draft.reasoning + event.text,
							},
						}));
						break;
					case 'tool-call-start':
						set((state) => ({
							draft: state.draft && {
								...state.draft,
								calls: [
									...state.draft.calls,
									{ id: event.id, name: event.name, argsText: '' },
								],
							},
						}));
						break;
					case 'tool-call-delta':
						set((state) => ({
							draft: state.draft && {
								...state.draft,
								calls: state.draft.calls.map((call) =>
									call.id === event.id
										? { ...call, argsText: call.argsText + event.argsText }
										: call,
								),
							},
						}));
						break;
					case 'message':
						set({ draft: null });
						apply({ messages: [...conversation.messages, event.message] });
						void persist(conversation);
						break;
					case 'tool-start':
						set({ runningToolId: event.call.id });
						break;
					case 'tool-result':
						if (event.historyEntry) recorded.add(event.historyEntry);
						set({ runningToolId: null });
						apply({
							toolMeta: {
								...conversation.toolMeta,
								[event.result.callId]: { durationMs: event.durationMs },
							},
						});
						break;
					case 'error':
						apply({ error: event.error.message });
						break;
					case 'finish':
						if (event.reason === 'max-steps') {
							apply({
								error:
									'Beedly stopped after too many steps. Send a message to continue.',
							});
						}
						break;
				}
			}
		} finally {
			// Everything this response changed undoes in one step.
			const entry = useHistoryStore.getState().collapseTrailing(recorded);
			controller = null;
			set({
				lastRun: entry ? { conversationId: conversation.id, entry } : null,
				running: false,
				runningConversationId: null,
				draft: null,
				runningToolId: null,
			});
			void persist(conversation);
		}
	};

	return {
		current: createConversation(),
		conversations: [],
		running: false,
		runningConversationId: null,
		draft: null,
		runningToolId: null,
		lastRun: null,
		loaded: false,

		load: async () => {
			if (get().loaded) return;
			try {
				const index =
					(await storage.getItem<ConversationSummary[]>(INDEX_KEY)) ?? [];
				set({ conversations: index, loaded: true });
			} catch {
				set({ loaded: true });
			}
		},

		send: (text) => {
			const prompt = text.trim();
			if (prompt === '' || get().running) return;

			const { current } = get();
			update({
				title:
					current.messages.length === 0
						? titleFromPrompt(prompt)
						: current.title,
				messages: [
					...current.messages,
					{ role: 'user', content: [{ type: 'text', text: prompt }] },
				],
			});
			void run();
		},

		retry: () => {
			if (get().running) return;
			const { messages } = get().current;

			// Drop the last response and ask again from the last prompt.
			let lastPrompt = messages.length - 1;
			while (
				lastPrompt >= 0 &&
				!(
					messages[lastPrompt].role === 'user' &&
					messages[lastPrompt].content.some((part) => part.type === 'text')
				)
			) {
				lastPrompt -= 1;
			}
			if (lastPrompt < 0) return;

			update({ messages: messages.slice(0, lastPrompt + 1), error: null });
			void run();
		},

		stop: () => {
			controller?.abort();
		},

		newConversation: () => {
			if (get().running) get().stop();
			set({ current: createConversation(), draft: null });
		},

		openConversation: async (id) => {
			if (get().current.id === id) return;
			if (get().running) get().stop();

			const conversation = await storage.getItem<Conversation>(
				conversationKey(id),
			);
			if (conversation) set({ current: conversation, draft: null });
		},

		deleteConversation: async (id) => {
			await storage.removeItem(conversationKey(id));
			const conversations = get().conversations.filter(
				(item) => item.id !== id,
			);
			await storage.setItem(INDEX_KEY, conversations);
			set({ conversations });
			if (get().current.id === id) set({ current: createConversation() });
		},
	};
});
