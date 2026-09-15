import { create } from 'zustand';
import { getWorkspaceHistoryId, createLayerSnapshot } from '../lib/utils';
import type { History, LayerSnapshot } from '../types';

interface HistoryState {
	History: History[];
	historySignal: 'redo' | 'undo' | '';
	controlState: History | null;
	futureHistory: History[];
	pastHistory: History[];
}

/**
 * A batch history entry groups property changes of several controls (align,
 * distribute, multi-selection moves) so they undo and redo in one step.
 * Its value is the list of `{ id, value }` properties to apply.
 */
export const BATCH_HISTORY_PREFIX = 'batch:';

export const isBatchHistory = (
	entry: History | null | undefined,
): entry is History & { value: History[] } =>
	entry?.id.startsWith(BATCH_HISTORY_PREFIX) === true &&
	Array.isArray(entry.value);

/**
 * Reads the value an entry's target currently has (property value, or the
 * layer snapshot for workspace structure entries). Registered by the controls
 * store to avoid a circular import.
 */
type CurrentValueResolver = (id: string) => { found: boolean; value: unknown };

let resolveCurrentValue: CurrentValueResolver = () => ({
	found: false,
	value: undefined,
});

export const setHistoryValueResolver = (resolver: CurrentValueResolver) => {
	resolveCurrentValue = resolver;
};

/**
 * The state to store on the opposite stack when undoing or redoing `entry`:
 * what its target looks like right now. (Using the last `controlState` was
 * only right for the most recent step, so redo after several undos restored
 * the wrong values.)
 */
const captureCurrent = (entry: History, fallback: History | null): History => {
	if (isBatchHistory(entry)) {
		return {
			id: entry.id,
			value: entry.value.map((item: History) => {
				const current = resolveCurrentValue(item.id);
				return {
					id: item.id,
					value: current.found ? current.value : item.value,
				};
			}),
		};
	}

	const current = resolveCurrentValue(entry.id);
	if (current.found) return { id: entry.id, value: current.value };

	return fallback?.id === entry.id
		? fallback
		: { id: entry.id, value: entry.value };
};

type UndoRedoResult =
	| {
			type: 'workspace-update';
			snapshot: LayerSnapshot;
			historyId: string;
	  }
	| {
			type: 'control-update';
			historyId: string;
	  };

interface HistoryActions {
	addToHistory: (history: History) => void;
	setHistorySignal: (signal: 'redo' | 'undo' | '') => void;
	setControlState: (state: History | null) => void;
	redo: () => UndoRedoResult | undefined;
	undo: () => UndoRedoResult | undefined;
	setPast: (history: History[]) => void;
	setFuture: (history: History[]) => void;
	/** Record several property changes as one undoable step and apply them. */
	commitBatch: (
		changes: Array<{ id: string; previous: unknown; next: unknown }>,
	) => void;
	commitLayerMutation: (params: {
		nextControls: any[];
		nextSelection?: string;
		currentWorkspaceID: string;
		currentControlID: string;
		currentWorkspace: any;
		onWorkspaceUpdate: (controls: any[]) => void;
		onControlUpdate: (id: string) => void;
		onReadyToSave: () => void;
		onEditingChange: (editing: boolean) => void;
	}) => void;
}

type HistoryStore = HistoryState & HistoryActions;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
	History: [],
	historySignal: '',
	controlState: null,
	futureHistory: [],
	pastHistory: [],

	addToHistory: (payload) => {
		set((state) => ({
			History: [payload, ...state.History],
		}));
	},

	setHistorySignal: (payload) => {
		set({ historySignal: payload });
	},

	setControlState: (payload) => {
		set({ controlState: payload });
	},

	redo: () => {
		const state = get();
		if (state.futureHistory.length === 0) return;

		const next = state.futureHistory[0];
		const newFuture = state.futureHistory.slice(1);
		const item = captureCurrent(next, state.controlState);

		set({
			pastHistory: [...state.pastHistory, item],
			futureHistory: newFuture,
			controlState: next,
		});

		// Return the action to be performed by the caller
		return next.id.startsWith('workspace-structure-')
			? {
					type: 'workspace-update' as const,
					snapshot: next.value as LayerSnapshot,
					historyId: next.id,
				}
			: {
					type: 'control-update' as const,
					historyId: next.id,
				};
	},

	undo: () => {
		const state = get();
		if (state.pastHistory.length === 0) return;

		const previous = state.pastHistory[state.pastHistory.length - 1];
		const newPast = state.pastHistory.slice(0, state.pastHistory.length - 1);

		const item = captureCurrent(previous, state.controlState);

		set({
			pastHistory: newPast,
			futureHistory: [item, ...state.futureHistory],
			controlState: previous,
		});

		// Return the action to be performed by the caller
		return previous.id.startsWith('workspace-structure-')
			? {
					type: 'workspace-update' as const,
					snapshot: previous.value as LayerSnapshot,
					historyId: previous.id,
				}
			: {
					type: 'control-update' as const,
					historyId: previous.id,
				};
	},

	setPast: (payload) => {
		set({ pastHistory: payload });
	},

	setFuture: (payload) => {
		set({ futureHistory: payload });
	},

	commitBatch: (changes) => {
		if (changes.length === 0) return;

		const id = `${BATCH_HISTORY_PREFIX}${Date.now()}`;
		set((state) => ({
			pastHistory: [
				...state.pastHistory,
				{
					id,
					value: changes.map((change) => ({
						id: change.id,
						value: change.previous,
					})),
				},
			],
			futureHistory: [],
			controlState: {
				id,
				value: changes.map((change) => ({ id: change.id, value: change.next })),
			},
		}));
	},

	commitLayerMutation: (params) => {
		const {
			nextControls,
			nextSelection,
			currentWorkspaceID,
			currentControlID,
			currentWorkspace,
			onWorkspaceUpdate,
			onControlUpdate,
			onReadyToSave,
			onEditingChange,
		} = params;

		const historyId = getWorkspaceHistoryId(currentWorkspaceID);

		if (!currentWorkspace) return;

		const previous = createLayerSnapshot(
			currentWorkspace.controls,
			currentControlID,
		);
		const nextSnapshot: LayerSnapshot = {
			controls: nextControls,
			currentControlID: nextSelection || currentControlID,
		};

		set((state) => ({
			pastHistory: [...state.pastHistory, { id: historyId, value: previous }],
			futureHistory: [],
			controlState: { id: historyId, value: nextSnapshot },
		}));

		// Execute callbacks
		onWorkspaceUpdate(nextControls);
		onControlUpdate(nextSelection || currentControlID);
		onReadyToSave();
	},
}));
