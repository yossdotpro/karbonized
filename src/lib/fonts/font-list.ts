import type { FontSource } from './fonts';

/**
 * The rows of the font picker: group headings and fonts, flattened so the
 * list can be virtualized (only the rows on screen are rendered).
 */

export type FontRow =
	| { kind: 'heading'; key: string; label: string }
	| {
			kind: 'font';
			key: string;
			family: string;
			label: string;
			source: FontSource | 'default';
	  };

export interface FontGroup {
	label: string;
	fonts: Array<{
		family: string;
		label?: string;
		source: FontSource | 'default';
	}>;
}

/** Headings and fonts in order; empty groups are left out. */
export const buildFontRows = (groups: readonly FontGroup[]): FontRow[] =>
	groups.flatMap((group) =>
		group.fonts.length === 0
			? []
			: [
					{
						kind: 'heading' as const,
						key: `heading-${group.label}`,
						label: group.label,
					},
					...group.fonts.map((font) => ({
						kind: 'font' as const,
						key: `${font.source}-${font.family || 'default'}-${group.label}`,
						family: font.family,
						label: font.label ?? font.family,
						source: font.source,
					})),
				],
	);

/** First and last row index (inclusive) to render for a scroll position. */
export const visibleRange = (
	scrollTop: number,
	viewport: number,
	rowHeight: number,
	count: number,
	overscan = 6,
): [number, number] => {
	if (count === 0) return [0, -1];
	const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
	const last = Math.min(
		count - 1,
		Math.ceil((scrollTop + viewport) / rowHeight) + overscan,
	);
	return [first, last];
};

/**
 * The next font row from `from` in `direction`, skipping headings. Stays put at
 * the ends of the list. `from` -1 starts before the first row.
 */
export const nextFontRow = (
	rows: readonly FontRow[],
	from: number,
	direction: 1 | -1,
): number => {
	for (let i = from + direction; i >= 0 && i < rows.length; i += direction) {
		if (rows[i].kind === 'font') return i;
	}
	return from >= 0 && from < rows.length && rows[from].kind === 'font'
		? from
		: -1;
};

/** The scroll position that brings row `index` into view, or null when it already is. */
export const scrollToRow = (
	index: number,
	scrollTop: number,
	viewport: number,
	rowHeight: number,
): number | null => {
	const top = index * rowHeight;
	if (top < scrollTop) return top;
	if (top + rowHeight > scrollTop + viewport) return top + rowHeight - viewport;
	return null;
};
