import { create } from 'zustand';
import { getRandomNumber } from '../utils/getRandom';
import {
	createLayerSnapshot,
	cloneControls,
	getSubtreeIds,
	generateNewId,
	moveItemBlock,
	reorderAmongSiblings,
	moveToSiblingEdge,
} from '../lib/utils';
import { pickWorkspaceSettings, useWorkspaceStore } from './workspace-store';
import {
	WORKSPACE_SETTINGS_PREFIX,
	setHistoryValueResolver,
	useHistoryStore,
} from './history-store';
import type {
	Item,
	History,
	LayerMovePosition,
	LayerStepDirection,
	LayerEdgePosition,
	ControlSize,
	ControlPosition,
} from '../types';

interface ControlsState {
	currentControlID: string;
	/** Every selected control; `currentControlID` is the primary (last) one. */
	selectedControlIDs: string[];
	ControlProperties: History[];
	initialProperties: History[];
	controlSize?: ControlSize;
	controlPosition?: ControlPosition;
	controlTransform?: string;
	readyToSave: boolean;
}

interface ControlsActions {
	setCurrentControlID: (id: string) => void;
	/** Replace the selection; the last id becomes the primary control. */
	setSelection: (ids: string[]) => void;
	/** Add or remove a control from the selection (Shift+click). */
	toggleSelection: (id: string) => void;
	setControlProperties: (properties: History[]) => void;
	addControlProperty: (property: History, workspaceId: string) => void;
	addInitialProperty: (property: History, workspaceId: string) => void;
	removeInitialProperty: (id: string) => void;
	setControlSize: (size: ControlSize) => void;
	setControlPosition: (position: ControlPosition) => void;
	setControlTransform: (transform: string) => void;
	setReadyToSave: (ready: boolean) => void;
	getCurrentControlProperties: () => History[];
	getCurrentControl: (currentWorkspace: any) => Item | undefined;
	getControlsClass: (currentWorkspace: any) => string[];
	getVisibleControls: (currentWorkspace: any) => Item[];

	// Additional actions that were in the original store
	addControl: (control: Item, workspaceId: string) => void;

	// Actions that return data instead of directly mutating other stores
	toggleControlVisibility: (
		controlId: string,
		currentWorkspace: any,
	) => {
		nextControls: Item[];
		nextSelection: string;
	};
	toggleControlLock: (controlId: string, currentWorkspace: any) => Item[];
	renameControl: (
		payload: { id: string; name: string },
		currentWorkspace: any,
	) => Item[];
	deleteControl: (
		controlId: string,
		currentWorkspace: any,
	) => {
		nextControls: Item[];
		nextSelection: string;
	};
	duplicateControl: (
		controlId: string,
		currentWorkspace: any,
		workspaceId: string,
	) => {
		nextControls: Item[];
		newProperties: History[];
		nextSelection: string;
	};
	addGroup: (
		payload?: { name?: string; parentId?: string | null; childIds?: string[] },
		currentWorkspace?: any,
	) => {
		nextControls: Item[];
		nextSelection: string;
	};
	groupControl: (
		controlId: string,
		currentWorkspace: any,
	) => {
		nextControls: Item[];
		nextSelection: string;
	};
	ungroupControl: (
		groupId: string,
		currentWorkspace: any,
	) => {
		nextControls: Item[];
		nextSelection: string;
	};
	toggleGroupCollapsed: (controlId: string, currentWorkspace: any) => Item[];
	moveControlLayer: (
		payload: {
			draggedId: string;
			targetId: string;
			position: LayerMovePosition;
		},
		currentWorkspace: any,
	) => Item[];
	moveControlByStep: (
		payload: { id: string; direction: LayerStepDirection },
		currentWorkspace: any,
	) => Item[];
	moveControlToEdge: (
		payload: { id: string; position: LayerEdgePosition },
		currentWorkspace: any,
	) => Item[];
}

type ControlsStore = ControlsState & ControlsActions;

const mergeProperties = (
	currentProperties: History[],
	newProperties: History[],
): History[] => {
	const nextById = new Map(currentProperties.map((item) => [item.id, item]));
	newProperties.forEach((item) => {
		nextById.set(item.id, item);
	});

	return Array.from(nextById.values());
};

const commitControlsMutation = (
	getControlsState: () => ControlsStore,
	setControlsState: (partial: Partial<ControlsState>) => void,
	currentWorkspace: { id: string; controls: Item[] } | undefined,
	nextControls: Item[],
	nextSelection?: string,
) => {
	if (!currentWorkspace) return;

	useHistoryStore.getState().commitLayerMutation({
		nextControls,
		nextSelection,
		currentWorkspaceID: currentWorkspace.id,
		currentControlID: getControlsState().currentControlID,
		currentWorkspace,
		onWorkspaceUpdate: (controls) =>
			useWorkspaceStore.getState().setWorkspaceControls(controls),
		onControlUpdate: (id) =>
			setControlsState({
				currentControlID: id,
				controlPosition: undefined,
				controlSize: undefined,
				controlTransform: undefined,
			}),
		onReadyToSave: () => setControlsState({ readyToSave: true }),
		onEditingChange: () => {},
	});
};

export const useControlsStore = create<ControlsStore>((set, get) => ({
	currentControlID: '',
	selectedControlIDs: [],
	ControlProperties: [],
	initialProperties: [],
	readyToSave: false,

	getCurrentControlProperties: () =>
		get().ControlProperties.filter((item) =>
			item.id.includes(get().currentControlID),
		),

	getCurrentControl: (currentWorkspace: any) =>
		currentWorkspace?.controls.find(
			(item: Item) => item.id === get().currentControlID,
		),

	getControlsClass: (currentWorkspace: any) => {
		const controlsClass: string[] = [];

		currentWorkspace?.controls.forEach((item: Item) => {
			if (item.id !== get().currentControlID) {
				controlsClass.push('.block-' + item.id);
			}
		});

		return controlsClass;
	},

	getVisibleControls: (currentWorkspace: any) =>
		currentWorkspace?.controls?.filter((item: Item) => !item.isDeleted) ?? [],

	setCurrentControlID: (id) => {
		set({
			currentControlID: id,
			selectedControlIDs: id ? [id] : [],
			controlPosition: undefined,
			controlSize: undefined,
			controlTransform: undefined,
		});
	},

	setSelection: (ids) => {
		const unique = Array.from(new Set(ids.filter(Boolean)));
		const primary = unique[unique.length - 1] ?? '';

		set((state) => ({
			selectedControlIDs: unique,
			currentControlID: primary,
			...(primary !== state.currentControlID && {
				controlPosition: undefined,
				controlSize: undefined,
				controlTransform: undefined,
			}),
		}));
	},

	toggleSelection: (id) => {
		const { selectedControlIDs, setSelection } = get();
		setSelection(
			selectedControlIDs.includes(id)
				? selectedControlIDs.filter((item) => item !== id)
				: [...selectedControlIDs, id],
		);
	},

	setControlProperties: (properties) => {
		set({ ControlProperties: properties });
	},

	addControlProperty: (payload, workspaceId) => {
		const state = get();
		const element = state.ControlProperties.filter(
			(item) => item.id === payload.id,
		);

		if (element.length === 0) {
			set((state) => ({
				ControlProperties: [
					...state.ControlProperties,
					{
						...payload,
						workspace: workspaceId,
					},
				],
			}));
		} else {
			set((state) => ({
				ControlProperties: state.ControlProperties.map((item) =>
					item.id === payload.id
						? { id: payload.id, value: payload.value, workspace: workspaceId }
						: item,
				),
			}));
		}
	},

	addInitialProperty: (payload, workspaceId) => {
		set((state) => ({
			initialProperties: [
				...state.initialProperties,
				{
					...payload,
					workspace: workspaceId,
				},
			],
		}));
	},

	removeInitialProperty: (id) => {
		set((state) => ({
			initialProperties: state.initialProperties.filter(
				(item) => item.id !== id,
			),
		}));
	},

	setControlSize: (size) => {
		set({ controlSize: size });
	},

	setControlPosition: (position) => {
		set({ controlPosition: position });
	},

	setControlTransform: (transform) => {
		set({ controlTransform: transform });
	},

	setReadyToSave: (ready) => {
		set({ readyToSave: ready });
	},

	addControl: (control, workspaceId) => {
		const workspaceState = useWorkspaceStore.getState();
		const targetWorkspace =
			workspaceState.workspaces.find((item) => item.id === workspaceId) ??
			workspaceState.currentWorkspace;

		if (!targetWorkspace) return;

		const nextControls = [...targetWorkspace.controls, control];
		commitControlsMutation(get, set, targetWorkspace, nextControls, control.id);
	},

	toggleControlVisibility: (controlId, currentWorkspace) => {
		if (!currentWorkspace) return { nextControls: [], nextSelection: '' };

		const target = currentWorkspace.controls.find(
			(item: Item) => item.id === controlId,
		);
		if (!target) return { nextControls: [], nextSelection: '' };

		const subtreeIds = new Set(
			getSubtreeIds(currentWorkspace.controls, controlId),
		);
		const nextVisibility = !target.isVisible;
		const nextControls = currentWorkspace.controls.map((item: Item) =>
			subtreeIds.has(item.id) ? { ...item, isVisible: nextVisibility } : item,
		);
		const nextSelection =
			!nextVisibility && subtreeIds.has(get().currentControlID)
				? ''
				: get().currentControlID;

		commitControlsMutation(
			get,
			set,
			currentWorkspace,
			nextControls,
			nextSelection,
		);
		return { nextControls, nextSelection };
	},

	toggleControlLock: (controlId, currentWorkspace) => {
		if (!currentWorkspace) return [];

		const target = currentWorkspace.controls.find(
			(item: Item) => item.id === controlId,
		);
		if (!target) return [];

		const subtreeIds = new Set(
			getSubtreeIds(currentWorkspace.controls, controlId),
		);
		const nextLocked = !target.locked;
		const nextControls = currentWorkspace.controls.map((item: Item) =>
			subtreeIds.has(item.id) ? { ...item, locked: nextLocked } : item,
		);

		commitControlsMutation(get, set, currentWorkspace, nextControls);
		return nextControls;
	},

	renameControl: (payload, currentWorkspace) => {
		if (!currentWorkspace) return [];

		const nextName = payload.name.trim();
		if (nextName === '') return [];

		const nextControls = currentWorkspace.controls.map((item: Item) =>
			item.id === payload.id ? { ...item, name: nextName } : item,
		);

		commitControlsMutation(get, set, currentWorkspace, nextControls);
		return nextControls;
	},

	deleteControl: (controlId, currentWorkspace) => {
		if (!currentWorkspace) return { nextControls: [], nextSelection: '' };

		const subtreeIds = new Set(
			getSubtreeIds(currentWorkspace.controls, controlId),
		);
		const nextControls = currentWorkspace.controls.map((item: Item) =>
			subtreeIds.has(item.id)
				? { ...item, isDeleted: true, isVisible: false }
				: item,
		);
		const nextSelection = subtreeIds.has(get().currentControlID)
			? ''
			: get().currentControlID;

		commitControlsMutation(
			get,
			set,
			currentWorkspace,
			nextControls,
			nextSelection,
		);
		return { nextControls, nextSelection };
	},

	duplicateControl: (controlId, currentWorkspace, workspaceId) => {
		if (!currentWorkspace)
			return { nextControls: [], newProperties: [], nextSelection: '' };

		const subtreeIds = getSubtreeIds(currentWorkspace.controls, controlId);
		const subtreeItems = currentWorkspace.controls.filter((item: Item) =>
			subtreeIds.includes(item.id),
		);
		if (subtreeItems.length === 0)
			return { nextControls: [], newProperties: [], nextSelection: '' };

		const idMap = new Map<string, string>();
		subtreeItems.forEach((item: Item) => {
			idMap.set(item.id, generateNewId(item.type));
		});

		const duplicatedItems = subtreeItems.map((item: Item) => {
			const nextId = idMap.get(item.id) ?? item.id;
			const isRoot = item.id === controlId;
			const mappedParentId = item.parentId ? idMap.get(item.parentId) : null;

			return {
				...item,
				id: nextId,
				name: isRoot ? `${item.name} copy` : item.name,
				parentId: mappedParentId ?? item.parentId ?? null,
				collapsed: item.type === 'group' ? false : item.collapsed,
			};
		});

		const subtreeIdSet = new Set(subtreeIds);
		const targetIndex =
			currentWorkspace.controls.reduce(
				(acc: number, item: Item, index: number) =>
					subtreeIdSet.has(item.id) ? index : acc,
				-1,
			) + 1;

		const nextControls = [
			...currentWorkspace.controls.slice(0, targetIndex),
			...duplicatedItems,
			...currentWorkspace.controls.slice(targetIndex),
		];

		// Duplicate properties
		const state = get();
		const newProperties = state.ControlProperties.flatMap((property) => {
			const [type, originalId, propName] = property.id.split('-');
			const originalControlId = `${type}-${originalId}`;
			const nextControlId = idMap.get(originalControlId);

			if (nextControlId === undefined || propName === undefined) return [];

			return [
				{
					...property,
					id: `${nextControlId}-${propName}`,
					workspace: workspaceId,
				},
			];
		});

		const nextSelection = idMap.get(controlId) ?? state.currentControlID;
		const mergedProperties = mergeProperties(
			state.ControlProperties,
			newProperties,
		);

		commitControlsMutation(
			get,
			set,
			currentWorkspace,
			nextControls,
			nextSelection,
		);
		set({
			ControlProperties: mergedProperties,
			readyToSave: true,
		});

		return { nextControls, newProperties, nextSelection };
	},

	addGroup: (payload, currentWorkspace) => {
		if (!currentWorkspace) return { nextControls: [], nextSelection: '' };

		const children = payload?.childIds ?? [];
		const groupId = generateNewId('group');
		const firstChildId = children[0];
		const firstChildIndex = currentWorkspace.controls.findIndex(
			(item: Item) => item.id === firstChildId,
		);

		const group: Item = {
			id: groupId,
			type: 'group',
			name: payload?.name?.trim() || `Group ${getRandomNumber()}`,
			isSelectable: false,
			isVisible: true,
			isDeleted: false,
			locked: false,
			parentId: payload?.parentId ?? null,
			collapsed: false,
		};

		let nextControls = cloneControls(currentWorkspace.controls);

		if (children.length > 0) {
			nextControls = nextControls.map((item: Item) =>
				children.includes(item.id) ? { ...item, parentId: groupId } : item,
			);
		}

		if (firstChildIndex >= 0) {
			nextControls = [
				...nextControls.slice(0, firstChildIndex),
				group,
				...nextControls.slice(firstChildIndex),
			];
		} else {
			nextControls = [...nextControls, group];
		}

		commitControlsMutation(get, set, currentWorkspace, nextControls, groupId);
		return { nextControls, nextSelection: groupId };
	},

	groupControl: (controlId, currentWorkspace) => {
		if (!currentWorkspace) return { nextControls: [], nextSelection: '' };

		const target = currentWorkspace.controls.find(
			(item: Item) => item.id === controlId,
		);
		if (!target) return { nextControls: [], nextSelection: '' };

		const groupId = generateNewId('group');
		const targetIndex = currentWorkspace.controls.findIndex(
			(item: Item) => item.id === controlId,
		);

		const group: Item = {
			id: groupId,
			type: 'group',
			name: `${target.name} group`,
			isSelectable: false,
			isVisible: true,
			isDeleted: false,
			locked: false,
			parentId: target.parentId ?? null,
			collapsed: false,
		};

		const updatedControls = currentWorkspace.controls.map((item: Item) =>
			item.id === controlId ? { ...item, parentId: groupId } : item,
		);

		const nextControls = [
			...updatedControls.slice(0, targetIndex),
			group,
			...updatedControls.slice(targetIndex),
		];

		commitControlsMutation(get, set, currentWorkspace, nextControls, groupId);
		return { nextControls, nextSelection: groupId };
	},

	ungroupControl: (groupId, currentWorkspace) => {
		if (!currentWorkspace) return { nextControls: [], nextSelection: '' };

		const group = currentWorkspace.controls.find(
			(item: Item) => item.id === groupId,
		);
		if (!group || group.type !== 'group')
			return { nextControls: [], nextSelection: '' };

		const nextControls = currentWorkspace.controls
			.filter((item: Item) => item.id !== groupId)
			.map((item: Item) =>
				item.parentId === groupId
					? { ...item, parentId: group.parentId ?? null }
					: item,
			);

		const nextSelection =
			get().currentControlID === groupId ? '' : get().currentControlID;

		commitControlsMutation(
			get,
			set,
			currentWorkspace,
			nextControls,
			nextSelection,
		);
		return { nextControls, nextSelection };
	},

	toggleGroupCollapsed: (controlId, currentWorkspace) => {
		if (!currentWorkspace) return [];

		const nextControls = currentWorkspace.controls.map((item: Item) =>
			item.id === controlId && item.type === 'group'
				? { ...item, collapsed: !item.collapsed }
				: item,
		);

		commitControlsMutation(get, set, currentWorkspace, nextControls);
		return nextControls;
	},

	moveControlLayer: (payload, currentWorkspace) => {
		if (!currentWorkspace) return [];

		const nextControls = moveItemBlock(
			currentWorkspace.controls,
			payload.draggedId,
			payload.targetId,
			payload.position,
		);

		commitControlsMutation(get, set, currentWorkspace, nextControls);
		return nextControls;
	},

	moveControlByStep: (payload, currentWorkspace) => {
		if (!currentWorkspace) return [];

		const nextControls = reorderAmongSiblings(
			currentWorkspace.controls,
			payload.id,
			payload.direction,
		);

		commitControlsMutation(get, set, currentWorkspace, nextControls);
		return nextControls;
	},

	moveControlToEdge: (payload, currentWorkspace) => {
		if (!currentWorkspace) return [];

		const nextControls = moveToSiblingEdge(
			currentWorkspace.controls,
			payload.id,
			payload.position,
		);

		commitControlsMutation(get, set, currentWorkspace, nextControls);
		return nextControls;
	},
}));

// Some actions set `currentControlID` directly (layer mutations, session
// restore, project loading). Keep the multi-selection consistent with it.
useControlsStore.subscribe((state, previous) => {
	if (
		state.currentControlID !== previous.currentControlID &&
		!state.selectedControlIDs.includes(state.currentControlID)
	) {
		useControlsStore.setState({
			selectedControlIDs: state.currentControlID
				? [state.currentControlID]
				: [],
		});
	}
});

// Let undo/redo read what a history entry's target looks like right now.
setHistoryValueResolver((id) => {
	if (id.startsWith('workspace-structure-')) {
		const workspace = useWorkspaceStore.getState().currentWorkspace;
		if (!workspace) return { found: false, value: undefined };

		return {
			found: true,
			value: createLayerSnapshot(
				workspace.controls,
				useControlsStore.getState().currentControlID,
			),
		};
	}

	if (id.startsWith(WORKSPACE_SETTINGS_PREFIX)) {
		const workspace = useWorkspaceStore.getState().currentWorkspace;
		return workspace
			? { found: true, value: pickWorkspaceSettings(workspace) }
			: { found: false, value: undefined };
	}

	const { ControlProperties, initialProperties } = useControlsStore.getState();
	// Properties of a block that has not mounted yet are still pending.
	const property =
		ControlProperties.find((item) => item.id === id) ??
		initialProperties.find((item) => item.id === id);

	return property
		? { found: true, value: property.value }
		: { found: false, value: undefined };
});
