import type { TextSizing } from './catalog';

/**
 * How a text block is sized:
 * - `auto`: the block fits its text (new blocks).
 * - `fixed-width`: the width stays, the text wraps and the height grows.
 * - `fixed`: width and height stay (blocks saved before sizing modes existed).
 */

export const isTextSizing = (value: unknown): value is TextSizing =>
	value === 'auto' || value === 'fixed-width' || value === 'fixed';

/**
 * Mode after resizing with the canvas handles. `direction` is Moveable's
 * handle direction: `[x, y]`, each -1, 0 or 1. Dragging a side handle only
 * fixes the width; a top, bottom or corner handle (or a locked aspect ratio)
 * fixes both.
 */
export const sizingAfterResize = (
	current: TextSizing,
	direction: readonly number[],
	keepRatio = false,
): TextSizing => {
	if (current === 'fixed') return 'fixed';
	const vertical = (direction[1] ?? 0) !== 0;
	return vertical || keepRatio ? 'fixed' : 'fixed-width';
};

/** Mode for a text block given the size set for it programmatically. */
export const sizingForSize = (
	current: TextSizing,
	size: { width?: number; height?: number },
): TextSizing => {
	if (size.height !== undefined) return 'fixed';
	if (size.width !== undefined)
		return current === 'fixed' ? 'fixed' : 'fixed-width';
	return current;
};
