import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useControlsStore, useHistoryStore, useWorkspaceStore } from '@/stores';
import { commandRegistry } from '@/lib/commands/registry';
import { undo } from '@/lib/editor/history';
import { compactValue } from './blocks';
import { isAllowedCommand } from './commands';
import { snapshotScale, splitDataUrl } from './export';
import {
	type ToolContext,
	defineTool,
	describeTool,
	editorTools,
	executeTool,
	toToolResult,
} from './index';

const context: ToolContext = { source: 'beedly', supportsImages: true };

const run = async (name: string, args: unknown) => {
	const pending = executeTool(editorTools, name, args, context);
	// Let `waitForBlock` time out: blocks never render in these tests.
	await vi.advanceTimersByTimeAsync(5000);
	return pending;
};

const text = (execution: Awaited<ReturnType<typeof run>>) =>
	execution.result.content
		.map((item) => (item.type === 'text' ? item.text : ''))
		.join('');

const workspace = () => useWorkspaceStore.getState().currentWorkspace!;

beforeEach(() => {
	vi.useFakeTimers();
	useWorkspaceStore.setState({
		workspaces: [],
		currentWorkspaceID: '',
		currentWorkspace: undefined,
	});
	useWorkspaceStore.getState().addWorkspace('w1', 'Test');
	useWorkspaceStore.getState().setCurrentWorkspace('w1');
	useControlsStore.setState({
		currentControlID: '',
		selectedControlIDs: [],
		ControlProperties: [],
		initialProperties: [],
	});
	useHistoryStore.setState({
		pastHistory: [],
		futureHistory: [],
		controlState: null,
	});
});

afterEach(() => {
	vi.useRealTimers();
});

describe('tool definitions', () => {
	it('have unique, provider-safe names and object schemas', () => {
		const names = editorTools.map((tool) => tool.name);
		expect(new Set(names).size).toBe(names.length);

		editorTools.map(describeTool).forEach((tool) => {
			expect(tool.name).toMatch(/^[a-z][a-z_]{2,63}$/);
			expect(tool.description.length).toBeGreaterThan(10);
			expect(tool.inputSchema.type).toBe('object');
			expect(tool.inputSchema).not.toHaveProperty('$schema');
		});
	});

	it('describe arguments in JSON Schema', () => {
		const addBlock = describeTool(
			editorTools.find((tool) => tool.name === 'add_block')!,
		);
		expect(addBlock.inputSchema).toMatchObject({
			type: 'object',
			required: ['type'],
			properties: {
				type: {
					type: 'string',
					enum: expect.arrayContaining(['code', 'text']),
				},
				x: { type: 'number' },
			},
		});
	});

	it('turns outputs into results', () => {
		expect(toToolResult(undefined)).toEqual({
			content: [{ type: 'text', text: 'Done.' }],
		});
		expect(toToolResult({ a: 1 })).toEqual({
			content: [{ type: 'text', text: '{"a":1}' }],
		});
	});
});

describe('executeTool', () => {
	it('reports unknown tools and invalid arguments', async () => {
		expect((await run('nope', {})).result).toMatchObject({ isError: true });

		const invalid = await run('add_block', { type: 'dragon' });
		expect(invalid.result.isError).toBe(true);
		expect(text(invalid)).toContain('Invalid arguments for add_block');
	});

	it('catches errors thrown by tools', async () => {
		const failing = defineTool({
			name: 'boom',
			title: 'Boom',
			description: 'Always fails.',
			input: z.object({}),
			mutates: false,
			execute: () => {
				throw new Error('Kaboom');
			},
		});

		const execution = await executeTool([failing], 'boom', {}, context);
		expect(execution.result).toEqual({
			content: [{ type: 'text', text: 'Kaboom' }],
			isError: true,
		});
	});

	it('folds steps recorded while a tool settles into its undo step', async () => {
		const tool = defineTool({
			name: 'two_steps',
			title: 'Two steps',
			description: 'Changes something, then a block reacts.',
			input: z.object({}),
			mutates: true,
			execute: () =>
				useHistoryStore
					.getState()
					.commitBatch([{ id: 'a-pos', previous: 1, next: 2 }]),
			settle: async () => {
				await Promise.resolve();
				useHistoryStore
					.getState()
					.commitBatch([{ id: 'a-color', previous: 'red', next: 'blue' }]);
			},
		});

		const pending = executeTool([tool], 'two_steps', {}, context);
		await vi.advanceTimersByTimeAsync(1000);
		const execution = await pending;
		expect(useHistoryStore.getState().pastHistory).toEqual([
			execution.historyEntry,
		]);
		expect(execution.historyEntry?.value).toEqual([
			{ id: 'a-pos', value: 1 },
			{ id: 'a-color', value: 'red' },
		]);
	});

	it('adds a block as one undo step and returns it', async () => {
		const execution = await run('add_block', {
			type: 'text',
			x: 10,
			y: 20,
			properties: { text: 'Hello', color: '#ff0000', blur: 999 },
		});

		expect(execution.result.isError).toBeUndefined();
		const block = JSON.parse(text(execution));
		expect(block).toMatchObject({
			type: 'text',
			x: 10,
			y: 20,
			properties: { text: 'Hello', color: '#ff0000', blur: 50 },
		});
		expect(execution.historyEntry).not.toBeNull();

		undo();
		expect(workspace().controls).toHaveLength(0);
	});

	it('rejects unknown and invalid block properties', async () => {
		const unknown = await run('add_block', {
			type: 'text',
			properties: { font: 'Inter' },
		});
		expect(text(unknown)).toMatch(
			/Unknown property "font".*Valid: text, color/s,
		);

		const invalid = await run('add_block', {
			type: 'shape',
			properties: { color: 'blue' },
		});
		expect(text(invalid)).toContain('hex color');
		expect(workspace().controls).toHaveLength(0);
	});

	it('normalizes code languages and rejects unknown ones', async () => {
		const added = JSON.parse(
			text(
				await run('add_block', {
					type: 'code',
					properties: { lang: 'TS', theme: 'atomDark' },
				}),
			),
		);
		expect(added.properties).toMatchObject({
			lang: 'typescript',
			theme: 'atomDark',
		});

		expect(
			text(
				await run('update_block', {
					id: added.id,
					properties: { lang: 'klingon', theme: 'neon' },
				}),
			),
		).toMatch(/Unknown language "klingon"[\s\S]*Unknown theme "neon"/);
	});

	it('updates several things of a block in one undo step', async () => {
		const added = JSON.parse(text(await run('add_block', { type: 'shape' })));
		const before = useHistoryStore.getState().pastHistory.length;

		const execution = await run('update_block', {
			id: added.id,
			name: 'Dot',
			locked: true,
			width: 60,
		});

		expect(JSON.parse(text(execution))).toMatchObject({
			name: 'Dot',
			locked: true,
			width: 60,
		});
		expect(useHistoryStore.getState().pastHistory).toHaveLength(before + 1);
	});

	it('sets canvas backgrounds', async () => {
		await run('set_canvas_background', {
			type: 'gradient',
			gradient: { color1: '#000000', color2: '#ffffff', angle: 45 },
			blur: 4,
		});
		expect(workspace()).toMatchObject({
			workspaceType: 'color',
			workspaceColorMode: 'Gradient',
			workspaceGradientSettings: {
				color1: '#000000',
				color2: '#ffffff',
				deg: 45,
			},
			workspaceBlur: 4,
		});

		const missing = await run('set_canvas_background', { type: 'texture' });
		expect(text(missing)).toBe('Give `texture`.');

		undo();
		expect(workspace().workspaceColorMode).toBe('Single');
	});

	it('reads the workspace with long values shortened', async () => {
		const image = `data:image/png;base64,${'A'.repeat(4096)}`;
		await run('add_block', { type: 'image', properties: { src: image } });

		const summary = JSON.parse(text(await run('get_workspace', {})));
		expect(summary.blocks[0].properties.src).toBe('[data URL, 4 KB]');
	});

	it('only runs allowed commands that exist', async () => {
		const ran = vi.fn();
		const unregister = commandRegistry.register(() => [
			{ id: 'view.zoom-in', title: 'Zoom in', group: 'View', run: ran },
			{ id: 'file.open', title: 'Open', group: 'File', run: ran },
		]);

		expect(text(await run('run_command', { id: 'view.zoom-in' }))).toBe(
			'Ran view.zoom-in.',
		);
		expect((await run('run_command', { id: 'file.open' })).result.isError).toBe(
			true,
		);
		expect(
			(await run('run_command', { id: 'view.missing' })).result.isError,
		).toBe(true);
		expect(ran).toHaveBeenCalledTimes(1);

		const listed = JSON.parse(text(await run('list_commands', {})));
		expect(listed.commands).toEqual([
			{ id: 'view.zoom-in', title: 'Zoom in', shortcut: undefined },
		]);
		unregister();
	});
});

describe('tool helpers', () => {
	it('shortens long values', () => {
		expect(compactValue('short')).toBe('short');
		expect(compactValue(42)).toBe(42);
		expect(compactValue('x'.repeat(400))).toMatch(/… \[400 characters\]$/);
	});

	it('allows only editing commands', () => {
		expect(isAllowedCommand('edit.undo')).toBe(true);
		expect(isAllowedCommand('workspace.clean')).toBe(false);
		expect(isAllowedCommand('view.toggle-beedly')).toBe(false);
	});

	it('splits data URLs and scales snapshots', () => {
		expect(splitDataUrl('data:image/png;base64,AAAA')).toEqual({
			mimeType: 'image/png',
			data: 'AAAA',
		});
		expect(splitDataUrl('data:image/svg+xml;charset=utf-8,%3Csvg%3E')).toEqual({
			mimeType: 'image/svg+xml',
			data: btoa('<svg>'),
		});
		expect(snapshotScale(1280, 720)).toBe(0.8);
		expect(snapshotScale(500, 300)).toBe(1);
	});
});
