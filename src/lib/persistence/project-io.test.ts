import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useControlsStore, useWorkspaceStore } from '@/stores';
import type { History, Item, Workspace } from '@/types';
import { openProjectFromText, saveCurrentProject } from './project-io';

const control = (id: string, extra: Partial<Item> = {}): Item => ({
	id,
	type: id.split('-')[0],
	name: id,
	isSelectable: true,
	isVisible: true,
	isDeleted: false,
	...extra,
});

const workspace = (): Workspace =>
	({
		id: '7',
		controls: [
			control('group-1'),
			control('text-2', { parentId: 'group-1' }),
			control('code-3'),
		],
		workspaceName: 'Poster',
		workspaceWidth: '1920',
		workspaceHeight: '1080',
	}) as Workspace;

/** The file the app would have downloaded. */
const captureSavedFile = async (): Promise<string> => {
	let blob: Blob | undefined;
	const createObjectURL = vi
		.spyOn(URL, 'createObjectURL')
		.mockImplementation((value) => {
			blob = value as Blob;
			return 'blob:test';
		});
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
	const click = vi
		.spyOn(HTMLAnchorElement.prototype, 'click')
		.mockImplementation(() => {});

	await saveCurrentProject();

	createObjectURL.mockRestore();
	click.mockRestore();
	if (blob === undefined) throw new Error('nothing was saved');

	// jsdom's Blob has no `text()`.
	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsText(blob as Blob);
	});
};

describe('saving and opening a project', () => {
	beforeEach(() => {
		const current = workspace();
		useWorkspaceStore.setState({
			workspaces: [current],
			currentWorkspaceID: current.id,
			currentWorkspace: current,
		});
		useControlsStore.setState({
			ControlProperties: [
				{ id: 'text-2-text', value: 'hello', workspace: '7' },
			] as History[],
			// A block that has not mounted yet still has its saved values here.
			initialProperties: [
				{ id: 'code-3-code', value: 'const a = 1', workspace: '7' },
			] as History[],
			currentControlID: '',
			selectedControlIDs: [],
		});
	});

	it('writes a file that opens as a second, independent workspace', async () => {
		const text = await captureSavedFile();
		const { name } = openProjectFromText(text);

		expect(name).toBe('Poster');

		const { workspaces, currentWorkspace } = useWorkspaceStore.getState();
		expect(workspaces).toHaveLength(2);
		expect(currentWorkspace?.id).not.toBe('7');
		expect(currentWorkspace?.controls).toHaveLength(3);

		// Nothing is shared with the workspace that was already open.
		const originalIds = workspaces[0].controls.map((item) => item.id);
		currentWorkspace?.controls.forEach((item) => {
			expect(originalIds).not.toContain(item.id);
		});

		// Values of mounted and unmounted blocks both survive, as initial
		// properties, which is what blocks read when they mount.
		const imported = currentWorkspace as Workspace;
		const text2 = imported.controls[1];
		const code3 = imported.controls[2];
		const props = useControlsStore.getState().initialProperties;

		expect(props).toContainEqual({
			id: `${text2.id}-text`,
			value: 'hello',
			workspace: imported.id,
		});
		expect(props).toContainEqual({
			id: `${code3.id}-code`,
			value: 'const a = 1',
			workspace: imported.id,
		});

		// Groups still point at the right block.
		expect(text2.parentId).toBe(imported.controls[0].id);
	});

	it('refuses a file that is not a project', () => {
		expect(() => openProjectFromText('nope')).toThrow();
		expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
	});
});
