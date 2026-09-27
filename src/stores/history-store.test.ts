import { beforeEach, describe, expect, it } from 'vitest';
import type { History } from '../types';
import {
	isBatchHistory,
	mergeHistoryEntries,
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

	it('merges entries keeping the earliest value of each target', () => {
		expect(
			mergeHistoryEntries([
				{ id: 'a-pos', value: 1 },
				{
					id: 'batch:1',
					value: [
						{ id: 'a-pos', value: 2 },
						{ id: 'b-pos', value: 3 },
					],
				},
				{ id: 'b-pos', value: 4 },
			]),
		).toEqual([
			{ id: 'a-pos', value: 1 },
			{ id: 'b-pos', value: 3 },
		]);
	});

	it('folds the steps of a transaction into one', () => {
		const { entry } = useHistoryStore.getState().transaction(() => {
			change('a-pos', { x: 1, y: 1 });
			change('b-pos', { x: 2, y: 2 });
			change('a-pos', { x: 3, y: 3 });
		});

		expect(useHistoryStore.getState().pastHistory).toEqual([entry]);
		expect(isBatchHistory(useHistoryStore.getState().controlState)).toBe(true);

		undo();
		expect(snapshot()).toEqual({
			'a-pos': { x: 0, y: 0 },
			'b-pos': { x: 50, y: 50 },
		});

		redo();
		expect(snapshot()).toEqual({
			'a-pos': { x: 3, y: 3 },
			'b-pos': { x: 2, y: 2 },
		});
	});

	it('keeps a single step of a transaction as is', () => {
		const { result, entry } = useHistoryStore.getState().transaction(() => {
			change('a-pos', { x: 1, y: 1 });
			return 'done';
		});

		expect(result).toBe('done');
		expect(entry).toEqual({ id: 'a-pos', value: { x: 0, y: 0 } });
		expect(
			useHistoryStore.getState().transaction(() => undefined).entry,
		).toBeNull();
	});

	it('collapses trailing steps but stops at a step of the user', () => {
		const record = (id: string, next: unknown) =>
			useHistoryStore.getState().transaction(() => change(id, next)).entry!;

		const assistant = new Set<History>();
		assistant.add(record('a-pos', { x: 1, y: 1 }));
		change('b-pos', { x: 9, y: 9 }); // the user
		assistant.add(record('a-pos', { x: 2, y: 2 }));
		assistant.add(record('b-pos', { x: 3, y: 3 }));

		useHistoryStore.getState().collapseTrailing(assistant);
		expect(useHistoryStore.getState().pastHistory).toHaveLength(3);

		undo();
		expect(snapshot()).toEqual({
			'a-pos': { x: 1, y: 1 },
			'b-pos': { x: 9, y: 9 },
		});
	});

	it('records canvas settings changes', () => {
		values.set('workspace-settings-w1', { workspaceColor: '#000' });
		useHistoryStore
			.getState()
			.commitWorkspaceSettings(
				'w1',
				{ workspaceColor: '#000' },
				{ workspaceColor: '#fff' },
			);
		values.set('workspace-settings-w1', { workspaceColor: '#fff' });

		undo();
		expect(values.get('workspace-settings-w1')).toEqual({
			workspaceColor: '#000',
		});
		expect(useHistoryStore.getState().futureHistory[0]).toEqual({
			id: 'workspace-settings-w1',
			value: { workspaceColor: '#fff' },
		});
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
