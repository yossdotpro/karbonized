import { useControlsStore, useHistoryStore, useWorkspaceStore } from '@/stores';
import {
	WORKSPACE_SETTINGS_PREFIX,
	WORKSPACE_STRUCTURE_PREFIX,
	isBatchHistory,
} from '@/stores/history-store';
import type { WorkspaceSettings } from '@/stores/workspace-store';
import type { History, LayerSnapshot } from '@/types';

/**
 * Undo and redo for the editor.
 *
 * Blocks pick up property values from `controlState` themselves (see
 * `useControlState`); everything else a history entry can target (layers,
 * canvas settings, the selected block's position and size in the shared
 * editor state) is applied here.
 */

const applyStructure = (snapshot: LayerSnapshot) => {
	useWorkspaceStore.getState().setWorkspaceControls(snapshot.controls);
	useControlsStore.getState().setCurrentControlID(snapshot.currentControlID);
};

const applyEntry = (entry: History) => {
	const controls = useControlsStore.getState();

	if (entry.id.startsWith(WORKSPACE_STRUCTURE_PREFIX)) {
		applyStructure(entry.value as LayerSnapshot);
		return;
	}

	if (entry.id.startsWith(WORKSPACE_SETTINGS_PREFIX)) {
		useWorkspaceStore
			.getState()
			.setWorkspaceSettings(entry.value as WorkspaceSettings);
		return;
	}

	// Moveable reads the selected block's box from the shared editor state.
	if (!entry.id.startsWith(`${controls.currentControlID}-`)) return;

	if (entry.id.endsWith('-pos')) controls.setControlPosition(entry.value);
	else if (entry.id.endsWith('-control_size')) {
		controls.setControlSize(entry.value);
	} else if (entry.id.endsWith('-transform')) {
		controls.setControlTransform(entry.value);
	}
};

/** Apply the entry undo or redo just moved into `controlState`. */
export const applyCurrentHistoryEntry = (): void => {
	const entry = useHistoryStore.getState().controlState;
	if (entry == null) return;

	if (!isBatchHistory(entry)) {
		applyEntry(entry);
		return;
	}

	// Layers first: the selection and positions below refer to them.
	const items = [...entry.value].sort(
		(a, b) =>
			Number(b.id.startsWith(WORKSPACE_STRUCTURE_PREFIX)) -
			Number(a.id.startsWith(WORKSPACE_STRUCTURE_PREFIX)),
	);
	items.forEach(applyEntry);
};

export const undo = (): boolean => {
	if (useHistoryStore.getState().undo() === undefined) return false;
	applyCurrentHistoryEntry();
	return true;
};

export const redo = (): boolean => {
	if (useHistoryStore.getState().redo() === undefined) return false;
	applyCurrentHistoryEntry();
	return true;
};
