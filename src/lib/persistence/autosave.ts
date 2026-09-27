import { useEffect, useState } from 'react';
import localforage from 'localforage';
import { create } from 'zustand';
import { useControlsStore, useHistoryStore, useWorkspaceStore } from '@/stores';
import type { History, Workspace } from '@/types';

/**
 * Session autosave.
 *
 * Workspaces, their control properties and the undo history are written to
 * IndexedDB (through localforage, so large data URLs fit) a moment after every
 * change, and are restored on startup.
 *
 * Restored properties are loaded as `initialProperties`, not straight into
 * `ControlProperties`: blocks consume initial properties when they mount (see
 * `useControlState`), while writing to `ControlProperties` directly would be
 * overwritten by each block's default state on its first render.
 */

const STORAGE_KEY = 'karbonized:session';
const SCHEMA_VERSION = 1;
const SAVE_DELAY_MS = 800;
/** Undo and redo steps kept across reloads (layer snapshots can be large). */
export const MAX_SAVED_HISTORY = 100;

interface SessionSnapshot {
	version: number;
	savedAt: number;
	workspaces: Workspace[];
	currentWorkspaceID: string;
	properties: History[];
	/** Added after v1 shipped, so it is optional. */
	history?: { past: History[]; future: History[] };
}

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutosaveState {
	status: AutosaveStatus;
	savedAt: number | null;
}

export const useAutosaveStatus = create<AutosaveState>(() => ({
	status: 'idle',
	savedAt: null,
}));

const storage = localforage.createInstance({
	name: 'karbonized',
	storeName: 'session',
});

/** Properties of the current session, including ones not yet consumed by a block. */
const collectProperties = (): History[] => {
	const { ControlProperties, initialProperties } = useControlsStore.getState();
	const byId = new Map<string, History>();

	// Pending initial properties belong to blocks that have not mounted yet
	// (e.g. controls in a workspace that is not open); keep them, but let the
	// live values win.
	initialProperties.forEach((item) => byId.set(item.id, item));
	ControlProperties.forEach((item) => byId.set(item.id, item));

	return Array.from(byId.values());
};

const buildSnapshot = (): SessionSnapshot => {
	const { workspaces, currentWorkspaceID } = useWorkspaceStore.getState();
	const liveIds = new Set(
		workspaces.flatMap((workspace) =>
			workspace.controls.map((control) => control.id),
		),
	);

	return {
		version: SCHEMA_VERSION,
		savedAt: Date.now(),
		workspaces,
		currentWorkspaceID,
		// Drop properties of controls that no longer exist in any workspace.
		properties: collectProperties().filter((item) =>
			liveIds.has(item.id.split('-').slice(0, 2).join('-')),
		),
		history: trimHistory(useHistoryStore.getState()),
	};
};

/** The most recent undo steps and the next redo steps, capped. */
export const trimHistory = ({
	pastHistory,
	futureHistory,
}: {
	pastHistory: History[];
	futureHistory: History[];
}): { past: History[]; future: History[] } => ({
	past: pastHistory.slice(-MAX_SAVED_HISTORY),
	future: futureHistory.slice(0, MAX_SAVED_HISTORY),
});

export const saveSession = async (): Promise<void> => {
	useAutosaveStatus.setState({ status: 'saving' });

	try {
		const snapshot = buildSnapshot();

		if (snapshot.workspaces.length === 0) {
			await storage.removeItem(STORAGE_KEY);
		} else {
			await storage.setItem(STORAGE_KEY, snapshot);
		}

		useAutosaveStatus.setState({ status: 'saved', savedAt: snapshot.savedAt });
	} catch (error) {
		console.error('Autosave failed:', error);
		useAutosaveStatus.setState({ status: 'error' });
	}
};

const restoreSession = async (): Promise<boolean> => {
	try {
		const snapshot = await storage.getItem<SessionSnapshot>(STORAGE_KEY);

		if (
			!snapshot ||
			snapshot.version !== SCHEMA_VERSION ||
			!Array.isArray(snapshot.workspaces) ||
			snapshot.workspaces.length === 0
		) {
			return false;
		}

		const currentWorkspace =
			snapshot.workspaces.find(
				(workspace) => workspace.id === snapshot.currentWorkspaceID,
			) ?? snapshot.workspaces[0];

		useWorkspaceStore.setState({
			workspaces: snapshot.workspaces,
			currentWorkspaceID: currentWorkspace.id,
			currentWorkspace,
		});

		useControlsStore.setState({
			initialProperties: snapshot.properties ?? [],
			ControlProperties: [],
			currentControlID: '',
		});

		useHistoryStore.setState({
			pastHistory: Array.isArray(snapshot.history?.past)
				? snapshot.history.past
				: [],
			futureHistory: Array.isArray(snapshot.history?.future)
				? snapshot.history.future
				: [],
			// Nothing to apply on mount: blocks restore from their properties.
			controlState: null,
		});

		useAutosaveStatus.setState({ status: 'saved', savedAt: snapshot.savedAt });
		return true;
	} catch (error) {
		console.error('Could not restore the previous session:', error);
		return false;
	}
};

/** Forget the stored session (the open workspaces are left untouched). */
export const clearSession = async (): Promise<void> => {
	await storage.removeItem(STORAGE_KEY);
	useAutosaveStatus.setState({ status: 'idle', savedAt: null });
};

/**
 * Restores the previous session once, then keeps it saved.
 * Returns `ready` (restore finished) and whether a session was restored.
 */
export const useSessionAutosave = (): { ready: boolean; restored: boolean } => {
	const [state, setState] = useState({ ready: false, restored: false });

	useEffect(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let unsubscribe: (() => void) | undefined;

		const scheduleSave = () => {
			clearTimeout(timer);
			timer = setTimeout(() => void saveSession(), SAVE_DELAY_MS);
		};

		const flush = () => {
			if (timer === undefined) return;
			clearTimeout(timer);
			timer = undefined;
			void saveSession();
		};

		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') flush();
		};

		void restoreSession().then((restored) => {
			if (cancelled) return;

			const unsubscribeWorkspaces = useWorkspaceStore.subscribe(
				(next, previous) => {
					if (
						next.workspaces !== previous.workspaces ||
						next.currentWorkspaceID !== previous.currentWorkspaceID
					) {
						scheduleSave();
					}
				},
			);
			const unsubscribeControls = useControlsStore.subscribe(
				(next, previous) => {
					if (next.ControlProperties !== previous.ControlProperties) {
						scheduleSave();
					}
				},
			);

			const unsubscribeHistory = useHistoryStore.subscribe((next, previous) => {
				if (
					next.pastHistory !== previous.pastHistory ||
					next.futureHistory !== previous.futureHistory
				) {
					scheduleSave();
				}
			});

			unsubscribe = () => {
				unsubscribeWorkspaces();
				unsubscribeControls();
				unsubscribeHistory();
			};

			window.addEventListener('pagehide', flush);
			document.addEventListener('visibilitychange', onVisibilityChange);

			setState({ ready: true, restored });
		});

		return () => {
			cancelled = true;
			clearTimeout(timer);
			unsubscribe?.();
			window.removeEventListener('pagehide', flush);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}, []);

	return state;
};
