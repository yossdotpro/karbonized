import { useControlsStore, useWorkspaceStore } from '@/stores';
import { renderImage, useExportSettings } from '@/lib/export/exporter';
import { getRandomNumber } from '@/utils/getRandom';
import type { History } from '@/types';
import { getFilesBridge } from './desktop-files';
import {
	PROJECT_EXTENSION,
	ProjectFileError,
	buildProjectFile,
	parseProjectFile,
	prepareProjectImport,
	projectFileName,
	serializeProject,
} from './project-file';

/**
 * Saving and opening `.kproject` files. The file format itself (and what it
 * can read) lives in `project-file.ts`; this module is the part that talks to
 * the stores and to the browser.
 */

/** Every property of the session, including blocks that have not mounted yet. */
export const currentProjectProperties = (): History[] => {
	const { ControlProperties, initialProperties } = useControlsStore.getState();
	const byId = new Map<string, History>();

	initialProperties.forEach((item) => byId.set(item.id, item));
	ControlProperties.forEach((item) => byId.set(item.id, item));

	return Array.from(byId.values());
};

/** A small PNG of the canvas, stored in the file so pickers can show it. */
const renderThumbnail = async (): Promise<string | undefined> => {
	const element = document.getElementById('workspace');
	if (element === null) return undefined;

	try {
		return await renderImage(element, {
			...useExportSettings.getState(),
			format: 'png',
			scale: 0.5,
			transparent: false,
		});
	} catch (error) {
		// A thumbnail is a nicety; never lose the project over it.
		console.error('Could not render the project thumbnail:', error);
		return undefined;
	}
};

const downloadText = (text: string, fileName: string): void => {
	const url = URL.createObjectURL(
		new Blob([text], { type: 'application/json;charset=utf-8' }),
	);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	link.click();
	// Give the download a moment to start before the blob goes away.
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/**
 * Writes the open workspace as a `.kproject` file: a "Save as" dialog on the
 * desktop, a download on the web. Returns the name it was saved under, or
 * `null` if the desktop dialog was cancelled.
 */
export const saveCurrentProject = async (): Promise<string | null> => {
	const workspace = useWorkspaceStore.getState().currentWorkspace;
	if (workspace === undefined) {
		throw new ProjectFileError('There is no workspace to save');
	}

	const file = buildProjectFile({
		workspace,
		properties: currentProjectProperties(),
		thumb: await renderThumbnail(),
	});

	const fileName = projectFileName(workspace.workspaceName);
	const text = serializeProject(file);
	const desktop = getFilesBridge();

	if (desktop !== undefined) {
		const path = await desktop.saveText({
			defaultName: fileName,
			text,
			extensions: [PROJECT_EXTENSION.replace('.', '')],
			filterName: 'Karbonized project',
		});
		// The dialog gives a full path; show just the file name.
		return path === null ? null : (path.split(/[\\/]/).pop() ?? fileName);
	}

	downloadText(text, fileName);
	return fileName;
};

/**
 * Opens the contents of a `.kproject` file as a new workspace next to the
 * ones already open, and makes it the current one. Throws `ProjectFileError`
 * when the file cannot be used.
 */
export const openProjectFromText = (text: string): { name: string } => {
	const project = parseProjectFile(text);
	const { workspaces } = useWorkspaceStore.getState();

	const { workspace, properties } = prepareProjectImport(
		project,
		{
			controlIds: workspaces.flatMap((item) =>
				item.controls.map((control) => control.id),
			),
			workspaceIds: workspaces.map((item) => item.id),
		},
		() => String(getRandomNumber()),
	);

	useWorkspaceStore.setState((state) => ({
		workspaces: [...state.workspaces, workspace],
		currentWorkspaceID: workspace.id,
		currentWorkspace: workspace,
	}));

	// Blocks read their saved values from `initialProperties` when they mount;
	// writing to `ControlProperties` here would be overwritten by their own
	// defaults on the first render.
	useControlsStore.setState((state) => ({
		initialProperties: [
			...state.initialProperties.filter(
				(item) => !properties.some((entry) => entry.id === item.id),
			),
			...properties,
		],
		currentControlID: '',
		selectedControlIDs: [],
	}));

	return { name: workspace.workspaceName };
};

/** Reads a file the user picked and opens it. */
export const openProjectFile = async (file: File): Promise<{ name: string }> =>
	openProjectFromText(await file.text());
