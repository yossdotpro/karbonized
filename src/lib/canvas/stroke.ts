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

/** A point of a stroke: where the pointer was and how hard it pressed. */
export interface StrokePoint extends Point {
	/** 0–1. A mouse always reports the same value, a pen does not. */
	pressure?: number;
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
	/** The points behind the path, in the same coordinates. */
	points: StrokePoint[];
	box: Box;
}

/** Turn the points of a drag into the path and the box of a stroke block. */
export const strokeFromPoints = (
	points: readonly StrokePoint[],
	{ smoothing = 1.2, padding = 0 }: StrokeOptions = {},
): Stroke | null => {
	if (points.length === 0) return null;

	const simplified = simplifyPoints(points, smoothing) as StrokePoint[];
	const box = boundsOf(simplified, padding);
	const relative: StrokePoint[] = relativeTo(simplified, box).map(
		(point, index) => ({ ...point, pressure: simplified[index].pressure }),
	);

	return {
		path: smoothPath(relative),
		points: relative,
		box,
	};
};

/* -------------------------------------------------------------------------- */
/* Variable width                                                             */
/* -------------------------------------------------------------------------- */

export interface WidthOptions {
	/** Width of the stroke where it is thickest, in pixels. */
	width: number;
	/**
	 * How much the stroke thins, 0–1. 0 keeps one width from end to end; 1
	 * lets it go down to almost nothing where the pen is light or fast.
	 */
	thinning?: number;
	/** How far the ends taper off, in pixels (0 leaves them blunt). */
	taper?: number;
	/** Speed, in pixels between points, at which the stroke is thinnest. */
	fastAt?: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Half width at every point.
 *
 * A pen gives its pressure. Everything else (a mouse, a trackpad) reports the
 * same value at every point, so the speed of the stroke takes its place: the
 * faster it moves the thinner it gets, which is what makes a drawn line look
 * drawn instead of traced.
 */
export const strokeRadii = (
	points: readonly StrokePoint[],
	{ width, thinning = 0.5, taper = 0, fastAt = 24 }: WidthOptions,
): number[] => {
	if (points.length === 0) return [];

	const radius = width / 2;
	const amount = clamp01(thinning);
	const hasPressure = points.some(
		(point) =>
			point.pressure !== undefined &&
			point.pressure > 0 &&
			point.pressure !== points[0].pressure,
	);

	// Distance along the stroke, so the ends can taper.
	const lengths = [0];
	for (let index = 1; index < points.length; index += 1) {
		lengths.push(
			lengths[index - 1] +
				Math.hypot(
					points[index].x - points[index - 1].x,
					points[index].y - points[index - 1].y,
				),
		);
	}
	const total = lengths[lengths.length - 1];

	return points.map((point, index) => {
		let factor: number;

		if (hasPressure) {
			factor = clamp01(point.pressure ?? 0.5);
		} else {
			const previous = points[index - 1] ?? point;
			const speed = Math.hypot(point.x - previous.x, point.y - previous.y);
			factor = 1 - clamp01(speed / fastAt);
		}

		// Thinning mixes the plain width with the one the stroke asked for.
		let value = radius * (1 - amount + amount * factor);

		if (taper > 0 && total > 0) {
			const reach = Math.min(taper, total / 2);
			const fromEnds = Math.min(lengths[index], total - lengths[index]);
			value *= clamp01(fromEnds / reach);
		}

		return Math.max(0.2, value);
	});
};

/** A point moved `distance` along the normal of the stroke at `index`. */
const offsetPoint = (
	points: readonly Point[],
	index: number,
	distance: number,
): Point => {
	const previous = points[index - 1] ?? points[index];
	const next = points[index + 1] ?? points[index];
	const dx = next.x - previous.x;
	const dy = next.y - previous.y;
	const length = Math.hypot(dx, dy) || 1;

	return {
		x: points[index].x - (dy / length) * distance,
		y: points[index].y + (dx / length) * distance,
	};
};

/**
 * The outline of a stroke whose width changes along it: one side out, a round
 * cap, the other side back. It is filled, not stroked, which is the only way
 * a line can be thick in one place and thin in another.
 */
export const outlinePath = (
	points: readonly StrokePoint[],
	options: WidthOptions,
): string => {
	if (points.length === 0) return '';

	const radii = strokeRadii(points, options);

	if (points.length === 1) {
		// A dot: a circle as wide as the stroke.
		const { x, y } = points[0];
		const r = radii[0];
		return [
			`M${round(x - r)},${round(y)}`,
			`A${round(r)},${round(r)} 0 1 1 ${round(x + r)},${round(y)}`,
			`A${round(r)},${round(r)} 0 1 1 ${round(x - r)},${round(y)}`,
			'Z',
		].join(' ');
	}

	const left = points.map((_, index) =>
		offsetPoint(points, index, radii[index]),
	);
	const right = points.map((_, index) =>
		offsetPoint(points, index, -radii[index]),
	);
	const last = points.length - 1;

	const line = (side: readonly Point[]) =>
		side
			.slice(1)
			.map((point) => `L${round(point.x)},${round(point.y)}`)
			.join(' ');

	return [
		`M${round(left[0].x)},${round(left[0].y)}`,
		line(left),
		`A${round(radii[last])},${round(radii[last])} 0 0 1 ${round(
			right[last].x,
		)},${round(right[last].y)}`,
		line([...right].reverse()),
		`A${round(radii[0])},${round(radii[0])} 0 0 1 ${round(left[0].x)},${round(
			left[0].y,
		)}`,
		'Z',
	].join(' ');
};

/* -------------------------------------------------------------------------- */
/* Storing the points                                                         */
/* -------------------------------------------------------------------------- */

/** Points as text, so a block can store them: `x,y,pressure` per point. */
export const serializePoints = (points: readonly StrokePoint[]): string =>
	points
		.map((point) => {
			const pressure =
				point.pressure === undefined
					? 0.5
					: Math.round(point.pressure * 100) / 100;
			return `${round(point.x)},${round(point.y)},${pressure}`;
		})
		.join(' ');

/** The points of a stored stroke. */
export const parsePoints = (value: unknown): StrokePoint[] => {
	if (typeof value !== 'string' || value.trim() === '') return [];

	return value
		.trim()
		.split(/\s+/)
		.flatMap((item) => {
			const [x, y, pressure] = item.split(',').map(Number);
			return Number.isFinite(x) && Number.isFinite(y)
				? [{ x, y, pressure: Number.isFinite(pressure) ? pressure : 0.5 }]
				: [];
		});
};
