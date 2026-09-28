import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	CHANGES_BEFORE_LOOK,
	LOOK_REMINDER,
	type ToolContext,
	defineTool,
	executeTool,
} from './registry';

const change = defineTool({
	name: 'change',
	title: 'Change',
	description: 'A change.',
	input: z.object({}),
	mutates: true,
	execute: () => ({ changed: true }),
});

const look = defineTool({
	name: 'get_canvas_snapshot',
	title: 'Look',
	description: 'A look.',
	input: z.object({}),
	mutates: false,
	execute: () => 'Looked.',
});

const tools = [change, look];
const text = async (name: string, context: ToolContext) =>
	(await executeTool(tools, name, {}, context)).result.content
		.map((item) => (item.type === 'text' ? item.text : ''))
		.join('');

describe('look reminder', () => {
	it('asks to look at the canvas after several changes', async () => {
		const context: ToolContext = { source: 'agent', supportsImages: true };
		await text('get_canvas_snapshot', context);

		for (let index = 1; index < CHANGES_BEFORE_LOOK; index += 1) {
			expect(JSON.parse(await text('change', context))).toEqual({
				changed: true,
			});
		}
		expect(JSON.parse(await text('change', context))).toEqual({
			changed: true,
			reminder: LOOK_REMINDER,
		});

		// Looking resets the count.
		await text('get_canvas_snapshot', context);
		expect(JSON.parse(await text('change', context)).reminder).toBeUndefined();
	});

	it('stays quiet for callers that cannot see images', async () => {
		const context: ToolContext = { source: 'mcp', supportsImages: false };
		for (let index = 0; index < CHANGES_BEFORE_LOOK * 2; index += 1) {
			expect(await text('change', context)).not.toContain(LOOK_REMINDER);
		}
	});
});
