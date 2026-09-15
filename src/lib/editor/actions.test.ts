import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useControlsStore, useHistoryStore, useWorkspaceStore } from '@/stores';
import {
	EditorActionError,
	addBlock,
	createWorkspace,
	deleteBlocks,
	estimateTextSize,
	getHtmlBlockCode,
	getWorkspaceSummary,
	parseRotation,
	setCanvasSettings,
	setHtmlBlockCode,
	updateBlock,
	withRotation,
} from './actions';
import { redo, undo } from './history';

const workspace = () => useWorkspaceStore.getState().currentWorkspace!;
const pending = (id: string) =>
	useControlsStore.getState().initialProperties.find((item) => item.id === id)
		?.value;
const stored = (id: string) =>
	useControlsStore.getState().ControlProperties.find((item) => item.id === id)
		?.value;

/** Pretend a block is rendered, as the canvas would do. */
const mount = (id: string) => {
	const element = document.createElement('div');
	element.id = id;
	document.body.appendChild(element);
};

beforeEach(() => {
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
	document.body.innerHTML = '';
});

describe('editor actions', () => {
	it('adds a block centered on the canvas, selected, in one step', () => {
		const block = addBlock({
			type: 'text',
			properties: { text: 'Hello', color: '#ff0000' },
		});

		expect(workspace().controls).toHaveLength(1);
		expect(useControlsStore.getState().currentControlID).toBe(block.id);
		expect(pending(`${block.id}-text`)).toBe('Hello');
		// Sized to fit "Hello" at 24px, centered.
		expect(pending(`${block.id}-control_size`)).toEqual({ w: 82, h: 36 });
		expect(pending(`${block.id}-pos`)).toEqual({ x: 599, y: 342 });
		expect(useHistoryStore.getState().pastHistory).toHaveLength(1);

		undo();
		expect(workspace().controls).toHaveLength(0);
		redo();
		expect(workspace().controls.map((item) => item.id)).toEqual([block.id]);
	});

	it('clamps the size to the block limits', () => {
		const block = addBlock({ type: 'code', width: 100, height: 99999 });
		expect(pending(`${block.id}-control_size`)).toEqual({ w: 415, h: 2050 });
	});

	it('rejects unknown block types and blocks', () => {
		expect(() => addBlock({ type: 'nope' })).toThrow(EditorActionError);
		expect(() => updateBlock('text-1', { name: 'x' })).toThrow(
			/does not exist/,
		);
	});

	it('updates a rendered block as one undoable step', () => {
		const block = addBlock({ type: 'shape' });
		mount(block.id);

		useHistoryStore.getState().transaction(() =>
			updateBlock(block.id, {
				name: 'Circle',
				properties: { color: '#00ff00', opacity: 50 },
			}),
		);

		expect(stored(`${block.id}-color`)).toBe('#00ff00');
		expect(workspace().controls[0].name).toBe('Circle');
		expect(useHistoryStore.getState().pastHistory).toHaveLength(2);

		undo();
		expect(workspace().controls[0].name).toBe('shape 1');
		const state = useHistoryStore.getState().controlState!;
		expect(state.value).toEqual(
			expect.arrayContaining([
				{ id: `${block.id}-color`, value: '#f3f4f6' },
				{ id: `${block.id}-opacity`, value: 100 },
			]),
		);
	});

	it('updates properties of a block that has not rendered yet', () => {
		const block = addBlock({ type: 'text' });
		updateBlock(block.id, { x: 10, rotation: 45, properties: { text: 'Hi' } });

		expect(pending(`${block.id}-text`)).toBe('Hi');
		expect(pending(`${block.id}-pos`)).toEqual({ x: 10, y: 342 });
		expect(pending(`${block.id}-transform`)).toBe('rotate(45deg)');
		expect(
			useControlsStore
				.getState()
				.initialProperties.filter((item) => item.id === `${block.id}-pos`),
		).toHaveLength(1);
	});

	it('summarizes the workspace with non-default properties', () => {
		const block = addBlock({
			type: 'text',
			x: 5,
			y: 6,
			rotation: 30,
			properties: { text: 'Hello', color: '#f3f4f6' },
		});

		const summary = getWorkspaceSummary();
		expect(summary).toMatchObject({ id: 'w1', width: 1280, height: 720 });
		expect(summary.blocks).toEqual([
			expect.objectContaining({
				id: block.id,
				type: 'text',
				x: 5,
				y: 6,
				width: 82,
				height: 36,
				rotation: 30,
				properties: { text: 'Hello', sizing: 'auto' },
			}),
		]);
	});

	it('deletes blocks in one step inside a transaction', () => {
		const a = addBlock({ type: 'text' });
		const b = addBlock({ type: 'text' });

		useHistoryStore.getState().transaction(() => deleteBlocks([a.id, b.id]));
		expect(getWorkspaceSummary().blocks).toHaveLength(0);

		undo();
		expect(getWorkspaceSummary().blocks).toHaveLength(2);
	});

	it('changes canvas settings and undoes them', () => {
		setCanvasSettings({ workspaceColor: '#123456', workspaceWidth: '800' });
		expect(workspace()).toMatchObject({
			workspaceColor: '#123456',
			workspaceWidth: '800',
		});

		undo();
		expect(workspace()).toMatchObject({
			workspaceColor: '#ffffff',
			workspaceWidth: '1280',
		});

		redo();
		expect(workspace().workspaceColor).toBe('#123456');
	});

	it('reads and writes the code of HTML blocks', () => {
		const block = addBlock({ type: 'html' });
		expect(getHtmlBlockCode(block.id).html).toContain('<');

		setHtmlBlockCode(block.id, { css: '.a { color: red; }' });
		expect(getHtmlBlockCode(block.id).css).toBe('.a { color: red; }');

		const text = addBlock({ type: 'text' });
		expect(() => getHtmlBlockCode(text.id)).toThrow(/not an HTML block/);
	});

	it('creates a workspace, makes it current and opens the editor', () => {
		const created = createWorkspace({
			name: 'Post',
			width: 1080,
			height: 1350,
		});

		expect(workspace()).toMatchObject({
			id: created.id,
			workspaceName: 'Post',
			workspaceWidth: '1080',
			workspaceHeight: '1350',
		});
		expect(useWorkspaceStore.getState().workspaces).toHaveLength(2);
		expect(window.location.pathname).toBe('/editor');
	});

	it('sizes new text blocks to their text and fixes what a size sets', () => {
		const block = addBlock({
			type: 'text',
			properties: { text: 'Two\nlines', textSize: '40', isBold: true },
		});
		// Estimated box, used to center the block before it renders.
		expect(pending(`${block.id}-control_size`)).toEqual({ w: 152, h: 120 });
		expect(pending(`${block.id}-sizing`)).toBe('auto');

		updateBlock(block.id, { width: 300 });
		expect(pending(`${block.id}-sizing`)).toBe('fixed-width');

		updateBlock(block.id, { height: 80 });
		expect(pending(`${block.id}-sizing`)).toBe('fixed');

		// An explicit mode wins over the size.
		updateBlock(block.id, { width: 200, properties: { sizing: 'auto' } });
		expect(pending(`${block.id}-sizing`)).toBe('auto');

		expect(pending(`${addBlock({ type: 'text', width: 240 }).id}-sizing`)).toBe(
			'fixed-width',
		);

		expect(estimateTextSize('abc', Number.NaN, false)).toEqual({
			width: 54,
			height: 36,
		});
	});

	it('parses and sets the rotation of a transform', () => {
		expect(parseRotation('translate(4px, 2px) rotate(-12.5deg)')).toBe(-12.5);
		expect(parseRotation('')).toBe(0);
		expect(withRotation('translate(4px, 2px) rotate(10deg)', 90)).toBe(
			'translate(4px, 2px) rotate(90deg)',
		);
		expect(withRotation('', 15)).toBe('rotate(15deg)');
	});
});
