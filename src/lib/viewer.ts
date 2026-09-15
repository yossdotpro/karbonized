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

interface ViewState {
	zoom: number;
	snapping: boolean;
	setZoomValue: (zoom: number) => void;
	setSnapping: (snapping: boolean) => void;
}

export const useViewStore = create<ViewState>((set) => ({
	zoom: 1,
	snapping: true,
	setZoomValue: (zoom) => set({ zoom }),
	setSnapping: (snapping) => set({ snapping }),
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
