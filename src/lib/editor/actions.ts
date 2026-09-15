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
import { generateNewId } from '@/lib/utils';
import { getRandomNumber } from '@/utils/getRandom';
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

export const parseRotation = (transform: unknown): number => {
	if (typeof transform !== 'string') return 0;
	const match = /rotate\((-?[\d.]+)deg\)/.exec(transform);
	return match ? parseFloat(match[1]) : 0;
};

export const withRotation = (transform: unknown, degrees: number): string => {
	const base = typeof transform === 'string' ? transform : '';
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
		blocks: liveControls(workspace).map(summarizeBlock),
	};
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

	// Text blocks don't grow with their text: size them to fit it.
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

	const initial: Record<string, unknown> = {
		...input.properties,
		pos: {
			x: Math.round(input.x ?? (canvasWidth - width) / 2),
			y: Math.round(input.y ?? (canvasHeight - height) / 2),
		},
		control_size: { w: Math.round(width), h: Math.round(height) },
	};
	if (input.rotation !== undefined) {
		initial.transform = withRotation('', input.rotation);
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

	const textChanged =
		block.type === 'text' &&
		input.width === undefined &&
		input.height === undefined &&
		['text', 'textSize', 'isBold'].some(
			(key) => input.properties?.[key] !== undefined,
		);
	const value = (key: string) =>
		input.properties?.[key] ?? propertyValue(block, key);
	const geometry = textChanged
		? {
				...input,
				...estimateTextSize(
					String(value('text')),
					Number(value('textSize')),
					value('isBold') === true,
				),
			}
		: input;

	setBlockProperties(id, {
		...input.properties,
		...geometryProperties(block, geometry),
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
