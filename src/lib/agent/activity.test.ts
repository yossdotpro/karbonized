import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
	ACTIVITY_LINGER_MS,
	beginToolActivity,
	isSourceActive,
	resetCanvasActivity,
	useCanvasActivity,
} from './activity';
import { defineTool, executeTool } from './tools/registry';

const active = (source: 'agent' | 'mcp') =>
	isSourceActive(useCanvasActivity.getState(), source);

describe('canvas activity', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		resetCanvasActivity();
	});

	afterEach(() => {
		resetCanvasActivity();
		vi.useRealTimers();
	});

	it('stays active for a moment after the last call', () => {
		const end = beginToolActivity('mcp', 'Add block');
		expect(active('mcp')).toBe(true);
		expect(active('agent')).toBe(false);
		expect(useCanvasActivity.getState().tool.mcp).toBe('Add block');

		end();
		expect(active('mcp')).toBe(true);

		vi.advanceTimersByTime(ACTIVITY_LINGER_MS);
		expect(active('mcp')).toBe(false);
		expect(useCanvasActivity.getState().tool.mcp).toBeNull();
	});

	it('does not blink between calls', () => {
		beginToolActivity('agent', 'Add block')();
		vi.advanceTimersByTime(ACTIVITY_LINGER_MS - 100);

		const end = beginToolActivity('agent', 'Update block');
		vi.advanceTimersByTime(ACTIVITY_LINGER_MS);
		expect(active('agent')).toBe(true);
		expect(useCanvasActivity.getState().tool.agent).toBe('Update block');

		end();
		end(); // ending twice counts once
		expect(useCanvasActivity.getState().running.agent).toBe(0);
	});

	it('is reported by every tool call, including failed ones', async () => {
		const seen: boolean[] = [];
		const tools = [
			defineTool({
				name: 'look',
				title: 'Look',
				description: 'Look.',
				input: z.object({}),
				mutates: false,
				execute: () => {
					seen.push(active('mcp'));
					throw new Error('Nothing to see');
				},
			}),
		];

		await executeTool(
			tools,
			'look',
			{},
			{
				source: 'mcp',
				supportsImages: false,
			},
		);

		expect(seen).toEqual([true]);
		expect(useCanvasActivity.getState().running.mcp).toBe(0);
		expect(useCanvasActivity.getState().tool.mcp).toBe('Look');
	});
});
