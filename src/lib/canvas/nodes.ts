/**
 * Editing the points of a stroke.
 *
 * A stroke is stored in the coordinates it was drawn in (its view box) while
 * the block it lives in can be moved and resized, so a node has two places:
 * where it sits inside the stroke and where it sits on the canvas.
 */

import type { StrokePoint } from './stroke';

export interface Point {
	x: number;
	y: number;
}

/** Where a stroke block is and how its view box maps onto it. */
export interface NodeFrame {
	/** Position of the block on the canvas. */
	x: number;
	y: number;
	/** Size of the block on the canvas. */
	width: number;
	height: number;
	/** Size the stroke was drawn in. */
	viewWidth: number;
	viewHeight: number;
}

const scaleOf = (frame: NodeFrame) => ({
	x: frame.viewWidth > 0 ? frame.width / frame.viewWidth : 1,
	y: frame.viewHeight > 0 ? frame.height / frame.viewHeight : 1,
});

/** Where a node of the stroke sits on the canvas. */
export const nodeToCanvas = (node: Point, frame: NodeFrame): Point => {
	const scale = scaleOf(frame);
	return {
		x: frame.x + node.x * scale.x,
		y: frame.y + node.y * scale.y,
	};
};

/** Where a point of the canvas sits inside the stroke. */
export const canvasToNode = (point: Point, frame: NodeFrame): Point => {
	const scale = scaleOf(frame);
	return {
		x: (point.x - frame.x) / (scale.x || 1),
		y: (point.y - frame.y) / (scale.y || 1),
	};
};

/** The node nearest to a canvas point, when it is within `radius`. */
export const nodeAt = (
	points: readonly StrokePoint[],
	point: Point,
	frame: NodeFrame,
	radius: number,
): number => {
	let nearest = -1;
	let best = radius;

	points.forEach((node, index) => {
		const canvas = nodeToCanvas(node, frame);
		const distance = Math.hypot(canvas.x - point.x, canvas.y - point.y);
		if (distance <= best) {
			best = distance;
			nearest = index;
		}
	});

	return nearest;
};

/** The same stroke with node `index` somewhere else. */
export const moveNode = (
	points: readonly StrokePoint[],
	index: number,
	node: Point,
): StrokePoint[] =>
	points.map((point, current) =>
		current === index ? { ...point, x: node.x, y: node.y } : point,
	);

/**
 * The same stroke without node `index`. A stroke of two points is left alone:
 * below that there is no line to edit.
 */
export const removeNode = (
	points: readonly StrokePoint[],
	index: number,
): StrokePoint[] =>
	points.length <= 2
		? [...points]
		: points.filter((_, current) => current !== index);

/**
 * The same stroke with a node added on the segment nearest to `point`, and
 * the index it was given, so it can be dragged right away.
 */
export const insertNode = (
	points: readonly StrokePoint[],
	point: Point,
): { points: StrokePoint[]; index: number } => {
	if (points.length < 2) {
		return { points: [...points, { ...point }], index: points.length };
	}

	let bestIndex = 1;
	let bestDistance = Infinity;

	for (let index = 1; index < points.length; index += 1) {
		const start = points[index - 1];
		const end = points[index];
		const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
		const distance = Math.hypot(middle.x - point.x, middle.y - point.y);

		if (distance < bestDistance) {
			bestDistance = distance;
			bestIndex = index;
		}
	}

	const next = [...points];
	next.splice(bestIndex, 0, {
		...point,
		pressure: points[bestIndex]?.pressure,
	});

	return { points: next, index: bestIndex };
};
