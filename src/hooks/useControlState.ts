import { useCallback, useEffect, useRef, useState } from 'react';
import {
	useControlsStore,
	useHistoryStore,
	useWorkspaceStore,
} from '../stores';
import default_logo from '../assets/logo.svg';
import { isBatchHistory } from '../stores/history-store';

export function useControlState<T>(
	initialState: T,
	id: string,
	manual: boolean = false,
): [T, (newState: T) => void] {
	const controlState = useHistoryStore((state) => state.controlState);
	/* Only this property, not the whole list: a block re-renders when one of
	   its own values changes, not when any block on the canvas moves. The
	   entries are replaced when they change, so their identity is the check. */
	const storedProperty = useControlsStore(
		useCallback(
			(state) => state.ControlProperties.find((item) => item.id === id),
			[id],
		),
	);
	const initialProperty = useControlsStore(
		useCallback(
			(state) => state.initialProperties.find((item) => item.id === id),
			[id],
		),
	);
	const removeInitialProperty = useControlsStore(
		(state) => state.removeInitialProperty,
	);
	const pastHistory = useHistoryStore((state) => state.pastHistory);
	const setControlState = useHistoryStore((state) => state.setControlState);
	const addControlProperty = useControlsStore(
		(state) => state.addControlProperty,
	);
	const setPastHistory = useHistoryStore((state) => state.setPast);
	const setFutureHistory = useHistoryStore((state) => state.setFuture);

	const serialize = (value: unknown): string => {
		if (typeof value === 'string') return value;
		return JSON.stringify(value);
	};

	const [state, setState] = useState(initialState);

	/* Set Initial Properties */
	useEffect(() => {
		const prop = initialProperty?.value ?? null;
		if (prop) {
			const nextValue =
				id.endsWith('-src') &&
				(prop === '/src/assets/logo.svg' ||
					prop === '/src/assets/karbonized.svg')
					? (default_logo as T)
					: (prop as T);

			if (serialize(nextValue) === serialize(state)) {
				removeInitialProperty(id);
				return;
			}

			if (
				id.endsWith('-src') &&
				(prop === '/src/assets/logo.svg' ||
					prop === '/src/assets/karbonized.svg')
			) {
				// eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the controls store
				setState(default_logo as T);
			} else {
				setState(prop);
			}

			removeInitialProperty(id);
		}
	}, [id, initialProperty, removeInitialProperty, state]);

	/* Apply undo/redo and batch changes that target this property. Each entry
	   is applied once: re-applying it when the local value changes later would
	   revert newer edits (e.g. a size the block measured after a resize). */
	const appliedControlState = useRef<typeof controlState | undefined>(
		undefined,
	);
	useEffect(() => {
		if (appliedControlState.current === controlState) return;
		appliedControlState.current = controlState;

		const entry = isBatchHistory(controlState)
			? controlState.value.find((item: { id: string }) => item.id === id)
			: controlState?.id === id
				? controlState
				: undefined;

		if (entry && serialize(entry.value) !== serialize(state)) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the history store
			setState(entry.value);
		}
	}, [controlState, id, state]);

	useEffect(() => {
		if (
			storedProperty !== undefined &&
			serialize(storedProperty.value) !== serialize(state)
		) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the controls store
			setState(storedProperty.value);
		}
	}, [storedProperty, id]);

	/* Save Control Property in Store. Runs when the local value changes, not
	   on every render: callers often pass a new `initialState` object each
	   time, and re-saving a stale local value would overwrite newer store
	   values (the store and the state would chase each other). */
	const initialKey = serialize(initialState);
	useEffect(() => {
		const currentWorkspaceID = useWorkspaceStore.getState().currentWorkspaceID;
		const currentValue = storedProperty
			? serialize(storedProperty.value)
			: serialize(initialState);
		const newValue = serialize(state);

		// Only update if the value has actually changed to prevent infinite loops
		if (currentValue !== newValue) {
			addControlProperty({ id, value: state }, currentWorkspaceID);
		}
	}, [state, id, initialKey]);

	const set = (newState: any) => {
		if (serialize(newState) === serialize(state)) {
			return;
		}

		setState(newState);

		if (manual) return;

		setPastHistory([...pastHistory, { id, value: state }]);
		setControlState({ id, value: newState });

		/* Clean Future */
		setFutureHistory([]);
	};

	return [state, set];
}
