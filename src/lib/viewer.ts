import type { RefObject } from 'react';
import { create } from 'zustand';

/**
 * Canvas viewport helpers.
 *
 * All zoom changes go through here so the zoom indicator stays in sync, whether
 * the zoom comes from a command, a menu, pinching or Ctrl+wheel.
 */

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;
export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2];

interface ViewerLike {
	getZoom(): number;
	setZoom(zoom: number): void;
	scrollCenter(): void;
	/** In canvas pixels (unzoomed). */
	scrollBy?(deltaX: number, deltaY: number): void;
}

type ViewerRef = RefObject<ViewerLike | null>;

export type GuideAxis = 'vertical' | 'horizontal';

interface ViewState {
	zoom: number;
	snapping: boolean;
	/** Rulers around the canvas, and the guides dragged out of them. */
	showRulers: boolean;
	guides: Record<GuideAxis, number[]>;
	setZoomValue: (zoom: number) => void;
	setSnapping: (snapping: boolean) => void;
	setShowRulers: (show: boolean) => void;
	addGuide: (axis: GuideAxis, position: number) => void;
	moveGuide: (axis: GuideAxis, index: number, position: number) => void;
	removeGuide: (axis: GuideAxis, index: number) => void;
	clearGuides: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
	zoom: 1,
	snapping: true,
	showRulers: false,
	guides: { vertical: [], horizontal: [] },
	setZoomValue: (zoom) => set({ zoom }),
	setSnapping: (snapping) => set({ snapping }),
	setShowRulers: (showRulers) => set({ showRulers }),
	addGuide: (axis, position) =>
		set((state) => ({
			guides: {
				...state.guides,
				[axis]: [...state.guides[axis], Math.round(position)],
			},
		})),
	moveGuide: (axis, index, position) =>
		set((state) => ({
			guides: {
				...state.guides,
				[axis]: state.guides[axis].map((value, current) =>
					current === index ? Math.round(position) : value,
				),
			},
		})),
	removeGuide: (axis, index) =>
		set((state) => ({
			guides: {
				...state.guides,
				[axis]: state.guides[axis].filter((_, current) => current !== index),
			},
		})),
	clearGuides: () => set({ guides: { vertical: [], horizontal: [] } }),
}));

const clampZoom = (zoom: number) =>
	Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 100) / 100));

export const setViewerZoom = (viewer: ViewerRef, zoom: number): void => {
	const next = clampZoom(zoom);
	viewer.current?.setZoom(next);
	useViewStore.getState().setZoomValue(next);
};

/** Multiplicative zoom steps feel even at every zoom level. */
export const zoomViewerBy = (viewer: ViewerRef, direction: 1 | -1): void => {
	const current = viewer.current?.getZoom() ?? useViewStore.getState().zoom;
	setViewerZoom(viewer, direction > 0 ? current * 1.25 : current / 1.25);
};

/** Space the panels floating over the viewer cover, from each edge. */
export interface ViewerInsets {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

const NO_INSETS: ViewerInsets = { left: 0, right: 0, top: 0, bottom: 0 };

interface Box {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

/**
 * How far the given panels cover the viewer from its left and right edges.
 * A panel counts for the side it sits on; panels outside the viewer (or
 * collapsed to nothing) do not count.
 */
export const measureInsets = (viewer: Box, panels: Box[]): ViewerInsets => {
	const insets = { ...NO_INSETS };
	const middle = (viewer.left + viewer.right) / 2;

	panels.forEach((panel) => {
		const overlaps =
			panel.right > viewer.left &&
			panel.left < viewer.right &&
			panel.bottom > viewer.top &&
			panel.top < viewer.bottom &&
			panel.right > panel.left;
		if (!overlaps) return;

		if ((panel.left + panel.right) / 2 < middle) {
			insets.left = Math.max(insets.left, panel.right - viewer.left);
		} else {
			insets.right = Math.max(insets.right, viewer.right - panel.left);
		}
	});

	return insets;
};

/** Panels mark themselves with this attribute when they float over the canvas. */
export const CANVAS_OVERLAY_ATTRIBUTE = 'data-canvas-overlay';

/** The insets of the panels floating over `container` right now. */
export const canvasInsets = (container?: HTMLElement | null): ViewerInsets => {
	if (!container || typeof document === 'undefined') return NO_INSETS;
	const panels = Array.from(
		document.querySelectorAll<HTMLElement>(`[${CANVAS_OVERLAY_ATTRIBUTE}]`),
	).map((panel) => panel.getBoundingClientRect());
	return measureInsets(container.getBoundingClientRect(), panels);
};

/**
 * Center the workspace in the part of the viewer the panels leave free. Runs
 * on the next frame, so the viewer has applied a zoom set just before.
 */
export const centerViewer = (
	viewer: ViewerRef,
	insets: ViewerInsets = NO_INSETS,
): void => {
	requestAnimationFrame(() => {
		const current = viewer.current;
		if (!current) return;
		current.scrollCenter();

		const zoom = current.getZoom() || 1;
		const deltaX = (insets.right - insets.left) / 2 / zoom;
		const deltaY = (insets.bottom - insets.top) / 2 / zoom;
		if (deltaX !== 0 || deltaY !== 0) current.scrollBy?.(deltaX, deltaY);
	});
};

/**
 * Zoom so the whole workspace is visible, then center it. `insets` is the
 * space panels floating over the viewer cover: the workspace fits and is
 * centered in what is left.
 */
export const fitViewer = (
	viewer: ViewerRef,
	workspace: { width: number; height: number },
	container?: HTMLElement | null,
	insets: ViewerInsets = NO_INSETS,
): void => {
	const width =
		(container?.clientWidth ?? window.innerWidth) - insets.left - insets.right;
	const height =
		(container?.clientHeight ?? window.innerHeight) -
		insets.top -
		insets.bottom;
	const padding = 96;

	const zoom = Math.min(
		(width - padding) / workspace.width,
		(height - padding) / workspace.height,
		1,
	);

	setViewerZoom(viewer, zoom);
	centerViewer(viewer, insets);
};

export const formatZoom = (zoom: number): string =>
	`${Math.round(zoom * 100)}%`;
