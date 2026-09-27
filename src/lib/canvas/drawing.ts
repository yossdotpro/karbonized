/**
 * Drawing a shape by dragging on the canvas.
 *
 * The pointer lives in screen pixels and the canvas in its own, which the
 * zoom scales; these helpers do the conversion and turn a drag into the box
 * of the new block.
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

export interface Size {
	width: number;
	height: number;
}

export interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

/** A drag shorter than this is a click: the shape takes its default size. */
export const CLICK_THRESHOLD = 6;

/** Where a pointer is, in canvas pixels. */
export const toCanvasPoint = (
	pointer: { clientX: number; clientY: number },
	canvas: Rect,
	canvasSize: Size,
): Point => {
	const scale = canvas.width > 0 ? canvas.width / canvasSize.width : 1;

	return {
		x: (pointer.clientX - canvas.left) / scale,
		y: (pointer.clientY - canvas.top) / scale,
	};
};

export interface DragModifiers {
	/** Shift: the box keeps a 1:1 ratio. */
	square?: boolean;
	/** Alt: the box grows from where the drag started. */
	fromCenter?: boolean;
}

/**
 * The box of a drag from `start` to `current`, in canvas pixels, kept inside
 * the canvas. Dragging in any direction works: the box is normalized.
 */
export const boxFromDrag = (
	start: Point,
	current: Point,
	canvasSize: Size,
	{ square = false, fromCenter = false }: DragModifiers = {},
): Box => {
	let dx = current.x - start.x;
	let dy = current.y - start.y;

	if (square) {
		const side = Math.max(Math.abs(dx), Math.abs(dy));
		dx = Math.sign(dx || 1) * side;
		dy = Math.sign(dy || 1) * side;
	}

	const box = fromCenter
		? {
				x: start.x - Math.abs(dx),
				y: start.y - Math.abs(dy),
				width: Math.abs(dx) * 2,
				height: Math.abs(dy) * 2,
			}
		: {
				x: Math.min(start.x, start.x + dx),
				y: Math.min(start.y, start.y + dy),
				width: Math.abs(dx),
				height: Math.abs(dy),
			};

	const left = Math.max(0, Math.min(box.x, canvasSize.width));
	const top = Math.max(0, Math.min(box.y, canvasSize.height));

	return {
		x: Math.round(left),
		y: Math.round(top),
		width: Math.round(Math.min(box.width, canvasSize.width - left)),
		height: Math.round(Math.min(box.height, canvasSize.height - top)),
	};
};

/** Whether a drag is long enough to be a shape of its own size. */
export const isDrawn = (box: Box): boolean =>
	box.width >= CLICK_THRESHOLD && box.height >= CLICK_THRESHOLD;
