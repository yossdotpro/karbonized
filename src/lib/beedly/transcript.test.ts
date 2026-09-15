import { describe, expect, it } from 'vitest';
import type { ChatMessage } from './core/types';
import { buildTranscript, summarizeArgs, titleFromPrompt } from './transcript';

const messages: ChatMessage[] = [
	{ role: 'user', content: [{ type: 'text', text: 'Make a card' }] },
	{
		role: 'assistant',
		content: [
			{ type: 'reasoning', text: 'Plan' },
			{ type: 'tool_call', id: 'a', name: 'add_block', args: { type: 'code' } },
			{
				type: 'tool_call',
				id: 'b',
				name: 'align_blocks',
				args: { ids: ['x'] },
			},
		],
	},
	{
		role: 'user',
		content: [
			{
				type: 'tool_result',
				callId: 'a',
				name: 'add_block',
				content: [{ type: 'text', text: '{}' }],
			},
			{
				type: 'tool_result',
				callId: 'b',
				name: 'align_blocks',
				content: [{ type: 'text', text: 'nope' }],
				isError: true,
			},
		],
	},
	{ role: 'assistant', content: [{ type: 'text', text: 'Done.' }] },
];

describe('buildTranscript', () => {
	it('groups every step of a response under its prompt', () => {
		const items = buildTranscript(messages, { a: { durationMs: 12 } });

		expect(items.map((item) => item.kind)).toEqual(['user', 'assistant']);
		expect(items[1]).toMatchObject({
			kind: 'assistant',
			parts: [
				{ type: 'reasoning', text: 'Plan' },
				{
					type: 'tool',
					call: { id: 'a', status: 'done', durationMs: 12 },
				},
				{ type: 'tool', call: { id: 'b', status: 'error' } },
				{ type: 'text', text: 'Done.' },
			],
		});
	});

	it('shows the step being streamed and the running tool', () => {
		const items = buildTranscript(
			[
				...messages,
				{ role: 'user', content: [{ type: 'text', text: 'Again' }] },
				{
					role: 'assistant',
					content: [
						{ type: 'tool_call', id: 'c', name: 'get_workspace', args: {} },
					],
				},
			],
			{},
			{
				runningToolId: 'c',
				draft: {
					text: 'Hi',
					reasoning: '',
					calls: [{ id: 'd', name: 'add_block', argsText: '{"ty' }],
				},
			},
		);

		expect(items.at(-1)).toMatchObject({
			kind: 'assistant',
			parts: [
				{ type: 'tool', call: { id: 'c', status: 'running' } },
				{ type: 'text', text: 'Hi' },
				{
					type: 'tool',
					call: { id: 'd', status: 'streaming', argsText: '{"ty' },
				},
			],
		});
	});
});

describe('transcript helpers', () => {
	it('titles conversations from the first line of the prompt', () => {
		expect(titleFromPrompt('  Make a   card\nwith more')).toBe('Make a card');
		expect(titleFromPrompt('x'.repeat(80))).toHaveLength(48);
		expect(titleFromPrompt('   ')).toBe('New chat');
	});

	it('summarizes tool arguments', () => {
		expect(summarizeArgs({ type: 'code', name: 'x' })).toBe('code');
		expect(summarizeArgs({ ids: ['a', 'b'], alignment: 'left' })).toBe(
			'2 blocks · left',
		);
		expect(summarizeArgs({ width: 1080, height: 1080 })).toBe('1080×1080');
		expect(summarizeArgs(undefined)).toBe('');
	});
});
