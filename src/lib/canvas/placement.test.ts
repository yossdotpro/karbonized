import { describe, expect, it } from 'vitest';
import { CASCADE_STEP, cascadePosition, centerOfView } from './placement';

const canvas = { width: 1000, height: 800 };
const block = { width: 100, height: 50 };

describe('centerOfView', () => {
	it('centers the block in the canvas when the whole canvas is visible', () => {
		const position = centerOfView(
			{ left: 0, top: 0, width: 1200, height: 900 },
			{ left: 100, top: 50, width: 1000, height: 800 },
			canvas,
			block,
		);

		expect(position).toEqual({ x: 450, y: 375 });
	});

	it('centers on the visible part when the canvas is panned out of view', () => {
		// Only the right half of the canvas is inside the viewport.
		const position = centerOfView(
			{ left: 0, top: 0, width: 500, height: 800 },
			{ left: -500, top: 0, width: 1000, height: 800 },
			canvas,
			block,
		);

		expect(position).toEqual({ x: 700, y: 375 });
	});

	it('takes the zoom of the canvas into account', () => {
		// The canvas is drawn at half its size: 1000 canvas px in 500 screen px.
		const position = centerOfView(
			{ left: 0, top: 0, width: 500, height: 400 },
			{ left: 0, top: 0, width: 500, height: 400 },
			canvas,
			block,
		);

		expect(position).toEqual({ x: 450, y: 375 });
	});

	it('keeps the block inside the canvas', () => {
		// Only the bottom right corner is visible: centering there would put
		// most of the block outside the canvas.
		const position = centerOfView(
			{ left: 980, top: 780, width: 400, height: 400 },
			{ left: 0, top: 0, width: 1000, height: 800 },
			canvas,
			block,
		);

		expect(position).toEqual({ x: 900, y: 750 });
	});
});

describe('cascadePosition', () => {
	it('keeps the position when nothing is there', () => {
		expect(cascadePosition({ x: 10, y: 10 }, [], canvas, block)).toEqual({
			x: 10,
			y: 10,
		});
	});

	it('steps aside from a block that is already there', () => {
		expect(
			cascadePosition({ x: 10, y: 10 }, [{ x: 10, y: 10 }], canvas, block),
		).toEqual({ x: 10 + CASCADE_STEP, y: 10 + CASCADE_STEP });
	});

	it('keeps stepping while the next spot is taken too', () => {
		const taken = [
			{ x: 10, y: 10 },
			{ x: 10 + CASCADE_STEP, y: 10 + CASCADE_STEP },
		];

		expect(cascadePosition({ x: 10, y: 10 }, taken, canvas, block)).toEqual({
			x: 10 + CASCADE_STEP * 2,
			y: 10 + CASCADE_STEP * 2,
		});
	});

	it('starts over rather than leaving the canvas', () => {
		expect(
			cascadePosition({ x: 890, y: 740 }, [{ x: 890, y: 740 }], canvas, block),
		).toEqual({ x: 0, y: 0 });
	});
});
