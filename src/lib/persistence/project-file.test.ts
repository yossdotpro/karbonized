import CryptoJS from 'crypto-js';
import { describe, expect, it } from 'vitest';
import { PROJECT_KEY } from '@/utils/secrets';
import type { History, Item, Project, Workspace } from '@/types';
import {
	ProjectFileError,
	buildProjectFile,
	parseProjectFile,
	prepareProjectImport,
	projectFileName,
	serializeProject,
	splitPropertyId,
} from './project-file';

const control = (id: string, extra: Partial<Item> = {}): Item => ({
	id,
	type: id.split('-')[0],
	name: id,
	isSelectable: true,
	isVisible: true,
	isDeleted: false,
	...extra,
});

const workspace = (controls: Item[]): Workspace =>
	({
		id: '1',
		controls,
		workspaceName: 'Demo',
		workspaceWidth: '1920',
		workspaceHeight: '1080',
	}) as Workspace;

const project = (): Project => ({
	workspace: workspace([
		control('group-1'),
		control('text-2', { parentId: 'group-1' }),
		// No saved properties: everything is still at its default.
		control('code-3'),
	]),
	properties: [
		{ id: 'text-2-text', value: 'hello', workspace: '1' },
		// Property names can contain dashes.
		{ id: 'text-2-font-size', value: 24, workspace: '1' },
		{ id: 'gone-9-text', value: 'orphan', workspace: '1' },
	] as History[],
});

describe('project file', () => {
	it('names the file safely and always with the extension', () => {
		expect(projectFileName('My poster')).toBe('My poster.kproject');
		expect(projectFileName('a/b:c')).toBe('abc.kproject');
		expect(projectFileName('   ')).toBe('workspace.kproject');
		expect(projectFileName(undefined)).toBe('workspace.kproject');
	});

	it('splits property ids, keeping dashed property names whole', () => {
		expect(splitPropertyId('text-2-font-size')).toEqual({
			controlId: 'text-2',
			property: 'font-size',
		});
		expect(splitPropertyId('text-2')).toBeNull();
	});

	it('writes the workspace without deleted blocks or orphan properties', () => {
		const source = project();
		source.workspace.controls.push(control('image-4', { isDeleted: true }));
		source.properties.push({
			id: 'image-4-src',
			value: 'x',
			workspace: '1',
		} as History);

		const file = buildProjectFile({
			workspace: source.workspace,
			properties: source.properties,
			thumb: 'data:image/png;base64,AAA',
		});

		expect(file.workspace.controls.map((item) => item.id)).toEqual([
			'group-1',
			'text-2',
			'code-3',
		]);
		expect(file.properties.map((item) => item.id)).toEqual([
			'text-2-text',
			'text-2-font-size',
		]);
		expect(file.thumb).toBe('data:image/png;base64,AAA');
	});

	it('reads back what it writes', () => {
		const source = project();
		const text = serializeProject(
			buildProjectFile({
				workspace: source.workspace,
				properties: source.properties,
			}),
		);

		const parsed = parseProjectFile(text);
		expect(parsed.workspace.workspaceName).toBe('Demo');
		expect(parsed.properties).toHaveLength(2);
	});

	it('still opens legacy encrypted and bare JSON files', () => {
		const source = project();
		const bare = JSON.stringify({
			workspace: source.workspace,
			properties: source.properties,
		});

		expect(parseProjectFile(bare).workspace.controls).toHaveLength(3);
		expect(
			parseProjectFile(CryptoJS.AES.encrypt(bare, PROJECT_KEY).toString())
				.workspace.controls,
		).toHaveLength(3);
	});

	it('explains what is wrong with a file it cannot use', () => {
		expect(() => parseProjectFile('not a project')).toThrow(ProjectFileError);
		expect(() => parseProjectFile('{"hello":true}')).toThrow(
			/not a Karbonized project/,
		);
	});

	it('gives an imported project fresh ids, keeping groups and defaults', () => {
		let n = 0;
		const { workspace: imported, properties } = prepareProjectImport(
			project(),
			{ controlIds: ['text-100'], workspaceIds: ['100'] },
			() => String(++n + 99),
		);

		// Blocks without properties survive the import.
		expect(imported.controls).toHaveLength(3);
		expect(imported.id).not.toBe('1');
		expect(imported.controls.every((item) => item.id.endsWith('-1'))).toBe(
			false,
		);

		// The group link follows the new ids.
		const group = imported.controls[0];
		const text = imported.controls[1];
		expect(text.parentId).toBe(group.id);

		// Properties follow their block and keep dashed names.
		expect(properties.map((item) => item.id)).toEqual([
			`${text.id}-text`,
			`${text.id}-font-size`,
		]);
		expect(properties.every((item) => item.workspace === imported.id)).toBe(
			true,
		);
		expect(properties[1].value).toBe(24);

		// It never reuses an id that is already on screen.
		expect(imported.controls.map((item) => item.id)).not.toContain('text-100');
	});
});
