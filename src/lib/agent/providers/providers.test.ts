import { describe, expect, it } from 'vitest';
import type { ChatMessage, ChatRequest } from '../core/types';
import {
	chunksOf,
	collect,
	doneEvent,
	splitEvery,
	sseBody,
} from '../test-utils';
import { anthropicAdapter, toAnthropicMessages } from './anthropic';
import { geminiAdapter, toGeminiContents } from './gemini';
import { openaiAdapter, toOpenAIMessages } from './openai';
import { PROVIDER_PRESETS } from './presets';
import { joinUrl, parseToolArgs } from './shared';

const conversation: ChatMessage[] = [
	{ role: 'user', content: [{ type: 'text', text: 'Add a title' }] },
	{
		role: 'assistant',
		content: [
			{ type: 'text', text: 'Adding it.' },
			{
				type: 'tool_call',
				id: 'call_1',
				name: 'add_block',
				args: { type: 'text' },
			},
			{
				type: 'tool_call',
				id: 'call_2',
				name: 'get_canvas_snapshot',
				args: {},
			},
		],
	},
	{
		role: 'user',
		content: [
			{
				type: 'tool_result',
				callId: 'call_1',
				name: 'add_block',
				content: [{ type: 'text', text: '{"id":"text-1"}' }],
			},
			{
				type: 'tool_result',
				callId: 'call_2',
				name: 'get_canvas_snapshot',
				content: [{ type: 'image', mimeType: 'image/png', data: 'AAAA' }],
				isError: false,
			},
		],
	},
];

const request: ChatRequest = {
	model: 'model-x',
	system: 'Be helpful.',
	messages: conversation,
	tools: [
		{
			name: 'add_block',
			description: 'Add a block.',
			inputSchema: { type: 'object', properties: {} },
		},
	],
};

const connection = { baseUrl: 'https://api.test/' };

/** Parse a stream fed in small chunks. */
const parse = (adapter: typeof anthropicAdapter, body: string, chunkSize = 5) =>
	collect(adapter.parseChatStream(chunksOf(...splitEvery(body, chunkSize))));

describe('shared helpers', () => {
	it('joins URLs and parses tool arguments', () => {
		expect(joinUrl('https://a.test/v1/', '/models')).toBe(
			'https://a.test/v1/models',
		);
		expect(parseToolArgs('')).toEqual({});
		expect(parseToolArgs('{"a":1}')).toEqual({ a: 1 });
		expect(parseToolArgs('{"a":')).toBe('{"a":');
	});

	it('has a preset for every provider kind with a base URL', () => {
		expect(PROVIDER_PRESETS.map((preset) => preset.kind)).toEqual([
			'anthropic',
			'openai',
			'gemini',
			'openrouter',
			'ollama',
			'lmstudio',
			'openai-compatible',
		]);
		PROVIDER_PRESETS.forEach((preset) =>
			expect(preset.defaultBaseUrl).toMatch(/^https?:\/\//),
		);
	});
});

describe('anthropic adapter', () => {
	it('builds a cached streaming request', () => {
		const http = anthropicAdapter.buildChatRequest(connection, request);
		const body = JSON.parse(http.body!);

		expect(http.url).toBe('https://api.test/v1/messages');
		expect(http.auth).toEqual({ header: 'x-api-key' });
		expect(http.headers).toMatchObject({
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true',
		});
		expect(body).toMatchObject({
			model: 'model-x',
			stream: true,
			system: [{ type: 'text', text: 'Be helpful.', cache_control: {} }],
			tools: [{ name: 'add_block', input_schema: {}, cache_control: {} }],
		});
	});

	it('converts messages, merging turns of the same role', () => {
		const messages = toAnthropicMessages([
			...conversation,
			{ role: 'user', content: [{ type: 'text', text: 'Thanks' }] },
		]);

		expect(messages.map((message) => message.role)).toEqual([
			'user',
			'assistant',
			'user',
		]);
		expect(messages[1].content[1]).toEqual({
			type: 'tool_use',
			id: 'call_1',
			name: 'add_block',
			input: { type: 'text' },
		});
		expect(messages[2].content).toEqual([
			{
				type: 'tool_result',
				tool_use_id: 'call_1',
				content: [{ type: 'text', text: '{"id":"text-1"}' }],
			},
			{
				type: 'tool_result',
				tool_use_id: 'call_2',
				content: [
					{
						type: 'image',
						source: { type: 'base64', media_type: 'image/png', data: 'AAAA' },
					},
				],
			},
			{ type: 'text', text: 'Thanks' },
		]);
	});

	it('keeps signed thinking and drops unsigned thinking', () => {
		const [message] = toAnthropicMessages([
			{
				role: 'assistant',
				content: [
					{
						type: 'reasoning',
						text: 'Hmm',
						providerMetadata: { signature: 'sig' },
					},
					{ type: 'reasoning', text: 'No signature' },
					{ type: 'text', text: 'Hi' },
				],
			},
		]);
		expect(message.content).toEqual([
			{ type: 'thinking', thinking: 'Hmm', signature: 'sig' },
			{ type: 'text', text: 'Hi' },
		]);
	});

	it('parses text and streamed tool input', async () => {
		const events = await parse(
			anthropicAdapter,
			sseBody(
				{ type: 'message_start', message: { usage: { input_tokens: 12 } } },
				{ type: 'ping' },
				{
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text', text: '' },
				},
				{
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'On ' },
				},
				{
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'it.' },
				},
				{ type: 'content_block_stop', index: 0 },
				{
					type: 'content_block_start',
					index: 1,
					content_block: {
						type: 'tool_use',
						id: 'toolu_1',
						name: 'add_block',
						input: {},
					},
				},
				{
					type: 'content_block_delta',
					index: 1,
					delta: { type: 'input_json_delta', partial_json: '{"type":' },
				},
				{
					type: 'content_block_delta',
					index: 1,
					delta: { type: 'input_json_delta', partial_json: '"code"}' },
				},
				{ type: 'content_block_stop', index: 1 },
				{
					type: 'message_delta',
					delta: { stop_reason: 'tool_use' },
					usage: { output_tokens: 30 },
				},
				{ type: 'message_stop' },
			),
		);

		expect(events.filter((event) => event.type === 'text-delta')).toHaveLength(
			2,
		);
		expect(events).toContainEqual({
			type: 'tool-call-start',
			id: 'toolu_1',
			name: 'add_block',
		});
		expect(doneEvent(events)).toEqual({
			type: 'done',
			finishReason: 'tool_calls',
			usage: { inputTokens: 12, outputTokens: 30 },
			message: {
				role: 'assistant',
				content: [
					{ type: 'text', text: 'On it.' },
					{
						type: 'tool_call',
						id: 'toolu_1',
						name: 'add_block',
						args: { type: 'code' },
					},
				],
			},
		});
	});

	it('throws on stream errors and reads error bodies', async () => {
		await expect(
			parse(
				anthropicAdapter,
				sseBody({
					type: 'error',
					error: { type: 'overloaded_error', message: 'Overloaded' },
				}),
			),
		).rejects.toMatchObject({ kind: 'overloaded', message: 'Overloaded' });

		expect(
			anthropicAdapter.parseError(
				'{"type":"error","error":{"type":"not_found_error","message":"model: x"}}',
			),
		).toBe('model: x');
		expect(
			anthropicAdapter.parseModels({
				data: [{ id: 'claude-sonnet-5', display_name: 'Claude Sonnet 5' }],
			}),
		).toEqual([{ id: 'claude-sonnet-5', label: 'Claude Sonnet 5' }]);
	});
});

describe('openai adapter', () => {
	it('builds a streaming request with function tools', () => {
		const http = openaiAdapter.buildChatRequest(
			{ baseUrl: 'https://openrouter.ai/api/v1', headers: { 'X-Title': 'K' } },
			request,
		);
		const body = JSON.parse(http.body!);

		expect(http.url).toBe('https://openrouter.ai/api/v1/chat/completions');
		expect(http.auth).toEqual({ header: 'authorization', scheme: 'Bearer' });
		expect(http.headers['X-Title']).toBe('K');
		expect(body.tools).toEqual([
			{
				type: 'function',
				function: {
					name: 'add_block',
					description: 'Add a block.',
					parameters: { type: 'object', properties: {} },
				},
			},
		]);
		expect(body.stream).toBe(true);
	});

	it('sends tool results as tool messages and their images after them', () => {
		expect(toOpenAIMessages('Be helpful.', conversation)).toEqual([
			{ role: 'system', content: 'Be helpful.' },
			{ role: 'user', content: 'Add a title' },
			{
				role: 'assistant',
				content: 'Adding it.',
				tool_calls: [
					{
						id: 'call_1',
						type: 'function',
						function: { name: 'add_block', arguments: '{"type":"text"}' },
					},
					{
						id: 'call_2',
						type: 'function',
						function: { name: 'get_canvas_snapshot', arguments: '{}' },
					},
				],
			},
			{ role: 'tool', tool_call_id: 'call_1', content: '{"id":"text-1"}' },
			{
				role: 'tool',
				tool_call_id: 'call_2',
				content: '[image attached below]',
			},
			{
				role: 'user',
				content: [
					{
						type: 'image_url',
						image_url: { url: 'data:image/png;base64,AAAA' },
					},
				],
			},
		]);
	});

	it('parses content, reasoning and tool call deltas', async () => {
		const events = await parse(
			openaiAdapter,
			sseBody(
				{
					choices: [
						{ delta: { role: 'assistant', reasoning_content: 'Think' } },
					],
				},
				{ choices: [{ delta: { content: 'Sure' } }] },
				{
					choices: [
						{
							delta: {
								tool_calls: [
									{
										index: 0,
										id: 'call_a',
										function: { name: 'add_block', arguments: '{"ty' },
									},
								],
							},
						},
					],
				},
				{
					choices: [
						{
							delta: {
								tool_calls: [
									{ index: 0, function: { arguments: 'pe":"qr"}' } },
								],
							},
						},
					],
				},
				// A server without call ids.
				{
					choices: [
						{
							delta: {
								tool_calls: [
									{
										index: 1,
										function: { name: 'get_workspace', arguments: '' },
									},
								],
							},
							finish_reason: 'stop',
						},
					],
				},
				{ choices: [], usage: { prompt_tokens: 5, completion_tokens: 7 } },
				'[DONE]',
			),
			3,
		);

		const done = doneEvent(events);
		expect(done.finishReason).toBe('tool_calls');
		expect(done.usage).toEqual({ inputTokens: 5, outputTokens: 7 });
		expect(done.message.content).toEqual([
			{ type: 'reasoning', text: 'Think' },
			{ type: 'text', text: 'Sure' },
			{
				type: 'tool_call',
				id: 'call_a',
				name: 'add_block',
				args: { type: 'qr' },
			},
			{
				type: 'tool_call',
				id: expect.stringMatching(/^call_/),
				name: 'get_workspace',
				args: {},
			},
		]);
	});

	it('reads errors in streams and bodies', async () => {
		await expect(
			parse(openaiAdapter, sseBody({ error: { message: 'Context too long' } })),
		).rejects.toThrow('Context too long');
		expect(openaiAdapter.parseError('{"error":{"message":"Bad key"}}')).toBe(
			'Bad key',
		);
		expect(openaiAdapter.parseError('{"error":"model not loaded"}')).toBe(
			'model not loaded',
		);
		expect(
			openaiAdapter.parseModels({ data: [{ id: 'b' }, { id: 'a' }, { x: 1 }] }),
		).toEqual([
			{ id: 'a', label: undefined },
			{ id: 'b', label: undefined },
		]);
	});
});

describe('gemini adapter', () => {
	it('builds a streaming request with JSON Schema declarations', () => {
		const http = geminiAdapter.buildChatRequest(connection, {
			...request,
			model: 'models/gemini-2.5-flash',
		});
		const body = JSON.parse(http.body!);

		expect(http.url).toBe(
			'https://api.test/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse',
		);
		expect(http.auth).toEqual({ header: 'x-goog-api-key' });
		expect(body.systemInstruction).toEqual({
			parts: [{ text: 'Be helpful.' }],
		});
		expect(body.tools[0].functionDeclarations[0]).toEqual({
			name: 'add_block',
			description: 'Add a block.',
			parametersJsonSchema: { type: 'object', properties: {} },
		});
	});

	it('converts messages with function responses and signatures', () => {
		const contents = toGeminiContents([
			conversation[0],
			{
				role: 'assistant',
				content: [
					{
						type: 'tool_call',
						id: 'g1',
						name: 'add_block',
						args: { type: 'text' },
						providerMetadata: { thoughtSignature: 'sig', nativeId: true },
					},
					{ type: 'tool_call', id: 'call_x', name: 'get_workspace', args: {} },
				],
			},
			{
				role: 'user',
				content: [
					{
						type: 'tool_result',
						callId: 'g1',
						name: 'add_block',
						content: [{ type: 'text', text: 'ok' }],
					},
					{
						type: 'tool_result',
						callId: 'call_x',
						name: 'get_workspace',
						content: [{ type: 'text', text: 'boom' }],
						isError: true,
					},
				],
			},
		]);

		expect(contents).toEqual([
			{ role: 'user', parts: [{ text: 'Add a title' }] },
			{
				role: 'model',
				parts: [
					{
						functionCall: {
							id: 'g1',
							name: 'add_block',
							args: { type: 'text' },
						},
						thoughtSignature: 'sig',
					},
					{ functionCall: { name: 'get_workspace', args: {} } },
				],
			},
			{
				role: 'user',
				parts: [
					{
						functionResponse: {
							id: 'g1',
							name: 'add_block',
							response: { output: 'ok' },
						},
					},
					{
						functionResponse: {
							name: 'get_workspace',
							response: { error: 'boom' },
						},
					},
				],
			},
		]);
	});

	it('parses text, thoughts and function calls', async () => {
		const events = await parse(
			geminiAdapter,
			sseBody(
				{
					candidates: [
						{
							content: {
								role: 'model',
								parts: [{ text: 'Plan', thought: true }],
							},
						},
					],
				},
				{ candidates: [{ content: { parts: [{ text: 'Adding ' }] } }] },
				{ candidates: [{ content: { parts: [{ text: 'it.' }] } }] },
				{
					candidates: [
						{
							content: {
								parts: [
									{
										functionCall: { name: 'add_block', args: { type: 'qr' } },
										thoughtSignature: 'sig-1',
									},
								],
							},
							finishReason: 'STOP',
						},
					],
					usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 4 },
				},
			),
			9,
		);

		const done = doneEvent(events);
		expect(done.finishReason).toBe('tool_calls');
		expect(done.usage).toEqual({ inputTokens: 3, outputTokens: 4 });
		expect(done.message.content).toEqual([
			{ type: 'reasoning', text: 'Plan' },
			{ type: 'text', text: 'Adding it.' },
			{
				type: 'tool_call',
				id: expect.stringMatching(/^call_/),
				name: 'add_block',
				args: { type: 'qr' },
				providerMetadata: { thoughtSignature: 'sig-1' },
			},
		]);
	});

	it('reads model lists and errors', () => {
		expect(
			geminiAdapter.parseModels({
				models: [
					{
						name: 'models/gemini-2.5-pro',
						displayName: 'Gemini 2.5 Pro',
						supportedGenerationMethods: ['generateContent'],
					},
					{
						name: 'models/embedding-001',
						supportedGenerationMethods: ['embedContent'],
					},
				],
			}),
		).toEqual([{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }]);
		expect(
			geminiAdapter.parseError(
				'[{"error":{"code":400,"message":"API key not valid"}}]',
			),
		).toBe('API key not valid');
	});
});
