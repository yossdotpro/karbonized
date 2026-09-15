import { useControlsStore, useHistoryStore, useWorkspaceStore } from '@/stores';
import type { Item } from '@/types';
import {
	type Alignment,
	type Box,
	type DistributeAxis,
	type Position,
	alignBoxes,
	distributeBoxes,
} from './arrange';

/**
 * Canvas selection helpers shared by commands, menus and panels.
 */

const currentControls = (): Item[] =>
	(useWorkspaceStore.getState().currentWorkspace?.controls ?? []).filter(
		(item) => !item.isDeleted,
	);

/** Selected controls that can be moved (visible, unlocked, not groups). */
export const getMovableSelection = (): Item[] => {
	const { selectedControlIDs } = useControlsStore.getState();
	const controls = currentControls();

	return selectedControlIDs
		.map((id) => controls.find((item) => item.id === id))
		.filter(
			(item): item is Item =>
				item !== undefined &&
				item.type !== 'group' &&
				!item.locked &&
				item.isVisible !== false,
		);
};

/** Layout box of a block, in canvas pixels, read from the rendered element. */
export const readBox = (id: string): Box | null => {
	const element = document.getElementById(id);
	if (!element) return null;

	return {
		id,
		x: parseFloat(element.style.left) || 0,
		y: parseFloat(element.style.top) || 0,
		width: element.offsetWidth,
		height: element.offsetHeight,
	};
};

export const getSelectedBoxes = (): Box[] =>
	getMovableSelection()
		.map((item) => readBox(item.id))
		.filter((box): box is Box => box !== null);

/** Move blocks to new positions as a single undoable step. */
export const applyPositions = (positions: Position[]): void => {
	const changes = positions
		.map((position) => {
			const box = readBox(position.id);
			if (!box || (box.x === position.x && box.y === position.y)) return null;

			return {
				id: `${position.id}-pos`,
				previous: { x: box.x, y: box.y },
				next: { x: position.x, y: position.y },
			};
		})
		.filter((change) => change !== null);

	if (changes.length === 0) return;

	useHistoryStore.getState().commitBatch(changes);

	const { currentControlID, setControlPosition } = useControlsStore.getState();
	const primary = changes.find(
		(change) => change.id === `${currentControlID}-pos`,
	);
	if (primary) setControlPosition(primary.next);
};

export const alignSelection = (alignment: Alignment): void => {
	const boxes = getSelectedBoxes();
	if (boxes.length === 0) return;

	const workspace = useWorkspaceStore.getState().currentWorkspace;
	// A single block aligns to the canvas, several align to each other.
	const frame =
		boxes.length === 1 && workspace
			? {
					left: 0,
					top: 0,
					right: parseFloat(workspace.workspaceWidth),
					bottom: parseFloat(workspace.workspaceHeight),
				}
			: undefined;

	applyPositions(alignBoxes(boxes, alignment, frame));
};

export const distributeSelection = (axis: DistributeAxis): void => {
	const boxes = getSelectedBoxes();
	if (boxes.length < 3) return;

	applyPositions(distributeBoxes(boxes, axis));
};

/** Move every selected block by an offset (arrow keys). */
export const nudgeSelection = (dx: number, dy: number): void => {
	applyPositions(
		getSelectedBoxes().map((box) => ({
			id: box.id,
			x: box.x + dx,
			y: box.y + dy,
		})),
	);
};

export const selectAllControls = (): void => {
	useControlsStore.getState().setSelection(
		currentControls()
			.filter(
				(item) =>
					item.type !== 'group' && !item.locked && item.isVisible !== false,
			)
			.map((item) => item.id),
	);
};
