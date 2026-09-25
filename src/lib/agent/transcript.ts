import type { ChatMessage, ToolCallPart, ToolResultPart } from './core/types';

/**
 * What the Agent panel shows: the conversation grouped into user prompts and
 * assistant responses. A response spans every model step and tool call until
 * the next prompt.
 */

export type ToolCallStatus = 'streaming' | 'running' | 'done' | 'error';

export interface ToolCallView {
	id: string;
	name: string;
	args: unknown;
	/** Arguments as streamed so far, while the model is still writing them. */
	argsText?: string;
	status: ToolCallStatus;
	result?: ToolResultPart;
	durationMs?: number;
}

export type AssistantPart =
	| { type: 'text'; text: string }
	| { type: 'reasoning'; text: string }
	| { type: 'tool'; call: ToolCallView };

export type TranscriptItem =
	| { kind: 'user'; key: string; text: string }
	| { kind: 'assistant'; key: string; parts: AssistantPart[] };

/** The step being streamed, before it becomes a message. */
export interface StreamDraft {
	text: string;
	reasoning: string;
	calls: Array<{ id: string; name: string; argsText: string }>;
}

export const emptyDraft = (): StreamDraft => ({
	text: '',
	reasoning: '',
	calls: [],
});

export interface ToolMeta {
	durationMs?: number;
}

const isPrompt = (message: ChatMessage) =>
	message.role === 'user' &&
	message.content.some((part) => part.type === 'text' || part.type === 'image');

export const promptText = (message: ChatMessage): string =>
	message.content
		.flatMap((part) => (part.type === 'text' ? [part.text] : []))
		.join('\n');

export const buildTranscript = (
	messages: readonly ChatMessage[],
	toolMeta: Readonly<Record<string, ToolMeta>>,
	options: { draft?: StreamDraft | null; runningToolId?: string | null } = {},
): TranscriptItem[] => {
	const results = new Map<string, ToolResultPart>();
	messages.forEach((message) =>
		message.content.forEach((part) => {
			if (part.type === 'tool_result') results.set(part.callId, part);
		}),
	);

	const items: TranscriptItem[] = [];
	let response: Extract<TranscriptItem, { kind: 'assistant' }> | undefined;

	const currentResponse = (key: string) => {
		if (!response) {
			response = { kind: 'assistant', key, parts: [] };
			items.push(response);
		}
		return response;
	};

	const callView = (call: ToolCallPart): ToolCallView => {
		const result = results.get(call.id);
		return {
			id: call.id,
			name: call.name,
			args: call.args,
			status: result
				? result.isError
					? 'error'
					: 'done'
				: options.runningToolId === call.id
					? 'running'
					: 'streaming',
			result,
			durationMs: toolMeta[call.id]?.durationMs,
		};
	};

	messages.forEach((message, index) => {
		if (isPrompt(message)) {
			items.push({ kind: 'user', key: `m${index}`, text: promptText(message) });
			response = undefined;
			return;
		}
		if (message.role !== 'assistant') return;

		const target = currentResponse(`m${index}`);
		message.content.forEach((part) => {
			if (part.type === 'text' && part.text !== '') {
				target.parts.push({ type: 'text', text: part.text });
			} else if (part.type === 'reasoning' && part.text !== '') {
				target.parts.push({ type: 'reasoning', text: part.text });
			} else if (part.type === 'tool_call') {
				target.parts.push({ type: 'tool', call: callView(part) });
			}
		});
	});

	const { draft } = options;
	if (draft) {
		const target = currentResponse(`m${messages.length}`);
		if (draft.reasoning !== '') {
			target.parts.push({ type: 'reasoning', text: draft.reasoning });
		}
		if (draft.text !== '')
			target.parts.push({ type: 'text', text: draft.text });
		draft.calls.forEach((call) =>
			target.parts.push({
				type: 'tool',
				call: {
					id: call.id,
					name: call.name,
					args: undefined,
					argsText: call.argsText,
					status: 'streaming',
				},
			}),
		);
	}

	return items;
};

/** Title of a conversation from its first prompt. */
export const titleFromPrompt = (text: string, maxLength = 48): string => {
	const line = text.trim().split('\n')[0].replace(/\s+/g, ' ');
	if (line === '') return 'New chat';
	return line.length > maxLength
		? `${line.slice(0, maxLength - 1).trimEnd()}…`
		: line;
};

const SUMMARY_KEYS = [
	'type',
	'id',
	'ids',
	'alignment',
	'axis',
	'position',
	'format',
] as const;

/** A short hint of what a call targets, e.g. `code` for add_block. */
export const summarizeArgs = (args: unknown): string => {
	if (typeof args !== 'object' || args === null) return '';
	const record = args as Record<string, unknown>;

	const parts = SUMMARY_KEYS.flatMap((key) => {
		const value = record[key];
		if (typeof value === 'string') return [value];
		if (Array.isArray(value) && value.length > 0) {
			return [value.length === 1 ? String(value[0]) : `${value.length} blocks`];
		}
		return [];
	});
	if (typeof record.width === 'number' && typeof record.height === 'number') {
		parts.push(`${record.width}×${record.height}`);
	}
	return parts.slice(0, 2).join(' · ');
};
