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
		const item: History = {
			id: state.controlState?.id as unknown as string,
			value: state.controlState?.value,
		};

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

		const item: History = {
			id: state.controlState?.id as unknown as string,
			value: state.controlState?.value,
		};

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
