/**
 * Geometry of the shape block.
 *
 * Shapes are drawn as one SVG path measured in the block's own pixels, so
 * corner radii and strokes keep their size however the block is resized.
 * Shape ids saved by older versions keep working through `resolveShape`.
 */

export type ShapeKind =
	| 'rectangle'
	| 'ellipse'
	| 'triangle'
	| 'polygon'
	| 'star'
	| 'heart'
	| 'line'
	| 'arrow';

export interface ShapeGeometry {
	width: number;
	height: number;
	/** Rectangles: corner radius in pixels. */
	cornerRadius: number;
	/** Polygons: number of sides. */
	sides: number;
	/** Stars: number of points. */
	points: number;
	/** Stars: inner radius as a percentage of the outer one. */
	innerRadius: number;
}

export const DEFAULT_GEOMETRY: ShapeGeometry = {
	width: 100,
	height: 100,
	cornerRadius: 0,
	sides: 6,
	points: 5,
	innerRadius: 45,
};

/** Shapes drawn with a stroke instead of a fill. */
export const isStrokedShape = (kind: ShapeKind): boolean =>
	kind === 'line' || kind === 'arrow';

export interface ResolvedShape {
	kind: ShapeKind;
	/** Fixed number of sides for shapes that used to be their own id. */
	sides?: number;
}

/** Shape ids from older projects that no longer have their own drawing. */
const LEGACY_SHAPES: Record<string, ResolvedShape> = {
	oval: { kind: 'ellipse' },
	poligon: { kind: 'polygon', sides: 5 },
	hexagon: { kind: 'polygon', sides: 6 },
};

/**
 * The shape to draw for a stored id, or `null` for the old arrow graphics,
 * which keep being rendered from their SVG files.
 */
export const resolveShape = (shape: string): ResolvedShape | null => {
	if (shape in LEGACY_SHAPES) return LEGACY_SHAPES[shape];

	const kinds: ShapeKind[] = [
		'rectangle',
		'ellipse',
		'triangle',
		'polygon',
		'star',
		'heart',
		'line',
		'arrow',
	];

	return kinds.includes(shape as ShapeKind)
		? { kind: shape as ShapeKind }
		: null;
};

const round = (value: number): number => Math.round(value * 100) / 100;

const polygon = (points: Array<[number, number]>): string =>
	`${points
		.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x)},${round(y)}`)
		.join(' ')} Z`;

/**
 * Points of a regular polygon inscribed in the box, first point at the top.
 * An `innerRatio` below 1 adds a shorter point between every two, which is
 * what turns the polygon into a star.
 */
export const regularPolygonPoints = (
	width: number,
	height: number,
	count: number,
	innerRatio = 1,
): Array<[number, number]> => {
	const cx = width / 2;
	const cy = height / 2;
	const step = Math.PI / count;

	return Array.from({ length: count * 2 }, (_, index) => {
		const ratio = index % 2 === 0 ? 1 : innerRatio;
		const angle = -Math.PI / 2 + index * step;
		return [
			cx + Math.cos(angle) * cx * ratio,
			cy + Math.sin(angle) * cy * ratio,
		] as [number, number];
	}).filter((_, index) => innerRatio < 1 || index % 2 === 0);
};

const roundedRectPath = (
	width: number,
	height: number,
	radius: number,
): string => {
	const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
	if (r === 0) {
		return polygon([
			[0, 0],
			[width, 0],
			[width, height],
			[0, height],
		]);
	}

	return [
		`M${round(r)},0`,
		`H${round(width - r)}`,
		`A${round(r)},${round(r)} 0 0 1 ${round(width)},${round(r)}`,
		`V${round(height - r)}`,
		`A${round(r)},${round(r)} 0 0 1 ${round(width - r)},${round(height)}`,
		`H${round(r)}`,
		`A${round(r)},${round(r)} 0 0 1 0,${round(height - r)}`,
		`V${round(r)}`,
		`A${round(r)},${round(r)} 0 0 1 ${round(r)},0`,
		'Z',
	].join(' ');
};

const ellipsePath = (width: number, height: number): string => {
	const rx = width / 2;
	const ry = height / 2;
	return [
		`M0,${round(ry)}`,
		`A${round(rx)},${round(ry)} 0 0 1 ${round(width)},${round(ry)}`,
		`A${round(rx)},${round(ry)} 0 0 1 0,${round(ry)}`,
		'Z',
	].join(' ');
};

/** A heart, drawn from the classic two-lobe curve scaled to the box. */
const heartPath = (width: number, height: number): string => {
	const x = (value: number) => round(value * width);
	const y = (value: number) => round(value * height);

	return [
		`M${x(0.5)},${y(1)}`,
		`C${x(0.16)},${y(0.76)} 0,${y(0.52)} 0,${y(0.32)}`,
		`C0,${y(0.12)} ${x(0.19)},${y(0)} ${x(0.35)},${y(0)}`,
		`C${x(0.43)},${y(0)} ${x(0.48)},${y(0.05)} ${x(0.5)},${y(0.12)}`,
		`C${x(0.52)},${y(0.05)} ${x(0.57)},${y(0)} ${x(0.65)},${y(0)}`,
		`C${x(0.81)},${y(0)} ${x(1)},${y(0.12)} ${x(1)},${y(0.32)}`,
		`C${x(1)},${y(0.52)} ${x(0.84)},${y(0.76)} ${x(0.5)},${y(1)}`,
		'Z',
	].join(' ');
};

/**
 * How far the drawing is pulled in from the edges: half the stroke, which is
 * centered on the path, so a stroked shape is never cut off by the block.
 */
export const shapeInset = (strokeWidth: number): number => strokeWidth / 2;

/**
 * The `d` of a shape drawn from the origin in a box already shrunk by the
 * stroke width. The caller offsets it by `shapeInset`.
 */
export const shapePath = (
	kind: ShapeKind,
	geometry: Partial<ShapeGeometry> = {},
	strokeWidth = 0,
): string => {
	const { width, height, cornerRadius, sides, points, innerRadius } = {
		...DEFAULT_GEOMETRY,
		...geometry,
	};

	const w = Math.max(1, width - strokeWidth);
	const h = Math.max(1, height - strokeWidth);

	switch (kind) {
		case 'line':
			return `M0,${round(h / 2)} L${round(w)},${round(h / 2)}`;
		case 'arrow': {
			const head = Math.max(strokeWidth * 3, Math.min(w, h) * 0.25);
			const mid = h / 2;
			return [
				`M0,${round(mid)} L${round(w)},${round(mid)}`,
				`M${round(w - head)},${round(mid - head * 0.6)}`,
				`L${round(w)},${round(mid)}`,
				`L${round(w - head)},${round(mid + head * 0.6)}`,
			].join(' ');
		}
		case 'rectangle':
			return roundedRectPath(w, h, cornerRadius);
		case 'ellipse':
			return ellipsePath(w, h);
		case 'heart':
			return heartPath(w, h);
		case 'triangle':
			return polygon(regularPolygonPoints(w, h, 3));
		case 'polygon':
			return polygon(
				regularPolygonPoints(w, h, Math.max(3, Math.round(sides))),
			);
		case 'star':
			return polygon(
				regularPolygonPoints(
					w,
					h,
					Math.max(3, Math.round(points)),
					Math.min(0.95, Math.max(0.05, innerRadius / 100)),
				),
			);
		default:
			return '';
	}
};

export const SHAPE_OPTIONS: ReadonlyArray<{
	value: ShapeKind;
	label: string;
}> = [
	{ value: 'rectangle', label: 'Rectangle' },
	{ value: 'ellipse', label: 'Ellipse' },
	{ value: 'triangle', label: 'Triangle' },
	{ value: 'polygon', label: 'Polygon' },
	{ value: 'star', label: 'Star' },
	{ value: 'heart', label: 'Heart' },
	{ value: 'line', label: 'Line' },
	{ value: 'arrow', label: 'Arrow' },
];

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

/** `stroke-dasharray` for a stroke style at a given width. */
export const strokeDashArray = (
	style: StrokeStyle,
	strokeWidth: number,
): string | undefined => {
	switch (style) {
		case 'dashed':
			return `${strokeWidth * 3} ${strokeWidth * 2}`;
		case 'dotted':
			return `0 ${strokeWidth * 2}`;
		default:
			return undefined;
	}
};
