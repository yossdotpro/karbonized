import { describe, expect, it } from 'vitest';
import {
	buildFontRows,
	nextFontRow,
	scrollToRow,
	visibleRange,
} from './font-list';

const rows = buildFontRows([
	{
		label: 'App',
		fonts: [{ family: '', label: 'Default', source: 'default' }],
	},
	{ label: 'Installed', fonts: [] },
	{
		label: 'Google Fonts',
		fonts: [
			{ family: 'Inter', source: 'google' },
			{ family: 'Fredoka', source: 'google' },
		],
	},
]);

describe('buildFontRows', () => {
	it('puts a heading before each group and leaves empty groups out', () => {
		expect(
			rows.map((row) =>
				row.kind === 'heading' ? `# ${row.label}` : row.label,
			),
		).toEqual(['# App', 'Default', '# Google Fonts', 'Inter', 'Fredoka']);
	});

	it('gives every row a unique key', () => {
		expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
	});
});

describe('visibleRange', () => {
	it('covers the rows on screen plus the overscan', () => {
		expect(visibleRange(0, 320, 36, 2000, 6)).toEqual([0, 15]);
		expect(visibleRange(3600, 320, 36, 2000, 6)).toEqual([94, 115]);
	});

	it('stays inside the list', () => {
		expect(visibleRange(71_900, 320, 36, 2000, 6)).toEqual([1991, 1999]);
		expect(visibleRange(0, 320, 36, 0)).toEqual([0, -1]);
	});
});

describe('nextFontRow', () => {
	it('skips headings in both directions', () => {
		expect(nextFontRow(rows, -1, 1)).toBe(1);
		expect(nextFontRow(rows, 1, 1)).toBe(3);
		expect(nextFontRow(rows, 3, -1)).toBe(1);
	});

	it('stays on the last font at the ends', () => {
		expect(nextFontRow(rows, 4, 1)).toBe(4);
		expect(nextFontRow(rows, 1, -1)).toBe(1);
	});
});

describe('scrollToRow', () => {
	it('scrolls only when the row is out of view', () => {
		expect(scrollToRow(5, 0, 320, 36)).toBeNull();
		expect(scrollToRow(20, 0, 320, 36)).toBe(20 * 36 + 36 - 320);
		expect(scrollToRow(2, 200, 320, 36)).toBe(72);
	});
});
