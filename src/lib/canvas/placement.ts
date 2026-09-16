/**
 * Where a new block lands.
 *
 * Blocks used to appear at a fixed spot, which fell outside the view as soon
 * as the canvas was panned or zoomed. They now land in the middle of what the
 * editor is showing, and step aside when that spot is taken.
 */

export interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface Point {
	x: number;
	y: number;
}

/** Where blocks land when the canvas is not on screen (tests, tools). */
export const DEFAULT_POSITION: Point = { x: 33, y: 190 };

/** How far a block steps aside when its spot is taken. */
export const CASCADE_STEP = 24;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

/**
 * Top left corner, in canvas pixels, that centers a block of `block` size in
 * the part of the canvas the viewport shows.
 *
 * `canvas` is the canvas as it appears on screen (so its width includes the
 * zoom), `viewport` is the visible area, both in screen pixels.
 */
export const centerOfView = (
	viewport: Rect,
	canvas: Rect,
	canvasSize: Size,
	block: Size,
): Point => {
	const scale = canvas.width > 0 ? canvas.width / canvasSize.width : 1;

	// The visible part of the canvas, in screen pixels.
	const left = Math.max(viewport.left, canvas.left);
	const top = Math.max(viewport.top, canvas.top);
	const right = Math.min(
		viewport.left + viewport.width,
		canvas.left + canvas.width,
	);
	const bottom = Math.min(
		viewport.top + viewport.height,
		canvas.top + canvas.height,
	);

	// The canvas is off screen: fall back to its own center.
	const centerX =
		right > left ? (left + right) / 2 : canvas.left + canvas.width / 2;
	const centerY =
		bottom > top ? (top + bottom) / 2 : canvas.top + canvas.height / 2;

	const position = {
		x: Math.round((centerX - canvas.left) / scale - block.width / 2),
		y: Math.round((centerY - canvas.top) / scale - block.height / 2),
	};

	// A block always starts inside the canvas, however far it is panned.
	return {
		x: clamp(position.x, 0, Math.max(0, canvasSize.width - block.width)),
		y: clamp(position.y, 0, Math.max(0, canvasSize.height - block.height)),
	};
};

/**
 * `position`, moved down and right until no block sits there, so blocks added
 * one after another do not pile up on the same pixel.
 */
export const cascadePosition = (
	position: Point,
	taken: readonly Point[],
	canvasSize: Size,
	block: Size,
): Point => {
	const isTaken = (point: Point) =>
		taken.some(
			(other) =>
				Math.abs(other.x - point.x) < 1 && Math.abs(other.y - point.y) < 1,
		);

	let next = position;
	for (let step = 0; step < taken.length + 1 && isTaken(next); step += 1) {
		next = {
			x: position.x + CASCADE_STEP * (step + 1),
			y: position.y + CASCADE_STEP * (step + 1),
		};

		// Start over from the top left corner rather than leave the canvas.
		if (
			next.x + block.width > canvasSize.width ||
			next.y + block.height > canvasSize.height
		) {
			next = { x: 0, y: 0 };
			break;
		}
	}

	return next;
};

/** Rect of an element in screen pixels, or null when it is not on screen. */
const rectOf = (element: Element | null): Rect | null => {
	if (!element) return null;
	const rect = element.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0
		? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
		: null;
};

/**
 * Where to put a block so it lands in the middle of what the editor shows,
 * or `null` when the canvas is not on screen (tools, tests).
 */
export const viewCenterPlacement = (
	canvasSize: Size,
	block: Size,
): Point | null => {
	if (typeof document === 'undefined') return null;

	const canvas = rectOf(document.getElementById('workspace'));
	const viewport =
		rectOf(document.querySelector('.viewer')) ??
		(typeof window === 'undefined'
			? null
			: {
					left: 0,
					top: 0,
					width: window.innerWidth,
					height: window.innerHeight,
				});

	if (!canvas || !viewport) return null;

	return centerOfView(viewport, canvas, canvasSize, block);
};
