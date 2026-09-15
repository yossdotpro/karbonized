import { describe, expect, it } from 'vitest';
import { type Box, alignBoxes, distributeBoxes, getBounds } from './arrange';

const boxes: Box[] = [
	{ id: 'a', x: 10, y: 20, width: 100, height: 50 },
	{ id: 'b', x: 200, y: 80, width: 40, height: 40 },
	{ id: 'c', x: 90, y: 200, width: 60, height: 20 },
];

describe('getBounds', () => {
	it('wraps every box', () => {
		expect(getBounds(boxes)).toEqual({
			left: 10,
			top: 20,
			right: 240,
			bottom: 220,
		});
	});
});

describe('alignBoxes', () => {
	it('aligns edges to the selection bounds', () => {
		expect(alignBoxes(boxes, 'left').map((box) => box.x)).toEqual([10, 10, 10]);
		expect(alignBoxes(boxes, 'right').map((box) => box.x)).toEqual([
			140, 200, 180,
		]);
		expect(alignBoxes(boxes, 'top').map((box) => box.y)).toEqual([20, 20, 20]);
		expect(alignBoxes(boxes, 'bottom').map((box) => box.y)).toEqual([
			170, 180, 200,
		]);
	});

	it('centers on the selection bounds', () => {
		// Bounds center: x = 125, y = 120.
		expect(alignBoxes(boxes, 'center').map((box) => box.x)).toEqual([
			75, 105, 95,
		]);
		expect(alignBoxes(boxes, 'middle').map((box) => box.y)).toEqual([
			95, 100, 110,
		]);
	});

	it('keeps the other axis untouched', () => {
		const result = alignBoxes(boxes, 'left');
		expect(result.map((box) => box.y)).toEqual([20, 80, 200]);
	});

	it('aligns to a frame such as the canvas', () => {
		const canvas = { left: 0, top: 0, right: 1000, bottom: 500 };
		expect(alignBoxes([boxes[0]], 'center', canvas)).toEqual([
			{ id: 'a', x: 450, y: 20 },
		]);
		expect(alignBoxes([boxes[0]], 'bottom', canvas)).toEqual([
			{ id: 'a', x: 10, y: 450 },
		]);
	});
});

describe('distributeBoxes', () => {
	it('spaces boxes evenly between the outermost ones', () => {
		const row: Box[] = [
			{ id: 'a', x: 0, y: 0, width: 10, height: 10 },
			{ id: 'b', x: 70, y: 5, width: 20, height: 10 },
			{ id: 'c', x: 90, y: 0, width: 10, height: 10 },
		];

		// Span 100, occupied 40 => gap 30.
		expect(distributeBoxes(row, 'horizontal')).toEqual([
			{ id: 'a', x: 0, y: 0 },
			{ id: 'b', x: 40, y: 5 },
			{ id: 'c', x: 90, y: 0 },
		]);
	});

	it('works on the vertical axis and keeps the input order', () => {
		const column: Box[] = [
			{ id: 'bottom', x: 0, y: 100, width: 10, height: 20 },
			{ id: 'top', x: 0, y: 0, width: 10, height: 20 },
			{ id: 'middle', x: 5, y: 30, width: 10, height: 20 },
		];

		expect(distributeBoxes(column, 'vertical')).toEqual([
			{ id: 'bottom', x: 0, y: 100 },
			{ id: 'top', x: 0, y: 0 },
			{ id: 'middle', x: 5, y: 50 },
		]);
	});

	it('does nothing with fewer than three boxes', () => {
		expect(distributeBoxes(boxes.slice(0, 2), 'horizontal')).toEqual([
			{ id: 'a', x: 10, y: 20 },
			{ id: 'b', x: 200, y: 80 },
		]);
	});
});
