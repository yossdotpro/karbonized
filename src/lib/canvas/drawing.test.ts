import { describe, expect, it } from 'vitest';
import { boxFromDrag, isDrawn, toCanvasPoint } from './drawing';

const canvas = { width: 1000, height: 800 };

describe('toCanvasPoint', () => {
	it('maps a pointer to canvas pixels', () => {
		expect(
			toCanvasPoint(
				{ clientX: 150, clientY: 120 },
				{ left: 100, top: 100, width: 1000, height: 800 },
				canvas,
			),
		).toEqual({ x: 50, y: 20 });
	});

	it('takes the zoom into account', () => {
		// The canvas is drawn at half its size.
		expect(
			toCanvasPoint(
				{ clientX: 150, clientY: 120 },
				{ left: 100, top: 100, width: 500, height: 400 },
				canvas,
			),
		).toEqual({ x: 100, y: 40 });
	});
});

describe('boxFromDrag', () => {
	it('takes the box of the drag', () => {
		expect(boxFromDrag({ x: 10, y: 20 }, { x: 110, y: 70 }, canvas)).toEqual({
			x: 10,
			y: 20,
			width: 100,
			height: 50,
		});
	});

	it('works when dragging up and to the left', () => {
		expect(boxFromDrag({ x: 110, y: 70 }, { x: 10, y: 20 }, canvas)).toEqual({
			x: 10,
			y: 20,
			width: 100,
			height: 50,
		});
	});

	it('keeps a square with shift', () => {
		expect(
			boxFromDrag({ x: 10, y: 20 }, { x: 110, y: 70 }, canvas, {
				square: true,
			}),
		).toEqual({ x: 10, y: 20, width: 100, height: 100 });
	});

	it('grows from the start of the drag with alt', () => {
		expect(
			boxFromDrag({ x: 100, y: 100 }, { x: 150, y: 120 }, canvas, {
				fromCenter: true,
			}),
		).toEqual({ x: 50, y: 80, width: 100, height: 40 });
	});

	it('stays inside the canvas', () => {
		expect(
			boxFromDrag({ x: 950, y: 780 }, { x: 1200, y: 900 }, canvas),
		).toEqual({ x: 950, y: 780, width: 50, height: 20 });
	});
});

describe('isDrawn', () => {
	it('tells a drag from a click', () => {
		expect(isDrawn({ x: 0, y: 0, width: 40, height: 30 })).toBe(true);
		expect(isDrawn({ x: 0, y: 0, width: 2, height: 2 })).toBe(false);
	});
});
