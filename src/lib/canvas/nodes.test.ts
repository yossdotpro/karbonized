import { describe, expect, it } from 'vitest';
import {
	canvasToNode,
	insertNode,
	moveNode,
	nodeAt,
	nodeToCanvas,
	removeNode,
} from './nodes';

/** A stroke drawn in a 100×50 box, shown twice as big at (200, 100). */
const frame = {
	x: 200,
	y: 100,
	width: 200,
	height: 100,
	viewWidth: 100,
	viewHeight: 50,
};

const points = [
	{ x: 0, y: 0 },
	{ x: 50, y: 25 },
	{ x: 100, y: 50 },
];

describe('nodeToCanvas and canvasToNode', () => {
	it('place a node on the canvas, scale included', () => {
		expect(nodeToCanvas({ x: 50, y: 25 }, frame)).toEqual({ x: 300, y: 150 });
	});

	it('come back to the same node', () => {
		expect(canvasToNode({ x: 300, y: 150 }, frame)).toEqual({ x: 50, y: 25 });
	});

	it('survive a stroke that was never drawn', () => {
		const empty = { ...frame, viewWidth: 0, viewHeight: 0 };
		expect(canvasToNode({ x: 200, y: 100 }, empty)).toEqual({ x: 0, y: 0 });
	});
});

describe('nodeAt', () => {
	it('finds the node under the pointer', () => {
		expect(nodeAt(points, { x: 302, y: 152 }, frame, 10)).toBe(1);
	});

	it('finds nothing when the pointer is far', () => {
		expect(nodeAt(points, { x: 350, y: 300 }, frame, 10)).toBe(-1);
	});
});

describe('moveNode', () => {
	it('moves one node and leaves the rest', () => {
		const moved = moveNode(points, 1, { x: 10, y: 40 });

		expect(moved[1]).toEqual({ x: 10, y: 40 });
		expect(moved[0]).toEqual(points[0]);
		expect(moved[2]).toEqual(points[2]);
	});

	it('keeps the pressure of the node', () => {
		const withPressure = [{ x: 0, y: 0, pressure: 0.8 }];
		expect(moveNode(withPressure, 0, { x: 5, y: 5 })[0].pressure).toBe(0.8);
	});
});

describe('removeNode', () => {
	it('takes the node out', () => {
		expect(removeNode(points, 1)).toEqual([points[0], points[2]]);
	});

	it('leaves a line of two points alone', () => {
		const line = [points[0], points[2]];
		expect(removeNode(line, 0)).toEqual(line);
	});
});

describe('insertNode', () => {
	it('adds the node on the nearest segment', () => {
		const result = insertNode(points, { x: 20, y: 10 });

		expect(result.index).toBe(1);
		expect(result.points).toHaveLength(4);
		expect(result.points[1]).toMatchObject({ x: 20, y: 10 });
	});

	it('starts a stroke that has nothing yet', () => {
		expect(insertNode([], { x: 3, y: 4 })).toEqual({
			points: [{ x: 3, y: 4 }],
			index: 0,
		});
	});
});
