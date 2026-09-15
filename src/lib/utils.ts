import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getRandomNumber } from '../utils/getRandom';
import type {
	Item,
	LayerSnapshot,
	LayerMovePosition,
	LayerStepDirection,
	LayerEdgePosition,
} from '../types';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const cloneControls = (controls: Item[]): Item[] =>
	controls.map((item) => ({ ...item }));

export const normalizeParentId = (value?: string | null): string | null =>
	value ?? null;

export const getWorkspaceHistoryId = (workspaceId: string): string =>
	`workspace-structure-${workspaceId}`;

export const getChildren = (
	controls: Item[],
	parentId?: string | null,
): Item[] =>
	controls.filter(
		(item) => normalizeParentId(item.parentId) === normalizeParentId(parentId),
	);

export const getSubtreeIds = (controls: Item[], rootId: string): string[] => {
	const children = getChildren(controls, rootId);
	return [
		rootId,
		...children.flatMap((child) => getSubtreeIds(controls, child.id)),
	];
};

export const moveItemBlock = (
	controls: Item[],
	draggedId: string,
	targetId: string,
	position: LayerMovePosition,
): Item[] => {
	if (draggedId === targetId) return controls;

	const draggedIds = new Set(getSubtreeIds(controls, draggedId));
	if (draggedIds.has(targetId)) return controls;

	const draggedBlock = controls.filter((item) => draggedIds.has(item.id));
	const remaining = controls.filter((item) => !draggedIds.has(item.id));
	const target = remaining.find((item) => item.id === targetId);

	if (draggedBlock.length === 0 || target === undefined) return controls;

	const nextParentId =
		position === 'inside' ? target.id : normalizeParentId(target.parentId);

	const updatedBlock = draggedBlock.map((item) =>
		item.id === draggedId ? { ...item, parentId: nextParentId } : item,
	);

	let insertAt = remaining.length;

	if (position === 'before') {
		insertAt = remaining.findIndex((item) => item.id === targetId);
	} else {
		const targetSubtreeIds = new Set(getSubtreeIds(remaining, targetId));
		const lastIndex = remaining.reduce(
			(acc, item, index) => (targetSubtreeIds.has(item.id) ? index : acc),
			-1,
		);
		insertAt = lastIndex + 1;
	}

	if (insertAt < 0) return controls;

	return [
		...remaining.slice(0, insertAt),
		...updatedBlock,
		...remaining.slice(insertAt),
	];
};

export const reorderAmongSiblings = (
	controls: Item[],
	controlId: string,
	direction: LayerStepDirection,
): Item[] => {
	const current = controls.find((item) => item.id === controlId);
	if (current === undefined) return controls;

	const siblings = controls.filter(
		(item) =>
			!item.isDeleted &&
			normalizeParentId(item.parentId) ===
				normalizeParentId(current.parentId) &&
			item.id !== controlId,
	);
	const currentSiblings = controls.filter(
		(item) =>
			!item.isDeleted &&
			normalizeParentId(item.parentId) === normalizeParentId(current.parentId),
	);
	const index = currentSiblings.findIndex((item) => item.id === controlId);

	if (index === -1) return controls;
	if (direction === 'backward' && index === 0) return controls;
	if (direction === 'forward' && index === currentSiblings.length - 1)
		return controls;

	const target =
		direction === 'backward'
			? currentSiblings[index - 1]
			: currentSiblings[index + 1];

	if (target === undefined) return controls;

	return moveItemBlock(
		controls,
		controlId,
		target.id,
		direction === 'backward' ? 'before' : 'after',
	);
};

export const moveToSiblingEdge = (
	controls: Item[],
	controlId: string,
	position: LayerEdgePosition,
): Item[] => {
	const current = controls.find((item) => item.id === controlId);
	if (current === undefined) return controls;

	const siblings = controls.filter(
		(item) =>
			!item.isDeleted &&
			normalizeParentId(item.parentId) === normalizeParentId(current.parentId),
	);
	if (siblings.length < 2) return controls;

	const target =
		position === 'back' ? siblings[0] : siblings[siblings.length - 1];

	if (target.id === controlId) return controls;

	return moveItemBlock(
		controls,
		controlId,
		target.id,
		position === 'back' ? 'before' : 'after',
	);
};

export const createLayerSnapshot = (
	controls: Item[],
	currentControlID: string,
): LayerSnapshot => {
	return {
		controls: cloneControls(controls),
		currentControlID,
	};
};

export const generateNewId = (type: string): string =>
	`${type}-${getRandomNumber()}`;
