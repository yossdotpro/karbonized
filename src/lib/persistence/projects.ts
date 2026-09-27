import { useControlsStore, useWorkspaceStore } from '@/stores';
import type { History, Project, Workspace } from '@/types';
import { getRandomNumber } from '@/utils/getRandom';
import { currentProjectProperties } from './project-io';

/** `<type>-<random>-<property>` → `<type>-<random>` */
const controlIdOf = (propertyId: string) =>
	propertyId.split('-').slice(0, 2).join('-');

/**
 * Snapshot of one workspace and the properties of its blocks. Pass the
 * workspace itself when it is no longer open (e.g. its tab was just closed).
 */
export const buildProject = (
	workspaceId: string,
	closedWorkspace?: Workspace,
): Project | null => {
	const workspace =
		closedWorkspace ??
		useWorkspaceStore
			.getState()
			.workspaces.find((item) => item.id === workspaceId);

	if (!workspace) return null;

	const controls = workspace.controls.filter((item) => !item.isDeleted);
	const ids = new Set(controls.map((control) => control.id));

	return {
		workspace: { ...workspace, controls },
		properties: currentProjectProperties().filter((item) =>
			ids.has(controlIdOf(item.id)),
		),
	};
};

/**
 * Reopens a recent project keeping its ids, or switches to it when it is
 * already open in a tab. Its values go through `initialProperties`, like the
 * ones of an opened file (see `openProjectFromText`).
 */
export const reopenProject = (project: Project): void => {
	const { workspaces, setCurrentWorkspace } = useWorkspaceStore.getState();

	if (workspaces.some((item) => item.id === project.workspace.id)) {
		setCurrentWorkspace(project.workspace.id);
		return;
	}

	const workspace = project.workspace;
	const properties: History[] = project.properties.map((item) => ({
		...item,
		workspace: workspace.id,
	}));
	const incoming = new Set(properties.map((item) => item.id));

	useWorkspaceStore.setState((state) => ({
		workspaces: [...state.workspaces, workspace],
		currentWorkspaceID: workspace.id,
		currentWorkspace: workspace,
	}));

	useControlsStore.setState((state) => ({
		initialProperties: [
			...state.initialProperties.filter((item) => !incoming.has(item.id)),
			...properties,
		],
		currentControlID: '',
		selectedControlIDs: [],
	}));
};

/** Creates an empty workspace of the given size and makes it current. */
export const createProject = (
	name: string,
	width: number,
	height: number,
): string => {
	const { addWorkspace, setCurrentWorkspace, setWorkspaceSize } =
		useWorkspaceStore.getState();
	const id = getRandomNumber().toString();

	addWorkspace(id, name);
	setCurrentWorkspace(id);
	// Update the workspace in the list too, so the size survives switching
	// workspaces and session restores.
	setWorkspaceSize({ width: width.toString(), height: height.toString() });

	return id;
};

/** `Untitled`, `Untitled 2`, … avoiding names already open in a tab. */
export const nextUntitledName = (base = 'Untitled'): string => {
	const taken = new Set(
		useWorkspaceStore.getState().workspaces.map((item) => item.workspaceName),
	);
	if (!taken.has(base)) return base;
	let index = 2;
	while (taken.has(`${base} ${index}`)) index += 1;
	return `${base} ${index}`;
};
