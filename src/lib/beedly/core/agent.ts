import type { History } from '@/types';
import {
	type ToolContext,
	type ToolDefinition,
	type ToolExecution,
	describeTool,
	errorResult,
	executeTool,
} from '../tools/registry';
import { type ProviderProfile, streamChat } from './client';
import { isAbortError } from './errors';
import type {
	ChatMessage,
	StreamEvent,
	ToolCallPart,
	ToolResultPart,
	Transport,
	Usage,
} from './types';

export const DEFAULT_MAX_STEPS = 25;

/** Tools that need a model that can see images. */
const IMAGE_TOOLS = new Set(['get_canvas_snapshot']);

export type AgentFinishReason =
	'stop' | 'length' | 'refusal' | 'max-steps' | 'aborted' | 'error' | 'other';

export type AgentEvent =
	| { type: 'step-start'; step: number }
	| Exclude<StreamEvent, { type: 'done' }>
	/** A message to append to the conversation. */
	| { type: 'message'; message: ChatMessage }
	| { type: 'tool-start'; call: ToolCallPart }
	| {
			type: 'tool-result';
			result: ToolResultPart;
			durationMs: number;
			historyEntry: History | null;
	  }
	| { type: 'error'; error: Error }
	| { type: 'finish'; reason: AgentFinishReason; usage: Usage };

export interface AgentOptions {
	profile: ProviderProfile;
	transport: Transport;
	system: string;
	/** Conversation so far, ending with the new user message. */
	messages: ChatMessage[];
	tools: readonly ToolDefinition[];
	signal?: AbortSignal;
	maxSteps?: number;
	/** Replaceable for tests. */
	stream?: typeof streamChat;
	runTool?: (
		call: ToolCallPart,
		context: ToolContext,
	) => Promise<ToolExecution>;
}

const CANCELLED = 'Cancelled before it ran.';

const cancelledResult = (call: ToolCallPart): ToolResultPart => ({
	type: 'tool_result',
	callId: call.id,
	name: call.name,
	...errorResult(CANCELLED),
});

/**
 * Every tool call must be followed by its result, or providers reject the
 * conversation. Add "cancelled" results for calls left without one (a stopped
 * run, an app reload in the middle of a tool).
 */
export const repairToolResults = (messages: ChatMessage[]): ChatMessage[] => {
	const repaired: ChatMessage[] = [];

	for (let index = 0; index < messages.length; index += 1) {
		const message = messages[index];
		repaired.push(message);
		if (message.role !== 'assistant') continue;

		const calls = message.content.filter(
			(part): part is ToolCallPart => part.type === 'tool_call',
		);
		if (calls.length === 0) continue;

		const next = messages[index + 1];
		const answered = new Set(
			next?.role === 'user'
				? next.content.flatMap((part) =>
						part.type === 'tool_result' ? [part.callId] : [],
					)
				: [],
		);
		const missing = calls
			.filter((call) => !answered.has(call.id))
			.map(cancelledResult);
		if (missing.length === 0) continue;

		if (next?.role === 'user') {
			// Results go first, before any text of the user.
			repaired.push({ ...next, content: [...missing, ...next.content] });
			index += 1;
		} else {
			repaired.push({ role: 'user', content: missing });
		}
	}

	return repaired;
};

export const OMITTED_IMAGE = '[Earlier canvas image omitted]';

/**
 * Replace the images of all but the most recent tool results with a note:
 * every request resends the whole conversation, and old snapshots only cost
 * tokens. Images the user attached are kept.
 */
export const pruneToolImages = (
	messages: ChatMessage[],
	keep = 1,
): ChatMessage[] => {
	let kept = 0;

	return messages
		.slice()
		.reverse()
		.map((message) => {
			if (message.role !== 'user') return message;

			let changed = false;
			const content = message.content
				.slice()
				.reverse()
				.map((part) => {
					if (
						part.type !== 'tool_result' ||
						!part.content.some((item) => item.type === 'image')
					) {
						return part;
					}
					if (kept < keep) {
						kept += 1;
						return part;
					}
					changed = true;
					return {
						...part,
						content: part.content.map((item) =>
							item.type === 'image'
								? { type: 'text' as const, text: OMITTED_IMAGE }
								: item,
						),
					};
				})
				.reverse();

			return changed ? { ...message, content } : message;
		})
		.reverse();
};

const addUsage = (total: Usage, usage?: Usage) => {
	if (!usage) return;
	total.inputTokens = (total.inputTokens ?? 0) + (usage.inputTokens ?? 0);
	total.outputTokens = (total.outputTokens ?? 0) + (usage.outputTokens ?? 0);
};

/**
 * Run the model with tools until it answers without calling any, the step
 * limit is reached or the signal aborts. Never throws: failures end the run
 * with an `error` event.
 */
export async function* runAgent(
	options: AgentOptions,
): AsyncGenerator<AgentEvent> {
	const {
		profile,
		transport,
		system,
		signal,
		maxSteps = DEFAULT_MAX_STEPS,
		stream = streamChat,
	} = options;
	const context: ToolContext = {
		source: 'beedly',
		supportsImages: profile.supportsImages,
		signal,
	};
	const tools = options.tools.filter(
		(tool) => profile.supportsImages || !IMAGE_TOOLS.has(tool.name),
	);
	const runTool =
		options.runTool ??
		((call: ToolCallPart, toolContext: ToolContext) =>
			executeTool(tools, call.name, call.args, toolContext));
	const toolSpecs = tools.map(describeTool).map((tool) => ({
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
	}));

	const messages = repairToolResults([...options.messages]);
	const usage: Usage = {};

	for (let step = 1; step <= maxSteps; step += 1) {
		yield { type: 'step-start', step };

		let assistant: ChatMessage | undefined;
		let finishReason: AgentFinishReason = 'other';
		let partialText = '';

		try {
			for await (const event of stream(
				profile,
				transport,
				{ system, messages: pruneToolImages(messages), tools: toolSpecs },
				signal,
			)) {
				if (event.type === 'done') {
					assistant = event.message;
					addUsage(usage, event.usage);
					finishReason =
						event.finishReason === 'tool_calls' ? 'other' : event.finishReason;
				} else {
					if (event.type === 'text-delta') partialText += event.text;
					yield event;
				}
			}
		} catch (error) {
			if (partialText !== '') {
				yield {
					type: 'message',
					message: {
						role: 'assistant',
						content: [{ type: 'text', text: partialText }],
					},
				};
			}
			if (signal?.aborted || isAbortError(error)) {
				yield { type: 'finish', reason: 'aborted', usage };
			} else {
				yield {
					type: 'error',
					error: error instanceof Error ? error : new Error(String(error)),
				};
				yield { type: 'finish', reason: 'error', usage };
			}
			return;
		}

		if (!assistant) {
			yield { type: 'error', error: new Error('The response ended early.') };
			yield { type: 'finish', reason: 'error', usage };
			return;
		}

		messages.push(assistant);
		yield { type: 'message', message: assistant };

		const calls = assistant.content.filter(
			(part): part is ToolCallPart => part.type === 'tool_call',
		);
		if (calls.length === 0) {
			yield { type: 'finish', reason: finishReason, usage };
			return;
		}

		const results: ToolResultPart[] = [];
		for (const call of calls) {
			if (signal?.aborted) {
				results.push(cancelledResult(call));
				continue;
			}

			yield { type: 'tool-start', call };
			const started = Date.now();
			const execution = await runTool(call, context);
			const result: ToolResultPart = {
				type: 'tool_result',
				callId: call.id,
				name: call.name,
				...execution.result,
			};
			results.push(result);
			yield {
				type: 'tool-result',
				result,
				durationMs: Date.now() - started,
				historyEntry: execution.historyEntry,
			};
		}

		const toolMessage: ChatMessage = { role: 'user', content: results };
		messages.push(toolMessage);
		yield { type: 'message', message: toolMessage };

		if (signal?.aborted) {
			yield { type: 'finish', reason: 'aborted', usage };
			return;
		}
	}

	yield { type: 'finish', reason: 'max-steps', usage };
}
