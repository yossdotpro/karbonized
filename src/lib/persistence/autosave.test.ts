import { describe, expect, it } from 'vitest';
import { MAX_SAVED_HISTORY, trimHistory } from './autosave';

const entries = (count: number, prefix: string) =>
	Array.from({ length: count }, (_, index) => ({
		id: `${prefix}-${index}`,
		value: index,
	}));

describe('trimHistory', () => {
	it('keeps the whole history when it is short', () => {
		const pastHistory = entries(3, 'past');
		const futureHistory = entries(2, 'future');

		expect(trimHistory({ pastHistory, futureHistory })).toEqual({
			past: pastHistory,
			future: futureHistory,
		});
	});

	it('keeps the most recent undo steps and the next redo steps', () => {
		const pastHistory = entries(MAX_SAVED_HISTORY + 20, 'past');
		const futureHistory = entries(MAX_SAVED_HISTORY + 5, 'future');
		const { past, future } = trimHistory({ pastHistory, futureHistory });

		expect(past).toHaveLength(MAX_SAVED_HISTORY);
		expect(past[0].id).toBe('past-20');
		expect(past.at(-1)?.id).toBe(`past-${MAX_SAVED_HISTORY + 19}`);

		expect(future).toHaveLength(MAX_SAVED_HISTORY);
		expect(future[0].id).toBe('future-0');
	});
});
