import { useControlsStore, useHistoryStore, useWorkspaceStore } from '@/stores';
import {
	pickWorkspaceSettings,
	type WorkspaceSettings,
} from '@/stores/workspace-store';
import type { History, Item, Workspace } from '@/types';
import { type Alignment, type DistributeAxis } from '@/lib/canvas/arrange';
import {
	alignSelection,
	distributeSelection,
	readBox,
} from '@/lib/canvas/selection';
import { cascadePosition, viewCenterPlacement } from '@/lib/canvas/placement';
import { generateNewId } from '@/lib/utils';
import { useViewStore } from '@/lib/viewer';
import { getRandomNumber } from '@/utils/getRandom';
import { isTextSizing, sizingForSize } from '@/lib/blocks/text-sizing';
import {
	HTML_BLOCK_CODE_KEYS,
	getBlockProperties,
	getBlockType,
	propertyId,
} from '@/lib/blocks/catalog';
import {
	defaultCSSContent,
	defaultHTMLContent,
	defaultJSContent,
} from '@/lib/blocks-api/default-content';

/**
 * Editor actions that take arguments: the layer shared by Beedly, the MCP
 * server and any UI that needs to change blocks programmatically.
 *
 * Every mutation goes through the history store, so it can be undone. Wrap a
 * sequence of actions in `useHistoryStore.getState().transaction()` to undo it
 * in one step.
 */

export class EditorActionError extends Error {}

/** Where `ControlTemplate` puts a block whose position was never stored. */
const DEFAULT_POSITION = { x: 33, y: 190 };

/**
 * Where a new block goes when the caller gave no position: the middle of what
 * the editor shows, stepping aside from blocks already there. Falls back to
 * the middle of the canvas when it is not on screen.
 */
const placeNewBlock = (
	canvas: { width: number; height: number },
	block: { width: number; height: number },
	workspace: Workspace,
): { x: number; y: number } => {
	const base = viewCenterPlacement(canvas, block) ?? {
		x: Math.round((canvas.width - block.width) / 2),
		y: Math.round((canvas.height - block.height) / 2),
	};

	const taken = liveControls(workspace).flatMap((item) => {
		const stored = readProperty(propertyId(item.id, 'pos')).value as
			{ x: number; y: number } | undefined;
		return stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)
			? [stored]
			: [];
	});

	return cascadePosition(base, taken, canvas, block);
};

const HTML_CODE_DEFAULTS: Record<string, string> = {
	html: defaultHTMLContent,
	css: defaultCSSContent,
	js: defaultJSContent,
};

export interface BlockBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface BlockSummary extends BlockBox {
	id: string;
	type: string;
	name: string;
	parentId: string | null;
	visible: boolean;
	locked: boolean;
	/** In-plane rotation in degrees. */
	rotation: number;
	/** How much is cut away on each side, in percent. */
	crop: BlockCrop;
	/** Properties that differ from their defaults. */
	properties: Record<string, unknown>;
}

export interface WorkspaceSummary {
	id: string;
	name: string;
	width: number;
	height: number;
	background: WorkspaceSettings;
	selection: string[];
	/** Guides dragged out of the rulers, in canvas pixels. */
	guides: { vertical: number[]; horizontal: number[] };
	blocks: BlockSummary[];
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

export const requireWorkspace = (): Workspace => {
	const workspace = useWorkspaceStore.getState().currentWorkspace;
	if (!workspace) {
		throw new EditorActionError(
			'No workspace is open. Create one with create_workspace.',
		);
	}
	return workspace;
};

const liveControls = (workspace: Workspace): Item[] =>
	workspace.controls.filter((item) => !item.isDeleted);

export const requireBlock = (id: string): Item => {
	const block = liveControls(requireWorkspace()).find((item) => item.id === id);
	if (!block) throw new EditorActionError(`Block "${id}" does not exist.`);
	return block;
};

/** Current stored value of a property, pending initial values included. */
export const readProperty = (
	id: string,
): { found: boolean; value: unknown } => {
	const { ControlProperties, initialProperties } = useControlsStore.getState();
	const property =
		ControlProperties.find((item) => item.id === id) ??
		initialProperties.find((item) => item.id === id);

	return property
		? { found: true, value: property.value }
		: { found: false, value: undefined };
};

const defaultPropertyValue = (block: Item, key: string): unknown => {
	if (key === 'pos') return DEFAULT_POSITION;
	if (key === 'control_size') {
		const size = getBlockType(block.type)?.defaultSize;
		return size ? { w: size.width, h: size.height } : { w: 80, h: 50 };
	}
	if (key === 'transform') return '';
	if (key === 'clip') return '';
	if (block.type === 'html' && key in HTML_CODE_DEFAULTS) {
		return HTML_CODE_DEFAULTS[key];
	}
	return getBlockProperties(block.type).find((spec) => spec.key === key)
		?.default;
};

const propertyValue = (block: Item, key: string): unknown => {
	const stored = readProperty(propertyId(block.id, key));
	return stored.found ? stored.value : defaultPropertyValue(block, key);
};

/** How much of a block is cut away on each side, in percent. */
export interface BlockCrop {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

const NO_CROP: BlockCrop = { top: 0, right: 0, bottom: 0, left: 0 };

/** The crop stored on a block, read from its `inset()` clip path. */
export const parseCrop = (clip: unknown): BlockCrop => {
	if (typeof clip !== 'string') return NO_CROP;

	const match = /inset\(([^)]+)\)/.exec(clip);
	if (!match) return NO_CROP;

	const values = match[1]
		.trim()
		.split(/\s+/)
		.map((value) => parseFloat(value))
		.filter((value) => Number.isFinite(value));

	if (values.length === 0) return NO_CROP;

	// CSS shorthand: one, two, three or four sides.
	const [top, right = top, bottom = top, left = right] = values;
	return { top, right, bottom, left };
};

/** The clip path for a crop, in percentages, so it survives resizing. */
export const cropToClip = (crop: Partial<BlockCrop>): string => {
	const sides = { ...NO_CROP, ...crop };
	const clamp = (value: number) =>
		Math.round(Math.min(100, Math.max(0, value)) * 100) / 100;
	const values = [sides.top, sides.right, sides.bottom, sides.left].map(clamp);

	return values.every((value) => value === 0)
		? ''
		: `inset(${values.map((value) => `${value}%`).join(' ')})`;
};

/** Whether a transform was written by the warp tool, which is a matrix. */
export const isWarped = (transform: unknown): boolean =>
	typeof transform === 'string' && /matrix3?d?\(/.test(transform);

export const parseRotation = (transform: unknown): number => {
	if (typeof transform !== 'string') return 0;

	const match = /rotate\((-?[\d.]+)deg\)/.exec(transform);
	if (match) return parseFloat(match[1]);

	// The warp tool stores a matrix: read the angle of its first column, so
	// blocks still report how far they are turned.
	const matrix = /matrix(3d)?\(([^)]+)\)/.exec(transform);
	if (!matrix) return 0;

	// The first column of both matrix() and matrix3d() is the rotated x axis.
	const [a, b] = matrix[2].split(',').map((value) => parseFloat(value));
	if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;

	const degrees = (Math.atan2(b, a) * 180) / Math.PI;
	return Math.round(degrees * 100) / 100;
};

export const withRotation = (transform: unknown, degrees: number): string => {
	// A warped block has its rotation baked into the matrix; replacing the
	// whole transform is the only way to give it a plain angle again.
	const base =
		typeof transform === 'string' && !isWarped(transform) ? transform : '';
	const rotate = `rotate(${Math.round(degrees * 100) / 100}deg)`;
	return /rotate\([^)]*\)/.test(base)
		? base.replace(/rotate\([^)]*\)/, rotate)
		: `${base} ${rotate}`.trim();
};

/** Box of a block: the rendered element when mounted, else its properties. */
export const getBlockBox = (block: Item): BlockBox => {
	const rendered = readBox(block.id);
	if (rendered) {
		return {
			x: rendered.x,
			y: rendered.y,
			width: rendered.width,
			height: rendered.height,
		};
	}

	const position = propertyValue(block, 'pos') as { x: number; y: number };
	const size = propertyValue(block, 'control_size') as { w: number; h: number };
	return {
		x: Number(position.x),
		y: Number(position.y),
		width: Number(size.w),
		height: Number(size.h),
	};
};

export const summarizeBlock = (block: Item): BlockSummary => {
	const properties: Record<string, unknown> = {};
	getBlockProperties(block.type).forEach((spec) => {
		const stored = readProperty(propertyId(block.id, spec.key));
		if (stored.found && stored.value !== spec.default) {
			properties[spec.key] = stored.value;
		}
	});

	return {
		id: block.id,
		type: block.type,
		name: block.name,
		parentId: block.parentId ?? null,
		visible: block.isVisible !== false,
		locked: block.locked === true,
		...getBlockBox(block),
		rotation: parseRotation(propertyValue(block, 'transform')),
		crop: parseCrop(propertyValue(block, 'clip')),
		properties,
	};
};

export const getWorkspaceSummary = (): WorkspaceSummary => {
	const workspace = requireWorkspace();

	return {
		id: workspace.id,
		name: workspace.workspaceName,
		width: parseFloat(workspace.workspaceWidth),
		height: parseFloat(workspace.workspaceHeight),
		background: pickWorkspaceSettings(workspace),
		selection: useControlsStore.getState().selectedControlIDs,
		guides: useViewStore.getState().guides,
		blocks: liveControls(workspace).map(summarizeBlock),
	};
};

/**
 * Replace the guides of the canvas. A list left out is kept as it is, and an
 * empty list clears that axis.
 */
export const setGuides = (input: {
	vertical?: number[];
	horizontal?: number[];
}): { vertical: number[]; horizontal: number[] } => {
	const workspace = requireWorkspace();
	const width = parseFloat(workspace.workspaceWidth);
	const height = parseFloat(workspace.workspaceHeight);
	const view = useViewStore.getState();

	const inside = (values: number[], size: number) =>
		values
			.filter((value) => Number.isFinite(value) && value >= 0 && value <= size)
			.map((value) => Math.round(value));

	const next = {
		vertical:
			input.vertical === undefined
				? view.guides.vertical
				: inside(input.vertical, width),
		horizontal:
			input.horizontal === undefined
				? view.guides.horizontal
				: inside(input.horizontal, height),
	};

	view.clearGuides();
	next.vertical.forEach((position) => {
		useViewStore.getState().addGuide('vertical', position);
	});
	next.horizontal.forEach((position) => {
		useViewStore.getState().addGuide('horizontal', position);
	});

	return next;
};

export const getHtmlBlockCode = (
	id: string,
): { html: string; css: string; js: string } => {
	const block = requireBlock(id);
	if (block.type !== 'html') {
		throw new EditorActionError(`Block "${id}" is not an HTML block.`);
	}

	const [html, css, js] = HTML_BLOCK_CODE_KEYS.map((key) =>
		String(propertyValue(block, key)),
	);
	return { html, css, js };
};

/* -------------------------------------------------------------------------- */
/* Properties                                                                 */
/* -------------------------------------------------------------------------- */

const isMounted = (blockId: string) =>
	typeof document !== 'undefined' && document.getElementById(blockId) !== null;

/**
 * Set properties of one block as a single undoable step.
 *
 * A mounted block picks the values up from the history batch and the
 * properties store. A block that has not mounted yet (just added, or still
 * loading) consumes them from `initialProperties` when it does.
 */
export const setBlockProperties = (
	blockId: string,
	values: Record<string, unknown>,
): void => {
	const block = requireBlock(blockId);
	const entries = Object.entries(values);
	if (entries.length === 0) return;

	const controls = useControlsStore.getState();
	const workspaceId = useWorkspaceStore.getState().currentWorkspaceID;

	if (!isMounted(blockId)) {
		const ids = new Set(entries.map(([key]) => propertyId(blockId, key)));
		useControlsStore.setState({
			initialProperties: [
				...controls.initialProperties.filter((item) => !ids.has(item.id)),
				...entries.map(([key, value]) => ({
					id: propertyId(blockId, key),
					value,
					workspace: workspaceId,
				})),
			],
		});
		return;
	}

	const changes = entries
		.map(([key, value]) => ({
			id: propertyId(blockId, key),
			previous: propertyValue(block, key),
			next: value,
		}))
		.filter(
			(change) =>
				JSON.stringify(change.previous) !== JSON.stringify(change.next),
		);
	if (changes.length === 0) return;

	// Write the store too: when several batches are committed in the same tick
	// only the last one reaches the blocks through `controlState`.
	const byId = new Map<string, History>(
		controls.ControlProperties.map((item) => [item.id, item]),
	);
	changes.forEach((change) =>
		byId.set(change.id, {
			id: change.id,
			value: change.next,
			workspace: workspaceId,
		}),
	);
	useControlsStore.setState({ ControlProperties: Array.from(byId.values()) });
	useHistoryStore.getState().commitBatch(changes);

	// Moveable reads the selected block's box from the shared editor state.
	if (controls.currentControlID === blockId) {
		changes.forEach((change) => {
			if (change.id.endsWith('-pos')) {
				controls.setControlPosition(change.next as { x: number; y: number });
			} else if (change.id.endsWith('-control_size')) {
				controls.setControlSize(change.next as { w: number; h: number });
			} else if (change.id.endsWith('-transform')) {
				controls.setControlTransform(change.next as string);
			}
		});
	}
};

/* -------------------------------------------------------------------------- */
/* Blocks                                                                     */
/* -------------------------------------------------------------------------- */

export interface BlockGeometry {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	rotation?: number;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const geometryProperties = (
	block: Item,
	geometry: BlockGeometry,
): Record<string, unknown> => {
	const values: Record<string, unknown> = {};
	const spec = getBlockType(block.type);
	const box =
		geometry.x !== undefined ||
		geometry.y !== undefined ||
		geometry.width !== undefined ||
		geometry.height !== undefined
			? getBlockBox(block)
			: undefined;

	if (box && (geometry.x !== undefined || geometry.y !== undefined)) {
		values.pos = {
			x: Math.round(geometry.x ?? box.x),
			y: Math.round(geometry.y ?? box.y),
		};
	}

	if (box && (geometry.width !== undefined || geometry.height !== undefined)) {
		const width = geometry.width ?? box.width;
		const height = geometry.height ?? box.height;
		values.control_size = {
			w: Math.round(
				spec ? clamp(width, spec.minSize.width, spec.maxSize.width) : width,
			),
			h: Math.round(
				spec ? clamp(height, spec.minSize.height, spec.maxSize.height) : height,
			),
		};
	}

	if (geometry.rotation !== undefined) {
		values.transform = withRotation(
			propertyValue(block, 'transform'),
			geometry.rotation,
		);
	}

	return values;
};

export interface AddBlockInput extends BlockGeometry {
	type: string;
	name?: string;
	properties?: Record<string, unknown>;
}

/** Add a block (centered on the canvas by default) and select it. */
export const addBlock = (input: AddBlockInput): Item => {
	const workspace = requireWorkspace();
	const spec = getBlockType(input.type);
	if (!spec) {
		throw new EditorActionError(`Unknown block type "${input.type}".`);
	}

	const count = workspace.controls.filter(
		(item) => item.type === input.type,
	).length;
	const block: Item = {
		id: generateNewId(input.type),
		type: input.type,
		name: input.name?.trim() || `${spec.label.toLowerCase()} ${count + 1}`,
		isSelectable: true,
		isDeleted: false,
		isVisible: true,
	};

	// New text blocks fit their text once rendered; estimate that box now so
	// they can be centered.
	const fitted =
		input.type === 'text' &&
		input.width === undefined &&
		input.height === undefined
			? estimateTextSize(
					String(input.properties?.text ?? 'lorem'),
					Number(input.properties?.textSize ?? 24),
					input.properties?.isBold === true,
				)
			: undefined;

	const width = clamp(
		input.width ?? fitted?.width ?? spec.defaultSize.width,
		spec.minSize.width,
		spec.maxSize.width,
	);
	const height = clamp(
		input.height ?? fitted?.height ?? spec.defaultSize.height,
		spec.minSize.height,
		spec.maxSize.height,
	);
	const canvasWidth = parseFloat(workspace.workspaceWidth);
	const canvasHeight = parseFloat(workspace.workspaceHeight);

	const placed =
		input.x === undefined || input.y === undefined
			? placeNewBlock(
					{ width: canvasWidth, height: canvasHeight },
					{ width, height },
					workspace,
				)
			: undefined;

	const initial: Record<string, unknown> = {
		...input.properties,
		pos: {
			x: Math.round(input.x ?? placed?.x ?? (canvasWidth - width) / 2),
			y: Math.round(input.y ?? placed?.y ?? (canvasHeight - height) / 2),
		},
		control_size: { w: Math.round(width), h: Math.round(height) },
	};
	if (input.rotation !== undefined) {
		initial.transform = withRotation('', input.rotation);
	}
	if (input.type === 'text' && !isTextSizing(input.properties?.sizing)) {
		initial.sizing = sizingForSize('auto', input);
	}

	const controls = useControlsStore.getState();
	// Pending before the block exists, so it mounts with them.
	Object.entries(initial).forEach(([key, value]) =>
		controls.addInitialProperty(
			{ id: propertyId(block.id, key), value },
			workspace.id,
		),
	);
	controls.addControl(block, workspace.id);

	return block;
};

export interface UpdateBlockInput extends BlockGeometry {
	name?: string;
	/** Cut away part of the block, in percent of its size. */
	crop?: Partial<BlockCrop>;
	visible?: boolean;
	locked?: boolean;
	properties?: Record<string, unknown>;
}

export const updateBlock = (id: string, input: UpdateBlockInput): void => {
	const block = requireBlock(id);
	const controls = useControlsStore.getState();

	if (input.name !== undefined && input.name.trim() !== block.name) {
		controls.renameControl({ id, name: input.name }, requireWorkspace());
	}
	if (input.visible !== undefined && input.visible !== block.isVisible) {
		controls.toggleControlVisibility(id, requireWorkspace());
	}
	if (input.locked !== undefined && input.locked !== (block.locked === true)) {
		controls.toggleControlLock(id, requireWorkspace());
	}

	const properties = { ...input.properties };
	if (input.crop !== undefined) {
		properties.clip = cropToClip({
			...parseCrop(propertyValue(block, 'clip')),
			...input.crop,
		});
	}

	// Giving a text block a size fixes that dimension (as resizing it does).
	if (
		block.type === 'text' &&
		properties.sizing === undefined &&
		(input.width !== undefined || input.height !== undefined)
	) {
		const current = propertyValue(block, 'sizing');
		const next = sizingForSize(
			isTextSizing(current) ? current : 'fixed',
			input,
		);
		if (next !== current) properties.sizing = next;
	}

	setBlockProperties(id, {
		...properties,
		...geometryProperties(block, input),
	});
};

/**
 * Measure text the way a text block renders it (same fonts and classes as
 * `TextBlock`), with a hidden element inside the canvas. Undefined when the
 * canvas is not rendered.
 */
const measureTextBlock = (
	text: string,
	size: number,
	bold: boolean,
): { width: number; height: number } | undefined => {
	const canvas =
		typeof document === 'undefined'
			? null
			: document.getElementById('workspace');
	if (!canvas) return undefined;

	const probe = document.createElement('p');
	probe.className = bold ? 'poppins-font-family font-bold' : '';
	Object.assign(probe.style, {
		position: 'absolute',
		left: '-100000px',
		top: '0',
		margin: '0',
		visibility: 'hidden',
		whiteSpace: 'pre',
		fontSize: `${size}px`,
	});
	probe.textContent = text;
	canvas.appendChild(probe);
	const { scrollWidth, scrollHeight } = probe;
	probe.remove();

	if (scrollWidth === 0) return undefined;
	return {
		width: Math.ceil(scrollWidth + size * 0.25),
		height: Math.ceil(scrollHeight + size * 0.2),
	};
};

/**
 * Box that fits a text block's text (the block does not grow with it):
 * measured on the canvas when possible, otherwise estimated on the wide side.
 */
export const estimateTextSize = (
	text: string,
	fontSize: number,
	bold: boolean,
): { width: number; height: number } => {
	const size = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 24;
	const measured = measureTextBlock(text, size, bold);
	if (measured) return measured;

	const lines = text.split('\n');
	const longest = Math.max(1, ...lines.map((line) => line.length));

	return {
		width: Math.ceil(longest * size * (bold ? 0.66 : 0.58) + size * 0.5),
		height: Math.ceil(lines.length * size * 1.5),
	};
};

export const deleteBlocks = (ids: string[]): void => {
	ids.forEach((id) => requireBlock(id));
	ids.forEach((id) => {
		// Deleting a group already removed its children.
		const workspace = requireWorkspace();
		if (!liveControls(workspace).some((item) => item.id === id)) return;
		useControlsStore.getState().deleteControl(id, workspace);
	});
};

export const selectBlocks = (ids: string[]): void => {
	ids.forEach((id) => requireBlock(id));
	useControlsStore.getState().setSelection(ids);
};

export type ReorderPosition = 'front' | 'back' | 'forward' | 'backward';

export const reorderBlock = (id: string, position: ReorderPosition): void => {
	requireBlock(id);
	const controls = useControlsStore.getState();

	if (position === 'front' || position === 'back') {
		controls.moveControlToEdge({ id, position }, requireWorkspace());
	} else {
		controls.moveControlByStep({ id, direction: position }, requireWorkspace());
	}
};

/** Align blocks (one block aligns to the canvas); they stay selected. */
export const alignBlocks = (ids: string[], alignment: Alignment): void => {
	selectBlocks(ids);
	alignSelection(alignment);
};

export const distributeBlocks = (ids: string[], axis: DistributeAxis): void => {
	if (ids.length < 3) {
		throw new EditorActionError('Distributing needs at least three blocks.');
	}
	selectBlocks(ids);
	distributeSelection(axis);
};

export const setHtmlBlockCode = (
	id: string,
	code: Partial<Record<(typeof HTML_BLOCK_CODE_KEYS)[number], string>>,
): void => {
	const block = requireBlock(id);
	if (block.type !== 'html') {
		throw new EditorActionError(`Block "${id}" is not an HTML block.`);
	}

	setBlockProperties(
		id,
		Object.fromEntries(
			Object.entries(code).filter(([, value]) => value !== undefined),
		),
	);
};

/* -------------------------------------------------------------------------- */
/* Canvas                                                                     */
/* -------------------------------------------------------------------------- */

/** Change canvas settings (background, size) as one undoable step. */
export const setCanvasSettings = (
	settings: Partial<WorkspaceSettings>,
): void => {
	const workspace = requireWorkspace();
	const previous = pickWorkspaceSettings(workspace);
	const next = { ...previous, ...settings };
	if (JSON.stringify(previous) === JSON.stringify(next)) return;

	useHistoryStore
		.getState()
		.commitWorkspaceSettings(workspace.id, previous, next);
	useWorkspaceStore.getState().setWorkspaceSettings(next);
};

/**
 * Create a workspace (a project tab) with a canvas size, make it current and
 * open the editor if another page is showing.
 */
export const createWorkspace = (input: {
	name: string;
	width: number;
	height: number;
}): Workspace => {
	const workspaces = useWorkspaceStore.getState();
	const id = getRandomNumber().toString();

	workspaces.addWorkspace(id, input.name.trim() || undefined);
	workspaces.setCurrentWorkspace(id);
	workspaces.setWorkspaceSize({
		width: String(Math.round(input.width)),
		height: String(Math.round(input.height)),
	});

	// The router follows history changes (same as the app's own navigation).
	if (typeof window !== 'undefined' && window.location.pathname !== '/editor') {
		window.history.pushState({}, '', '/editor');
		window.dispatchEvent(new PopStateEvent('popstate'));
	}

	return requireWorkspace();
};

/** Resolve once `selector` matches an element, or time out. */
export const waitForElement = (
	selector: string,
	timeoutMs = 5000,
): Promise<boolean> =>
	new Promise((resolve) => {
		const started = Date.now();
		const check = () => {
			if (document.querySelector(selector)) resolve(true);
			else if (Date.now() - started >= timeoutMs) resolve(false);
			else setTimeout(check, 50);
		};
		check();
	});

/** Resolve once the block is rendered (blocks load lazily), or time out. */
export const waitForBlock = (id: string, timeoutMs = 3000): Promise<boolean> =>
	new Promise((resolve) => {
		const started = Date.now();
		const check = () => {
			if (isMounted(id)) resolve(true);
			else if (Date.now() - started >= timeoutMs) resolve(false);
			// setTimeout, not requestAnimationFrame: it also runs in hidden tabs.
			else setTimeout(check, 30);
		};
		check();
	});
