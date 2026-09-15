import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { chunksOf, collect, sseBody } from '../test-utils';
import { defineTool, textResult } from '../tools/registry';
import {
	type AgentEvent,
	OMITTED_IMAGE,
	pruneToolImages,
	repairToolResults,
	runAgent,
} from './agent';
import { type ProviderProfile, listModels, streamChat } from './client';
import { ProviderError, networkError } from './errors';
import type { ChatMessage, HttpRequest, StreamEvent, Transport } from './types';

const profile: ProviderProfile = {
	id: 'p1',
	name: 'Test',
	kind: 'openai',
	baseUrl: 'https://api.test/v1',
	model: 'm',
	supportsImages: false,
};

const userMessage: ChatMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'Hi' }],
};

const tools = [
	defineTool({
		name: 'get_workspace',
		title: 'Read',
		description: 'Read the workspace.',
		input: z.object({}),
		mutates: false,
		execute: () => ({ blocks: [] }),
	}),
	defineTool({
		name: 'get_canvas_snapshot',
		title: 'Look',
		description: 'Render the canvas.',
		input: z.object({}),
		mutates: false,
		execute: () => 'image',
	}),
];

/** A fake `streamChat` that plays one scripted response per call. */
const scripted = (...responses: Array<StreamEvent[] | Error>) => {
	const requests: Array<{ messages: ChatMessage[]; tools: string[] }> = [];
	const stream = async function* (
		_profile: ProviderProfile,
		_transport: Transport,
		request: Parameters<typeof streamChat>[2],
	): AsyncGenerator<StreamEvent> {
		requests.push({
			messages: structuredClone(request.messages),
			tools: request.tools.map((tool) => tool.name),
		});
		const response = responses[requests.length - 1];
		if (response instanceof Error) throw response;
		for (const event of response) yield event;
	};
	return { stream: stream as typeof streamChat, requests };
};

const reply = (
	content: ChatMessage['content'],
	finishReason: 'stop' | 'tool_calls' = 'stop',
): StreamEvent[] => [
	...content.flatMap((part): StreamEvent[] =>
		part.type === 'text' ? [{ type: 'text-delta', text: part.text }] : [],
	),
	{
		type: 'done',
		message: { role: 'assistant', content },
		finishReason,
		usage: { inputTokens: 10, outputTokens: 2 },
	},
];

const noTransport: Transport = () => {
	throw new Error('not used');
};

const types = (events: AgentEvent[]) => events.map((event) => event.type);

describe('runAgent', () => {
	it('runs tools until the model answers', async () => {
		const { stream, requests } = scripted(
			reply(
				[{ type: 'tool_call', id: 'c1', name: 'get_workspace', args: {} }],
				'tool_calls',
			),
			reply([{ type: 'text', text: 'Empty canvas.' }]),
		);

		const events = await collect(
			runAgent({
				profile,
				transport: noTransport,
				system: 'sys',
				messages: [userMessage],
				tools,
				stream,
			}),
		);

		expect(types(events)).toEqual([
			'step-start',
			'message',
			'tool-start',
			'tool-result',
			'message',
			'step-start',
			'text-delta',
			'message',
			'finish',
		]);
		expect(events.at(-1)).toEqual({
			type: 'finish',
			reason: 'stop',
			usage: { inputTokens: 20, outputTokens: 4 },
		});

		// The second request carries the tool result.
		expect(requests[1].messages.at(-1)).toEqual({
			role: 'user',
			content: [
				{
					type: 'tool_result',
					callId: 'c1',
					name: 'get_workspace',
					content: [{ type: 'text', text: '{"blocks":[]}' }],
				},
			],
		});
		// Image tools are hidden from models without image input.
		expect(requests[0].tools).toEqual(['get_workspace']);
	});

	it('stops at the step limit', async () => {
		const call = reply(
			[{ type: 'tool_call', id: 'c', name: 'get_workspace', args: {} }],
			'tool_calls',
		);
		const { stream } = scripted(call, call, call);

		const events = await collect(
			runAgent({
				profile,
				transport: noTransport,
				system: 'sys',
				messages: [userMessage],
				tools,
				stream,
				maxSteps: 2,
			}),
		);
		expect(events.at(-1)).toMatchObject({
			type: 'finish',
			reason: 'max-steps',
		});
	});

	it('ends with an error event when the provider fails', async () => {
		const { stream } = scripted(new ProviderError('auth', 'Bad key'));

		const events = await collect(
			runAgent({
				profile,
				transport: noTransport,
				system: 'sys',
				messages: [userMessage],
				tools,
				stream,
			}),
		);
		expect(events.slice(-2)).toEqual([
			{ type: 'error', error: expect.objectContaining({ message: 'Bad key' }) },
			{ type: 'finish', reason: 'error', usage: {} },
		]);
	});

	it('keeps partial text and cancels pending tools when aborted', async () => {
		const controller = new AbortController();
		const runTool = vi.fn(async () => {
			controller.abort();
			return { result: textResult('ok'), historyEntry: null };
		});
		const { stream } = scripted(
			reply(
				[
					{ type: 'tool_call', id: 'a', name: 'get_workspace', args: {} },
					{ type: 'tool_call', id: 'b', name: 'get_workspace', args: {} },
				],
				'tool_calls',
			),
		);

		const events = await collect(
			runAgent({
				profile,
				transport: noTransport,
				system: 'sys',
				messages: [userMessage],
				tools,
				stream,
				runTool,
				signal: controller.signal,
			}),
		);

		expect(runTool).toHaveBeenCalledTimes(1);
		const results = events.filter((event) => event.type === 'message').at(-1);
		expect(results).toMatchObject({
			message: {
				content: [
					{ callId: 'a', content: [{ text: 'ok' }] },
					{ callId: 'b', isError: true },
				],
			},
		});
		expect(events.at(-1)).toMatchObject({ reason: 'aborted' });
	});

	it('reports an aborted stream with the text so far', async () => {
		const abort = new DOMException('Aborted', 'AbortError');
		const stream = async function* (): AsyncGenerator<StreamEvent> {
			yield { type: 'text-delta', text: 'Half' };
			throw abort;
		};

		const events = await collect(
			runAgent({
				profile,
				transport: noTransport,
				system: 'sys',
				messages: [userMessage],
				tools,
				stream: stream as typeof streamChat,
			}),
		);
		expect(events.slice(-2)).toEqual([
			{
				type: 'message',
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'Half' }],
				},
			},
			{ type: 'finish', reason: 'aborted', usage: {} },
		]);
	});
});

describe('pruneToolImages', () => {
	it('keeps only the latest tool result image', () => {
		const snapshot = (callId: string): ChatMessage => ({
			role: 'user',
			content: [
				{
					type: 'tool_result',
					callId,
					name: 'get_canvas_snapshot',
					content: [
						{ type: 'text', text: 'Canvas' },
						{ type: 'image', mimeType: 'image/png', data: callId },
					],
				},
			],
		});
		const attached: ChatMessage = {
			role: 'user',
			content: [{ type: 'image', mimeType: 'image/png', data: 'mine' }],
		};

		const pruned = pruneToolImages([
			attached,
			snapshot('old'),
			userMessage,
			snapshot('new'),
		]);

		expect(pruned[0]).toBe(attached);
		expect(pruned[1].content[0]).toMatchObject({
			content: [
				{ type: 'text', text: 'Canvas' },
				{ type: 'text', text: OMITTED_IMAGE },
			],
		});
		expect(pruned[3]).toEqual(snapshot('new'));
	});
});

describe('repairToolResults', () => {
	it('answers calls left without results', () => {
		const call = (id: string) =>
			({ type: 'tool_call', id, name: 'get_workspace', args: {} }) as const;

		const repaired = repairToolResults([
			userMessage,
			{ role: 'assistant', content: [call('a'), call('b')] },
			{
				role: 'user',
				content: [
					{
						type: 'tool_result',
						callId: 'a',
						name: 'get_workspace',
						content: [],
					},
					{ type: 'text', text: 'Next' },
				],
			},
			{ role: 'assistant', content: [call('c')] },
		]);

		expect(repaired).toHaveLength(5);
		expect(repaired[2].content.map((part) => part.type)).toEqual([
			'tool_result',
			'tool_result',
			'text',
		]);
		expect(repaired[2].content[0]).toMatchObject({
			callId: 'b',
			isError: true,
		});
		expect(repaired[4]).toMatchObject({
			role: 'user',
			content: [{ callId: 'c', isError: true }],
		});
	});
});

describe('provider client', () => {
	const respond =
		(status: number, body: string): Transport =>
		async () => ({
			status,
			ok: status < 400,
			chunks: chunksOf(body),
		});

	it('streams a chat through the transport with the profile model', async () => {
		let sent: HttpRequest | undefined;
		const transport: Transport = async (request, options) => {
			sent = request;
			expect(options.profileId).toBe('p1');
			return {
				status: 200,
				ok: true,
				chunks: chunksOf(
					sseBody(
						{ choices: [{ delta: { content: 'Yo' }, finish_reason: 'stop' }] },
						'[DONE]',
					),
				),
			};
		};

		const events = await collect(
			streamChat(profile, transport, {
				system: 's',
				messages: [userMessage],
				tools: [],
			}),
		);
		expect(JSON.parse(sent!.body!).model).toBe('m');
		expect(events[0]).toEqual({ type: 'text-delta', text: 'Yo' });
	});

	it('turns error responses into provider errors without secrets', async () => {
		await expect(
			collect(
				streamChat(
					profile,
					respond(
						401,
						'{"error":{"message":"Incorrect API key: sk-abcdefghijklmnopqrstu"}}',
					),
					{ system: 's', messages: [userMessage], tools: [] },
				),
			),
		).rejects.toMatchObject({
			kind: 'auth',
			status: 401,
			message: 'Incorrect API key: [redacted] (HTTP 401)',
		});
	});

	it('adds the preset hint to network errors', async () => {
		const failing: Transport = async () => {
			throw networkError();
		};

		await expect(
			listModels({ ...profile, kind: 'ollama' }, failing),
		).rejects.toThrow(/OLLAMA_ORIGINS/);
	});

	it('lists models', async () => {
		expect(
			await listModels(profile, respond(200, '{"data":[{"id":"m1"}]}')),
		).toEqual([{ id: 'm1', label: undefined }]);
	});
});
