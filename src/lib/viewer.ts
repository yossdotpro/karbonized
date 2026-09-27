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

/** Zoom so the whole workspace is visible, then center it. */
export const fitViewer = (
	viewer: ViewerRef,
	workspace: { width: number; height: number },
	container?: HTMLElement | null,
): void => {
	const width = container?.clientWidth ?? window.innerWidth;
	const height = container?.clientHeight ?? window.innerHeight;
	const padding = 96;

	const zoom = Math.min(
		(width - padding) / workspace.width,
		(height - padding) / workspace.height,
		1,
	);

	setViewerZoom(viewer, zoom);
	// Let the viewer apply the new zoom before centering.
	requestAnimationFrame(() => viewer.current?.scrollCenter());
};

export const formatZoom = (zoom: number): string =>
	`${Math.round(zoom * 100)}%`;
