import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useControlsStore, useHistoryStore, useWorkspaceStore } from '@/stores';
import { useKComponentStore } from '@/stores/kcomponent-store';
import { stringifyKComponent } from '@/utils/kcomponentParser';
import type { KComponent } from '@/models/KComponent';
import {
	type ToolContext,
	editorTools,
	executeTool,
	toToolResult,
} from './index';

const context: ToolContext = { source: 'mcp', supportsImages: false };

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

const component = (name: string, extra = {}): KComponent => ({
	manifest: { name, author: 'Karbonized', width: 320, height: 180, ...extra },
	html: '<div class="card">Hi</div>',
	css: ':root {\n  --accent: #3987e5;\n}',
	js: '// @action:Wave\nlog("hi");',
});

const library = () => useKComponentStore.getState();

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
	library().clearImportedComponents();
});

afterEach(() => {
	vi.useRealTimers();
	library().clearImportedComponents();
});

describe('component tools', () => {
	it('imports a .kcomponent and lists it', async () => {
		const imported = await run('import_component', {
			yaml: stringifyKComponent(component('Pricing card')),
		});
		expect(imported.result.isError).toBeUndefined();

		const listed = await run('list_components', {});
		const payload = JSON.parse(text(listed));

		expect(payload.total).toBe(1);
		expect(payload.components[0]).toMatchObject({
			name: 'Pricing card',
			author: 'Karbonized',
			// The block needs allow-scripts before the action can run.
			hasActions: true,
			usageCount: 0,
		});
	});

	it('reports what is wrong with a bad file', async () => {
		const broken = await run('import_component', { yaml: 'manifest: {}' });

		expect(broken.result.isError).toBe(true);
		expect(text(broken)).toContain('manifest.name');
	});

	it('refuses a duplicate unless asked to replace it', async () => {
		const yaml = stringifyKComponent(component('Card'));
		await run('import_component', { yaml });

		const again = await run('import_component', { yaml });
		expect(again.result.isError).toBe(true);
		expect(text(again)).toContain('replace: true');

		const replaced = await run('import_component', { yaml, replace: true });
		expect(replaced.result.isError).toBeUndefined();
		expect(library().importedComponents).toHaveLength(1);
	});

	it('searches by name, tag and category', async () => {
		await run('import_component', {
			yaml: stringifyKComponent(
				component('Terminal', { category: 'Dev', tags: ['shell'] }),
			),
		});
		await run('import_component', {
			yaml: stringifyKComponent(component('Quote', { category: 'Social' })),
		});

		const byTag = JSON.parse(
			text(await run('list_components', { query: 'shell' })),
		);
		expect(byTag.components).toHaveLength(1);
		expect(byTag.components[0].name).toBe('Terminal');

		const byCategory = JSON.parse(
			text(await run('list_components', { category: 'Social' })),
		);
		expect(byCategory.components).toHaveLength(1);
		expect(byCategory.components[0].name).toBe('Quote');
	});

	it('adds a component to the canvas at its manifest size', async () => {
		await run('import_component', {
			yaml: stringifyKComponent(component('Card')),
		});
		const [entry] = library().importedComponents;

		const added = await run('add_component', { id: entry.id });
		expect(added.result.isError).toBeUndefined();

		const blocks = useWorkspaceStore.getState().currentWorkspace!.controls;
		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('html');
		expect(blocks[0].name).toBe('Card');

		const size = useControlsStore
			.getState()
			.initialProperties.find((item) =>
				item.id.endsWith('-control_size'),
			)?.value;
		expect(size).toEqual({ w: 320, h: 180 });

		// Using a component counts, so the gallery can sort by most used.
		expect(library().getImportedComponent(entry.id)?.usageCount).toBe(1);
	});

	it('gives an empty section real content, not the demo block', async () => {
		await run('import_component', {
			yaml: stringifyKComponent({
				manifest: { name: 'Markup only' },
				html: '<p>hi</p>',
				css: '',
				js: '',
			}),
		});
		const [entry] = library().importedComponents;
		await run('add_component', { id: entry.id });

		const properties = useControlsStore.getState().initialProperties;
		const css = properties.find((item) => item.id.endsWith('-css'))?.value;
		const js = properties.find((item) => item.id.endsWith('-js'))?.value;

		// `useControlState` ignores a falsy initial value and would fall back to
		// the demo content of a blank HTML block.
		expect(css).toBeTruthy();
		expect(js).toBeTruthy();
		expect(css).not.toContain('--text-size');
	});

	it('reports an unknown component id', async () => {
		const missing = await run('add_component', { id: 'nope' });

		expect(missing.result.isError).toBe(true);
		expect(text(missing)).toContain('list_components');
	});

	it('exports a library component as a .kcomponent', async () => {
		await run('import_component', {
			yaml: stringifyKComponent(component('Card')),
		});
		const [entry] = library().importedComponents;

		const exported = text(
			await run('export_component', { componentId: entry.id }),
		);

		expect(exported).toContain('name: Card');
		expect(exported).toContain('html:');
	});

	it('wants exactly one of componentId or blockId', async () => {
		const neither = await run('export_component', {});
		expect(neither.result.isError).toBe(true);
		expect(text(neither)).toContain('either componentId or blockId');
	});

	it('loads the starter pack once', async () => {
		const first = JSON.parse(text(await run('load_starter_pack', {})));
		expect(first.added.length).toBeGreaterThan(0);
		expect(first.alreadyInLibrary).toBe(0);

		const second = JSON.parse(text(await run('load_starter_pack', {})));
		expect(second.added).toHaveLength(0);
		expect(second.alreadyInLibrary).toBe(first.added.length);
	});

	it('is listed to models and MCP clients', () => {
		const names = editorTools.map((tool) => tool.name);

		expect(names).toEqual(
			expect.arrayContaining([
				'list_components',
				'import_component',
				'add_component',
				'export_component',
				'load_starter_pack',
			]),
		);
		expect(toToolResult('ok').content[0]).toEqual({ type: 'text', text: 'ok' });
	});
});
