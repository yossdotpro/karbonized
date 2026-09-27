/**
 * Alignment and distribution math for canvas blocks.
 *
 * Pure functions over axis-aligned boxes in canvas pixels (rotation is
 * ignored, like most design tools do for these operations).
 */

export interface Box {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export type Alignment =
	'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export type DistributeAxis = 'horizontal' | 'vertical';

export interface Position {
	id: string;
	x: number;
	y: number;
}

export interface Bounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export const getBounds = (boxes: Box[]): Bounds => ({
	left: Math.min(...boxes.map((box) => box.x)),
	top: Math.min(...boxes.map((box) => box.y)),
	right: Math.max(...boxes.map((box) => box.x + box.width)),
	bottom: Math.max(...boxes.map((box) => box.y + box.height)),
});

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Align boxes to each other, or to `frame` (e.g. the canvas) when given.
 * A single box is always aligned to the frame.
 */
export const alignBoxes = (
	boxes: Box[],
	alignment: Alignment,
	frame?: Bounds,
): Position[] => {
	if (boxes.length === 0) return [];

	const target = frame ?? getBounds(boxes);
	const centerX = (target.left + target.right) / 2;
	const centerY = (target.top + target.bottom) / 2;

	return boxes.map((box) => {
		let { x, y } = box;

		switch (alignment) {
			case 'left':
				x = target.left;
				break;
			case 'center':
				x = centerX - box.width / 2;
				break;
			case 'right':
				x = target.right - box.width;
				break;
			case 'top':
				y = target.top;
				break;
			case 'middle':
				y = centerY - box.height / 2;
				break;
			case 'bottom':
				y = target.bottom - box.height;
				break;
		}

		return { id: box.id, x: round(x), y: round(y) };
	});
};

/**
 * Space boxes evenly between the outermost ones. Needs at least three boxes;
 * the first and last keep their position.
 */
export const distributeBoxes = (
	boxes: Box[],
	axis: DistributeAxis,
): Position[] => {
	if (boxes.length < 3) {
		return boxes.map(({ id, x, y }) => ({ id, x, y }));
	}

	const horizontal = axis === 'horizontal';
	const start = (box: Box) => (horizontal ? box.x : box.y);
	const length = (box: Box) => (horizontal ? box.width : box.height);

	const sorted = [...boxes].sort((a, b) => start(a) - start(b));
	const first = sorted[0];
	const last = sorted[sorted.length - 1];

	const span = start(last) + length(last) - start(first);
	const occupied = sorted.reduce((total, box) => total + length(box), 0);
	const gap = (span - occupied) / (sorted.length - 1);

	let cursor = start(first);
	const positions = new Map<string, Position>();

	sorted.forEach((box) => {
		positions.set(
			box.id,
			horizontal
				? { id: box.id, x: round(cursor), y: box.y }
				: { id: box.id, x: box.x, y: round(cursor) },
		);
		cursor += length(box) + gap;
	});

	// Return in the original order.
	return boxes.map((box) => positions.get(box.id)!);
};
