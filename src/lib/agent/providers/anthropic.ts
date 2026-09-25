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
import { joinUrl, parseToolArgs } from './shared';

/**
 * Anthropic Messages API.
 * https://docs.anthropic.com/en/api/messages-streaming
 */

const DEFAULT_MAX_TOKENS = 16000;

type AnthropicBlock = Record<string, unknown> & { type: string };

// Provider JSON is loosely typed; fields are checked where they are read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

const toAnthropicContent = (part: ContentPart): AnthropicBlock[] => {
	switch (part.type) {
		case 'text':
			return part.text === '' ? [] : [{ type: 'text', text: part.text }];
		case 'image':
			return [
				{
					type: 'image',
					source: {
						type: 'base64',
						media_type: part.mimeType,
						data: part.data,
					},
				},
			];
		case 'reasoning': {
			const signature = part.providerMetadata?.signature;
			const redacted = part.providerMetadata?.redactedData;
			if (typeof redacted === 'string') {
				return [{ type: 'redacted_thinking', data: redacted }];
			}
			// Thinking without its signature is rejected: drop it.
			return typeof signature === 'string'
				? [{ type: 'thinking', thinking: part.text, signature }]
				: [];
		}
		case 'tool_call':
			return [
				{
					type: 'tool_use',
					id: part.id,
					name: part.name,
					input: part.args ?? {},
				},
			];
		case 'tool_result':
			return [
				{
					type: 'tool_result',
					tool_use_id: part.callId,
					content: part.content.map((item) =>
						item.type === 'text'
							? { type: 'text', text: item.text }
							: {
									type: 'image',
									source: {
										type: 'base64',
										media_type: item.mimeType,
										data: item.data,
									},
								},
					),
					...(part.isError && { is_error: true }),
				},
			];
	}
};

export const toAnthropicMessages = (messages: ChatMessage[]) => {
	const result: Array<{ role: string; content: AnthropicBlock[] }> = [];

	messages.forEach((message) => {
		const content = message.content.flatMap(toAnthropicContent);
		if (content.length === 0) return;

		const previous = result[result.length - 1];
		// Turns must alternate.
		if (previous?.role === message.role) previous.content.push(...content);
		else result.push({ role: message.role, content });
	});

	return result;
};

const FINISH_REASONS: Record<string, FinishReason> = {
	end_turn: 'stop',
	stop_sequence: 'stop',
	tool_use: 'tool_calls',
	max_tokens: 'length',
	refusal: 'refusal',
};

async function* parseStream(
	chunks: AsyncIterable<string>,
): AsyncGenerator<StreamEvent> {
	const parts: ContentPart[] = [];
	/** Content block index → position in `parts` and raw tool input JSON. */
	const blocks = new Map<number, { part: ContentPart; json: string }>();
	let finishReason: FinishReason = 'other';
	const usage: Usage = {};

	for await (const { data } of parseSSE(chunks)) {
		const event = tryParseJson(data) as Loose | undefined;
		if (!event) continue;

		switch (event.type) {
			case 'message_start':
				usage.inputTokens = event.message?.usage?.input_tokens;
				break;

			case 'content_block_start': {
				const block = event.content_block ?? {};
				let part: ContentPart | undefined;

				if (block.type === 'text') {
					part = { type: 'text', text: block.text ?? '' };
				} else if (block.type === 'thinking') {
					part = { type: 'reasoning', text: block.thinking ?? '' };
				} else if (block.type === 'redacted_thinking') {
					part = {
						type: 'reasoning',
						text: '',
						providerMetadata: { redactedData: block.data },
					};
				} else if (block.type === 'tool_use') {
					part = {
						type: 'tool_call',
						id: block.id,
						name: block.name,
						args: {},
					};
					yield { type: 'tool-call-start', id: block.id, name: block.name };
				}

				if (part) {
					parts.push(part);
					blocks.set(event.index, { part, json: '' });
				}
				break;
			}

			case 'content_block_delta': {
				const block = blocks.get(event.index);
				const delta = event.delta ?? {};
				if (!block) break;

				if (delta.type === 'text_delta' && block.part.type === 'text') {
					block.part.text += delta.text;
					yield { type: 'text-delta', text: delta.text };
				} else if (
					delta.type === 'thinking_delta' &&
					block.part.type === 'reasoning'
				) {
					block.part.text += delta.thinking;
					yield { type: 'reasoning-delta', text: delta.thinking };
				} else if (
					delta.type === 'signature_delta' &&
					block.part.type === 'reasoning'
				) {
					block.part.providerMetadata = {
						signature: `${String(block.part.providerMetadata?.signature ?? '')}${delta.signature}`,
					};
				} else if (
					delta.type === 'input_json_delta' &&
					block.part.type === 'tool_call'
				) {
					block.json += delta.partial_json;
					yield {
						type: 'tool-call-delta',
						id: block.part.id,
						argsText: delta.partial_json,
					};
				}
				break;
			}

			case 'content_block_stop': {
				const block = blocks.get(event.index);
				if (block?.part.type === 'tool_call') {
					block.part.args = parseToolArgs(block.json);
				}
				break;
			}

			case 'message_delta':
				if (event.delta?.stop_reason) {
					finishReason = FINISH_REASONS[event.delta.stop_reason] ?? 'other';
				}
				if (event.usage?.output_tokens !== undefined) {
					usage.outputTokens = event.usage.output_tokens;
				}
				break;

			case 'error':
				throw new ProviderError(
					event.error?.type === 'overloaded_error' ? 'overloaded' : 'stream',
					event.error?.message ?? 'The response stream failed.',
				);
		}
	}

	yield {
		type: 'done',
		message: { role: 'assistant', content: parts },
		finishReason,
		usage,
	};
}

export const anthropicAdapter: ProviderAdapter = {
	id: 'anthropic',

	buildChatRequest: (connection, request) => {
		const tools = request.tools.map((tool, index) => ({
			name: tool.name,
			description: tool.description,
			input_schema: tool.inputSchema,
			// Cache the (large, stable) system prompt and tool list.
			...(index === request.tools.length - 1 && {
				cache_control: { type: 'ephemeral' },
			}),
		}));

		return {
			url: joinUrl(connection.baseUrl, '/v1/messages'),
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'anthropic-version': '2023-06-01',
				'anthropic-dangerous-direct-browser-access': 'true',
				...connection.headers,
			},
			auth: { header: 'x-api-key' },
			body: JSON.stringify({
				model: request.model,
				max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
				system: [
					{
						type: 'text',
						text: request.system,
						cache_control: { type: 'ephemeral' },
					},
				],
				messages: toAnthropicMessages(request.messages),
				...(tools.length > 0 && { tools }),
				stream: true,
			}),
		};
	},

	parseChatStream: parseStream,

	buildModelsRequest: (connection) => ({
		url: joinUrl(connection.baseUrl, '/v1/models?limit=100'),
		method: 'GET',
		headers: {
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true',
			...connection.headers,
		},
		auth: { header: 'x-api-key' },
	}),

	parseModels: (body) =>
		(
			(body as { data?: Array<{ id: string; display_name?: string }> })?.data ??
			[]
		)
			.filter((model) => typeof model.id === 'string')
			.map((model) => ({ id: model.id, label: model.display_name })),

	parseError: (body) => {
		const json = tryParseJson(body) as
			{ error?: { message?: string } } | undefined;
		return json?.error?.message;
	},
};
