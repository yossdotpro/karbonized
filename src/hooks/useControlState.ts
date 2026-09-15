import { useEffect, useState } from 'react';
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
	const ControlProperties = useControlsStore(
		(state) => state.ControlProperties,
	);
	const initialProperties = useControlsStore(
		(state) => state.initialProperties,
	);
	const currentControlID = useControlsStore((state) => state.currentControlID);
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

	const hasInitialProperty = (id: string) => {
		for (const item of initialProperties) {
			if (item.id === id) return item.value;
		}
		return null;
	};

	const serialize = (value: unknown): string => {
		if (typeof value === 'string') return value;
		return JSON.stringify(value);
	};

	const controlRef = id.split('-').slice(0, 2).join('-');

	const [state, setState] = useState(initialState);

	/* Set Initial Properties */
	useEffect(() => {
		const prop = hasInitialProperty(id);
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
	}, [id, initialProperties, removeInitialProperty, state]);

	/* Apply undo/redo and batch changes that target this property */
	useEffect(() => {
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
		const storedProperty = ControlProperties.find((item) => item.id === id);
		if (
			storedProperty !== undefined &&
			serialize(storedProperty.value) !== serialize(state)
		) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the controls store
			setState(storedProperty.value);
		}
	}, [ControlProperties, controlRef, currentControlID, id]);

	/* Save Control Property in Store */
	useEffect(() => {
		const currentWorkspaceID = useWorkspaceStore.getState().currentWorkspaceID;
		const storedProperty = ControlProperties.find((item) => item.id === id);
		const currentValue = storedProperty
			? serialize(storedProperty.value)
			: serialize(initialState);
		const newValue = serialize(state);

		// Only update if the value has actually changed to prevent infinite loops
		if (currentValue !== newValue) {
			addControlProperty({ id, value: state }, currentWorkspaceID);
		}
	}, [state, id, initialState]);

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
