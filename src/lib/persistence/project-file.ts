import CryptoJS from 'crypto-js';
import { PROJECT_KEY } from '@/utils/secrets';
import type { History, Item, Project, Workspace } from '@/types';

/**
 * The `.kproject` file: one workspace plus the properties of its blocks.
 *
 * Files are plain JSON. Older versions of Karbonized wrote the same object
 * AES-encrypted with a key shipped in the app, which protected nothing and
 * made the files unreadable by anything else; `parseProjectFile` still opens
 * those, so old projects keep working.
 */

export const PROJECT_EXTENSION = '.kproject';
const PROJECT_FORMAT = 'karbonized-project';
export const PROJECT_VERSION = 2;

export interface ProjectFile {
	format: typeof PROJECT_FORMAT;
	version: number;
	/** When the file was written, as a Unix timestamp. */
	savedAt: number;
	/** PNG data URL of the canvas, shown by file pickers and the app. */
	thumb?: string;
	workspace: Workspace;
	properties: History[];
}

export class ProjectFileError extends Error {}

/** Splits `text-1234-font-size` into the control id and the property name. */
export const splitPropertyId = (
	id: string,
): { controlId: string; property: string } | null => {
	const parts = id.split('-');
	if (parts.length < 3) return null;
	return {
		controlId: `${parts[0]}-${parts[1]}`,
		property: parts.slice(2).join('-'),
	};
};

/** A file name that is safe on every platform, always with the extension. */
export const projectFileName = (name?: string): string => {
	const clean = (name ?? '')
		.replace(/[\\/:*?"<>|]/g, '')
		.trim()
		.slice(0, 80);

	return `${clean === '' ? 'workspace' : clean}${PROJECT_EXTENSION}`;
};

/**
 * The workspace and the properties that belong to it, ready to be written.
 * Deleted blocks and orphan properties are left out.
 */
export const buildProjectFile = ({
	workspace,
	properties,
	thumb,
}: {
	workspace: Workspace;
	properties: History[];
	thumb?: string;
}): ProjectFile => {
	const controls = workspace.controls.filter((item) => !item.isDeleted);
	const ids = new Set(controls.map((item) => item.id));

	return {
		format: PROJECT_FORMAT,
		version: PROJECT_VERSION,
		savedAt: Date.now(),
		thumb,
		workspace: { ...workspace, controls },
		properties: properties.filter((item) => {
			const parsed = splitPropertyId(item.id);
			return parsed !== null && ids.has(parsed.controlId);
		}),
	};
};

export const serializeProject = (file: ProjectFile): string =>
	JSON.stringify(file);

const isProjectShape = (value: any): value is Project =>
	value !== null &&
	typeof value === 'object' &&
	Array.isArray(value.properties) &&
	value.workspace !== null &&
	typeof value.workspace === 'object' &&
	Array.isArray(value.workspace.controls);

/**
 * Reads a `.kproject` file: the current JSON format, the bare
 * `{ workspace, properties }` JSON the app also exported, or a legacy
 * AES-encrypted file. Throws `ProjectFileError` with a readable message.
 */
export const parseProjectFile = (text: string): Project => {
	const candidates: string[] = [text];

	try {
		const decrypted = CryptoJS.AES.decrypt(text, PROJECT_KEY).toString(
			CryptoJS.enc.Utf8,
		);
		if (decrypted !== '') candidates.push(decrypted);
	} catch {
		/* not an encrypted file */
	}

	for (const candidate of candidates) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(candidate);
		} catch {
			continue;
		}

		if (isProjectShape(parsed)) {
			return {
				thumb: (parsed as ProjectFile).thumb,
				workspace: parsed.workspace,
				properties: parsed.properties,
			};
		}

		throw new ProjectFileError('This file is not a Karbonized project');
	}

	throw new ProjectFileError('The project file is damaged or not readable');
};

/**
 * Gives the project fresh ids so it can be opened next to the workspaces that
 * are already there: the workspace, every block (including the ones with no
 * saved properties), their group links and their property entries.
 */
export const prepareProjectImport = (
	project: Project,
	taken: {
		controlIds?: Iterable<string>;
		workspaceIds?: Iterable<string>;
	} = {},
	nextId: () => string = () => String(Math.floor(Math.random() * 100000)),
): { workspace: Workspace; properties: History[] } => {
	const usedControls = new Set(taken.controlIds ?? []);
	const usedWorkspaces = new Set(taken.workspaceIds ?? []);

	const freshId = (type: string): string => {
		let id = `${type}-${nextId()}`;
		while (usedControls.has(id)) id = `${type}-${nextId()}`;
		usedControls.add(id);
		return id;
	};

	let workspaceId = nextId();
	while (usedWorkspaces.has(workspaceId)) workspaceId = nextId();
	const controls = project.workspace.controls.filter((item) => !item.isDeleted);
	const idMap = new Map<string, string>();

	controls.forEach((item) => {
		idMap.set(item.id, freshId(item.id.split('-')[0] || item.type || 'block'));
	});

	const newControls: Item[] = controls.map((item) => ({
		...item,
		id: idMap.get(item.id) as string,
		parentId:
			item.parentId != null
				? (idMap.get(item.parentId) ?? null)
				: item.parentId,
	}));

	const properties: History[] = [];
	project.properties.forEach((entry) => {
		const parsed = splitPropertyId(entry.id);
		if (parsed === null) return;

		const controlId = idMap.get(parsed.controlId);
		if (controlId === undefined) return;

		properties.push({
			id: `${controlId}-${parsed.property}`,
			value: entry.value,
			workspace: workspaceId,
		});
	});

	return {
		workspace: {
			...project.workspace,
			id: workspaceId,
			controls: newControls,
		},
		properties,
	};
};
