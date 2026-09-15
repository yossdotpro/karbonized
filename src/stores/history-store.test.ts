import { beforeEach, describe, expect, it } from 'vitest';
import type { History } from '../types';
import {
	isBatchHistory,
	setHistoryValueResolver,
	useHistoryStore,
} from './history-store';

/** Property values of a fake document, updated as history is applied. */
let values: Map<string, unknown>;

const apply = (entry: History | null) => {
	if (!entry) return;
	if (isBatchHistory(entry)) {
		entry.value.forEach((item: History) => values.set(item.id, item.value));
	} else {
		values.set(entry.id, entry.value);
	}
};

/** Record a single property change the way controls do. */
const change = (id: string, next: unknown) => {
	const store = useHistoryStore.getState();
	store.setPast([...store.pastHistory, { id, value: values.get(id) }]);
	store.setFuture([]);
	store.setControlState({ id, value: next });
	values.set(id, next);
};

const undo = () => {
	useHistoryStore.getState().undo();
	apply(useHistoryStore.getState().controlState);
};

const redo = () => {
	useHistoryStore.getState().redo();
	apply(useHistoryStore.getState().controlState);
};

const snapshot = () => Object.fromEntries(values);

beforeEach(() => {
	values = new Map<string, unknown>([
		['a-pos', { x: 0, y: 0 }],
		['b-pos', { x: 50, y: 50 }],
	]);
	setHistoryValueResolver((id) => ({
		found: values.has(id),
		value: values.get(id),
	}));
	useHistoryStore.setState({
		pastHistory: [],
		futureHistory: [],
		controlState: null,
	});
});

describe('history store', () => {
	it('undoes and redoes a batch in one step', () => {
		useHistoryStore.getState().commitBatch([
			{ id: 'a-pos', previous: { x: 0, y: 0 }, next: { x: 10, y: 0 } },
			{ id: 'b-pos', previous: { x: 50, y: 50 }, next: { x: 10, y: 50 } },
		]);
		apply(useHistoryStore.getState().controlState);

		undo();
		expect(snapshot()).toEqual({
			'a-pos': { x: 0, y: 0 },
			'b-pos': { x: 50, y: 50 },
		});

		redo();
		expect(snapshot()).toEqual({
			'a-pos': { x: 10, y: 0 },
			'b-pos': { x: 10, y: 50 },
		});
	});

	it('restores every step when redoing after several undos', () => {
		const store = useHistoryStore.getState();

		store.commitBatch([
			{ id: 'a-pos', previous: { x: 0, y: 0 }, next: { x: 0, y: 0 } },
			{ id: 'b-pos', previous: { x: 50, y: 50 }, next: { x: 0, y: 50 } },
		]);
		apply(useHistoryStore.getState().controlState);
		change('a-pos', { x: 0, y: 99 });
		const final = snapshot();

		undo();
		undo();
		expect(snapshot()).toEqual({
			'a-pos': { x: 0, y: 0 },
			'b-pos': { x: 50, y: 50 },
		});

		redo();
		expect(snapshot()).toEqual({
			'a-pos': { x: 0, y: 0 },
			'b-pos': { x: 0, y: 50 },
		});

		redo();
		expect(snapshot()).toEqual(final);
	});

	it('mixes single and batch entries across undo and redo', () => {
		change('a-pos', { x: 5, y: 5 });
		useHistoryStore.getState().commitBatch([
			{ id: 'a-pos', previous: { x: 5, y: 5 }, next: { x: 20, y: 5 } },
			{ id: 'b-pos', previous: { x: 50, y: 50 }, next: { x: 20, y: 50 } },
		]);
		apply(useHistoryStore.getState().controlState);
		change('b-pos', { x: 20, y: 80 });
		const final = snapshot();

		undo();
		undo();
		undo();
		expect(snapshot()).toEqual({
			'a-pos': { x: 0, y: 0 },
			'b-pos': { x: 50, y: 50 },
		});

		redo();
		redo();
		redo();
		expect(snapshot()).toEqual(final);
		expect(useHistoryStore.getState().futureHistory).toHaveLength(0);
	});

	it('clears the redo stack on a new batch', () => {
		change('a-pos', { x: 1, y: 1 });
		undo();
		expect(useHistoryStore.getState().futureHistory).toHaveLength(1);

		useHistoryStore
			.getState()
			.commitBatch([
				{ id: 'b-pos', previous: { x: 50, y: 50 }, next: { x: 0, y: 0 } },
			]);
		expect(useHistoryStore.getState().futureHistory).toHaveLength(0);
	});
});
