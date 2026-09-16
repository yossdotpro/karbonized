/**
 * Freehand strokes as vectors.
 *
 * A stroke starts as the points the pointer went through, which are many and
 * shaky. They are thinned out (Ramer–Douglas–Peucker) and then turned into a
 * smooth cubic path (Catmull-Rom), so the result is a real curve that can be
 * scaled and edited, not a bitmap.
 */

export interface Point {
	x: number;
	y: number;
}

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** Distance from `point` to the segment `start`–`end`. */
const distanceToSegment = (point: Point, start: Point, end: Point): number => {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const lengthSquared = dx * dx + dy * dy;

	if (lengthSquared === 0) {
		return Math.hypot(point.x - start.x, point.y - start.y);
	}

	const t = Math.max(
		0,
		Math.min(
			1,
			((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
		),
	);

	return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
};

/**
 * The same line with fewer points: every point that sits closer than
 * `tolerance` to the line between its neighbours is dropped.
 */
export const simplifyPoints = (
	points: readonly Point[],
	tolerance: number,
): Point[] => {
	if (points.length <= 2 || tolerance <= 0) return [...points];

	let farthest = 0;
	let distance = 0;

	for (let index = 1; index < points.length - 1; index += 1) {
		const current = distanceToSegment(
			points[index],
			points[0],
			points[points.length - 1],
		);
		if (current > distance) {
			distance = current;
			farthest = index;
		}
	}

	if (distance <= tolerance) {
		return [points[0], points[points.length - 1]];
	}

	const left = simplifyPoints(points.slice(0, farthest + 1), tolerance);
	const right = simplifyPoints(points.slice(farthest), tolerance);

	return [...left.slice(0, -1), ...right];
};

/**
 * A smooth cubic path through every point. The control points come from the
 * neighbours of each segment (Catmull-Rom), so the curve passes through the
 * points instead of being pulled away from them.
 */
export const smoothPath = (points: readonly Point[]): string => {
	if (points.length === 0) return '';
	if (points.length === 1) {
		// A dot: a curve of no length, which round caps still paint.
		const { x, y } = points[0];
		return `M${round(x)},${round(y)} L${round(x)},${round(y)}`;
	}
	if (points.length === 2) {
		return `M${round(points[0].x)},${round(points[0].y)} L${round(
			points[1].x,
		)},${round(points[1].y)}`;
	}

	const parts = [`M${round(points[0].x)},${round(points[0].y)}`];

	for (let index = 0; index < points.length - 1; index += 1) {
		const previous = points[index - 1] ?? points[index];
		const current = points[index];
		const next = points[index + 1];
		const after = points[index + 2] ?? next;

		const control1 = {
			x: current.x + (next.x - previous.x) / 6,
			y: current.y + (next.y - previous.y) / 6,
		};
		const control2 = {
			x: next.x - (after.x - current.x) / 6,
			y: next.y - (after.y - current.y) / 6,
		};

		parts.push(
			`C${round(control1.x)},${round(control1.y)} ${round(
				control2.x,
			)},${round(control2.y)} ${round(next.x)},${round(next.y)}`,
		);
	}

	return parts.join(' ');
};

/** Smallest box that holds every point, grown by `padding` on each side. */
export const boundsOf = (points: readonly Point[], padding = 0): Box => {
	if (points.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);
	const minX = Math.min(...xs) - padding;
	const minY = Math.min(...ys) - padding;

	return {
		x: minX,
		y: minY,
		width: Math.max(...xs) + padding - minX,
		height: Math.max(...ys) + padding - minY,
	};
};

/** The same points, measured from the top left corner of `box`. */
export const relativeTo = (
	points: readonly Point[],
	box: Pick<Box, 'x' | 'y'>,
): Point[] =>
	points.map((point) => ({ x: point.x - box.x, y: point.y - box.y }));

export interface StrokeOptions {
	/** How far a point may be from the line to be dropped, in pixels. */
	smoothing?: number;
	/** Half the stroke width, so the line is not cut off by the block. */
	padding?: number;
}

export interface Stroke {
	/** Path data, measured from the top left corner of `box`. */
	path: string;
	box: Box;
}

/** Turn the points of a drag into the path and the box of a stroke block. */
export const strokeFromPoints = (
	points: readonly Point[],
	{ smoothing = 1.2, padding = 0 }: StrokeOptions = {},
): Stroke | null => {
	if (points.length === 0) return null;

	const simplified = simplifyPoints(points, smoothing);
	const box = boundsOf(simplified, padding);

	return {
		path: smoothPath(relativeTo(simplified, box)),
		box,
	};
};
