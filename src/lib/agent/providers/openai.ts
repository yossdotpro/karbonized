import { tryParseJson, parseSSE } from '../core/sse';
import { ProviderError } from '../core/errors';
import type {
	ChatMessage,
	ContentPart,
	FinishReason,
	ProviderAdapter,
	StreamEvent,
	Usage,
} from '../core/types';
import type { ToolContent } from '../tools/registry';
import { createCallId, joinUrl, parseToolArgs } from './shared';

/**
 * OpenAI Chat Completions, also spoken by OpenRouter, LM Studio, Ollama
 * (`/v1`) and most self-hosted servers.
 * https://platform.openai.com/docs/api-reference/chat/streaming
 */

// Provider JSON is loosely typed; fields are checked where they are read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

const dataUrl = (part: { mimeType: string; data: string }) =>
	`data:${part.mimeType};base64,${part.data}`;

const textOf = (content: ToolContent[]) =>
	content
		.map((item) =>
			item.type === 'text' ? item.text : '[image attached below]',
		)
		.join('\n');

export const toOpenAIMessages = (system: string, messages: ChatMessage[]) => {
	const result: Loose[] = [{ role: 'system', content: system }];

	messages.forEach((message) => {
		if (message.role === 'assistant') {
			const text = message.content
				.filter((part) => part.type === 'text')
				.map((part) => part.text)
				.join('');
			const toolCalls = message.content
				.filter((part) => part.type === 'tool_call')
				.map((part) => ({
					id: part.id,
					type: 'function',
					function: {
						name: part.name,
						arguments:
							typeof part.args === 'string'
								? part.args
								: JSON.stringify(part.args ?? {}),
					},
				}));

			if (text === '' && toolCalls.length === 0) return;
			result.push({
				role: 'assistant',
				content: text === '' ? null : text,
				...(toolCalls.length > 0 && { tool_calls: toolCalls }),
			});
			return;
		}

		// Tool messages only take text: images of tool results follow in a user
		// message.
		const images: Loose[] = [];
		const userParts: Loose[] = [];

		message.content.forEach((part) => {
			if (part.type === 'tool_result') {
				result.push({
					role: 'tool',
					tool_call_id: part.callId,
					content: part.isError
						? `Error: ${textOf(part.content)}`
						: textOf(part.content),
				});
				part.content
					.filter((item) => item.type === 'image')
					.forEach((item) =>
						images.push({
							type: 'image_url',
							image_url: { url: dataUrl(item) },
						}),
					);
			} else if (part.type === 'text') {
				userParts.push({ type: 'text', text: part.text });
			} else if (part.type === 'image') {
				userParts.push({
					type: 'image_url',
					image_url: { url: dataUrl(part) },
				});
			}
		});

		const content = [...images, ...userParts];
		if (content.length === 0) return;
		result.push({
			role: 'user',
			content:
				content.length === 1 && content[0].type === 'text'
					? content[0].text
					: content,
		});
	});

	return result;
};

const FINISH_REASONS: Record<string, FinishReason> = {
	stop: 'stop',
	tool_calls: 'tool_calls',
	function_call: 'tool_calls',
	length: 'length',
	content_filter: 'refusal',
};

async function* parseStream(
	chunks: AsyncIterable<string>,
): AsyncGenerator<StreamEvent> {
	let text = '';
	let reasoning = '';
	const calls = new Map<number, { id: string; name: string; json: string }>();
	let finishReason: FinishReason = 'other';
	const usage: Usage = {};

	for await (const { data } of parseSSE(chunks)) {
		if (data === '[DONE]') break;
		const chunk = tryParseJson(data) as Loose | undefined;
		if (!chunk) continue;

		if (chunk.error) {
			throw new ProviderError(
				'stream',
				String(chunk.error.message ?? 'The response stream failed.'),
			);
		}

		if (chunk.usage) {
			usage.inputTokens = chunk.usage.prompt_tokens;
			usage.outputTokens = chunk.usage.completion_tokens;
		}

		const choice = chunk.choices?.[0];
		if (!choice) continue;
		const delta: Loose = choice.delta ?? {};

		// DeepSeek, OpenRouter, LM Studio and others stream reasoning separately.
		const reasoningDelta = delta.reasoning_content ?? delta.reasoning;
		if (typeof reasoningDelta === 'string' && reasoningDelta !== '') {
			reasoning += reasoningDelta;
			yield { type: 'reasoning-delta', text: reasoningDelta };
		}

		if (typeof delta.content === 'string' && delta.content !== '') {
			text += delta.content;
			yield { type: 'text-delta', text: delta.content };
		}

		for (const call of (delta.tool_calls as Loose[] | undefined) ?? []) {
			const index = typeof call.index === 'number' ? call.index : calls.size;
			let current = calls.get(index);

			if (!current) {
				current = {
					id: call.id || createCallId(),
					name: call.function?.name ?? '',
					json: '',
				};
				calls.set(index, current);
				yield { type: 'tool-call-start', id: current.id, name: current.name };
			} else if (call.function?.name && !current.name) {
				current.name = call.function.name;
			}

			const argsText = call.function?.arguments;
			if (typeof argsText === 'string' && argsText !== '') {
				current.json += argsText;
				yield { type: 'tool-call-delta', id: current.id, argsText };
			}
		}

		if (choice.finish_reason) {
			finishReason = FINISH_REASONS[choice.finish_reason] ?? 'other';
		}
	}

	const content: ContentPart[] = [];
	if (reasoning !== '') content.push({ type: 'reasoning', text: reasoning });
	if (text !== '') content.push({ type: 'text', text });
	Array.from(calls.entries())
		.sort(([a], [b]) => a - b)
		.forEach(([, call]) =>
			content.push({
				type: 'tool_call',
				id: call.id,
				name: call.name,
				args: parseToolArgs(call.json),
			}),
		);

	// Some servers report `stop` even when they called tools.
	if (calls.size > 0) finishReason = 'tool_calls';

	yield {
		type: 'done',
		message: { role: 'assistant', content },
		finishReason,
		usage,
	};
}

export const openaiAdapter: ProviderAdapter = {
	id: 'openai',

	buildChatRequest: (connection, request) => ({
		url: joinUrl(connection.baseUrl, '/chat/completions'),
		method: 'POST',
		headers: { 'content-type': 'application/json', ...connection.headers },
		auth: { header: 'authorization', scheme: 'Bearer' },
		body: JSON.stringify({
			model: request.model,
			messages: toOpenAIMessages(request.system, request.messages),
			...(request.tools.length > 0 && {
				tools: request.tools.map((tool) => ({
					type: 'function',
					function: {
						name: tool.name,
						description: tool.description,
						parameters: tool.inputSchema,
					},
				})),
			}),
			stream: true,
			stream_options: { include_usage: true },
		}),
	}),

	parseChatStream: parseStream,

	buildModelsRequest: (connection) => ({
		url: joinUrl(connection.baseUrl, '/models'),
		method: 'GET',
		headers: { ...connection.headers },
		auth: { header: 'authorization', scheme: 'Bearer' },
	}),

	parseModels: (body) =>
		(((body as Loose)?.data as Loose[] | undefined) ?? [])
			.filter((model) => typeof model.id === 'string')
			.map((model) => ({
				id: model.id as string,
				label: typeof model.name === 'string' ? model.name : undefined,
			}))
			.sort((a, b) => a.id.localeCompare(b.id)),

	parseError: (body) => {
		const json = tryParseJson(body) as Loose | undefined;
		const error = json?.error;
		if (typeof error === 'string') return error;
		return typeof error?.message === 'string' ? error.message : undefined;
	},
};
