import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useControlsStore, useHistoryStore } from '../stores';
import { useControlState } from './useControlState';

// React only flushes effects inside act() when it knows it runs in tests.
(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const ID = 'text-1-pos';
const DEFAULT = { x: 33, y: 190 };

/** Every value the block painted, in order. */
let painted: unknown[];

const Block: React.FC = () => {
	const [position] = useControlState(DEFAULT, ID, true);
	painted.push(position);
	return null;
};

let container: HTMLDivElement;
let root: Root;

const mount = () => {
	act(() => {
		root = createRoot(container);
		root.render(<Block />);
	});
};

const unmount = () => {
	act(() => root.unmount());
};

const stored = () =>
	useControlsStore.getState().ControlProperties.find((item) => item.id === ID)
		?.value;

beforeEach(() => {
	painted = [];
	container = document.createElement('div');
	useControlsStore.setState({ ControlProperties: [], initialProperties: [] });
	useHistoryStore.setState({ controlState: null, pastHistory: [] });
});

afterEach(() => {
	container.remove();
});

describe('useControlState', () => {
	it('keeps the stored value when a block mounts again', () => {
		useControlsStore.setState({
			ControlProperties: [{ id: ID, value: { x: 400, y: 20 } }],
		});

		mount();

		expect(painted[0]).toEqual({ x: 400, y: 20 });
		expect(painted).not.toContainEqual(DEFAULT);
		expect(stored()).toEqual({ x: 400, y: 20 });
		unmount();
	});

	it('starts from a pending initial value and stores it', () => {
		useControlsStore.setState({
			initialProperties: [{ id: ID, value: { x: 10, y: 12 } }],
		});

		mount();

		expect(painted[0]).toEqual({ x: 10, y: 12 });
		expect(stored()).toEqual({ x: 10, y: 12 });
		expect(useControlsStore.getState().initialProperties).toEqual([]);
		unmount();
	});

	it('starts a new block from its default', () => {
		mount();

		expect(painted).toEqual([DEFAULT]);
		unmount();
	});

	it('survives leaving the canvas and coming back', () => {
		mount();
		act(() => {
			useControlsStore
				.getState()
				.addControlProperty({ id: ID, value: { x: 250, y: 75 } }, 'w');
		});
		unmount();

		painted = [];
		mount();

		expect(painted[0]).toEqual({ x: 250, y: 75 });
		expect(painted).not.toContainEqual(DEFAULT);
		expect(stored()).toEqual({ x: 250, y: 75 });
		unmount();
	});
});
