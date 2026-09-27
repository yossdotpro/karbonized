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

/** Layer structure entries: the value is a `LayerSnapshot`. */
export const WORKSPACE_STRUCTURE_PREFIX = 'workspace-structure-';

/** Canvas settings entries (background, size): the value is `WorkspaceSettings`. */
export const WORKSPACE_SETTINGS_PREFIX = 'workspace-settings-';

export const getWorkspaceSettingsHistoryId = (workspaceId: string): string =>
	`${WORKSPACE_SETTINGS_PREFIX}${workspaceId}`;

/**
 * Flatten history entries (batches included) into the value of one batch.
 * Entries hold the state *before* each change, so the earliest value of every
 * target wins: undoing the batch restores what was there before all of them.
 */
export const mergeHistoryEntries = (entries: History[]): History[] => {
	const merged = new Map<string, History>();

	entries
		.flatMap((entry) => (isBatchHistory(entry) ? entry.value : [entry]))
		.forEach((item) => {
			if (!merged.has(item.id)) {
				merged.set(item.id, { id: item.id, value: item.value });
			}
		});

	return Array.from(merged.values());
};

const createBatchId = () => `${BATCH_HISTORY_PREFIX}${Date.now()}`;

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
	/** Record a canvas settings change (background, size) as one step. */
	commitWorkspaceSettings: (
		workspaceId: string,
		previous: unknown,
		next: unknown,
	) => void;
	/**
	 * Run `fn` and fold every history step it records into a single step.
	 * Returns the resulting entry (null when nothing was recorded).
	 */
	transaction: <T>(fn: () => T) => { result: T; entry: History | null };
	/**
	 * Fold the most recent steps that belong to `entries` into one step. Stops
	 * at the first step that is not in the set (e.g. an edit made by the user
	 * in between), so unrelated changes are never merged.
	 */
	collapseTrailing: (entries: ReadonlySet<History>) => History | null;
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

		const id = createBatchId();
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

	commitWorkspaceSettings: (workspaceId, previous, next) => {
		const id = getWorkspaceSettingsHistoryId(workspaceId);
		set((state) => ({
			pastHistory: [...state.pastHistory, { id, value: previous }],
			futureHistory: [],
			controlState: { id, value: next },
		}));
	},

	transaction: (fn) => {
		const startLength = get().pastHistory.length;
		const result = fn();
		const past = get().pastHistory;

		// Nothing recorded, or the history was rewound meanwhile.
		if (past.length <= startLength) return { result, entry: null };

		const added = past.slice(startLength);
		if (added.length === 1) return { result, entry: added[0] };

		const entry: History = {
			id: createBatchId(),
			value: mergeHistoryEntries(added),
		};

		set({
			pastHistory: [...past.slice(0, startLength), entry],
			// Blocks apply the batch in `controlState`: make it describe the
			// final value of everything the transaction touched, so a stale
			// intermediate state is never re-applied.
			controlState: captureCurrent(entry, get().controlState),
		});

		return { result, entry };
	},

	collapseTrailing: (entries) => {
		const past = get().pastHistory;
		let start = past.length;
		while (start > 0 && entries.has(past[start - 1])) start -= 1;

		const trailing = past.slice(start);
		if (trailing.length === 0) return null;
		if (trailing.length === 1) return trailing[0];

		const entry: History = {
			id: createBatchId(),
			value: mergeHistoryEntries(trailing),
		};
		set({ pastHistory: [...past.slice(0, start), entry] });
		return entry;
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
