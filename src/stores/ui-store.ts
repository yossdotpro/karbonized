import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ShapeKind } from '../lib/blocks/shapes';
import type { SelectedTab } from '../types';

/**
 * What a drag on the canvas does. One tool is active at a time: the panels,
 * the canvas and the shortcuts all read this instead of keeping their own
 * flags in step.
 */
export type EditorTool =
	'select' | 'pan' | 'crop' | 'warp' | 'draw' | 'brush' | 'nodes' | 'eraser';

interface UIState {
	activeTool: EditorTool;
	/** Shape the draw tool puts on the canvas. */
	drawShape: ShapeKind;
	/** Brush settings, kept between strokes. */
	brushColor: string;
	brushSize: number;
	/** How much the stroke thins with pressure or speed, 0–100. */
	brushThinning: number;
	/** How far a point may stray before it is dropped, in canvas pixels. */
	brushSmoothing: number;
	/** The tool to go back to when a held key (Space) is released. */
	previousTool: EditorTool | null;
	isExporting: boolean;
	/** Leave out the workspace background while exporting. */
	exportTransparent: boolean;
	lockAspect: boolean;
	/** The properties panel on the right is expanded (not just its icon rail). */
	propertiesOpen: boolean;
	selectedTab: SelectedTab;
}

interface UIActions {
	setActiveTool: (tool: EditorTool) => void;
	/** Draw `shape` on the canvas by dragging. */
	startDrawing: (shape: ShapeKind) => void;
	setBrushColor: (color: string) => void;
	setBrushSize: (size: number) => void;
	setBrushThinning: (thinning: number) => void;
	setBrushSmoothing: (smoothing: number) => void;
	/** Switch to `tool` while a key is held, remembering the current one. */
	holdTool: (tool: EditorTool) => void;
	/** Go back to the tool that was active before `holdTool`. */
	releaseTool: () => void;
	setIsExporting: (isExporting: boolean) => void;
	setExportTransparent: (exportTransparent: boolean) => void;
	setLockAspect: (lockAspect: boolean) => void;
	setPropertiesOpen: (open: boolean) => void;
	setSelectedTab: (tab: SelectedTab) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
	persist(
		(set, get) => ({
			activeTool: 'select',
			drawShape: 'rectangle',
			brushColor: '#f3f4f6',
			brushSize: 6,
			brushThinning: 50,
			brushSmoothing: 1.2,
			previousTool: null,
			isExporting: false,
			exportTransparent: false,
			lockAspect: false,
			propertiesOpen: true,
			selectedTab: 'hierarchy',

			setActiveTool: (activeTool) => set({ activeTool, previousTool: null }),
			startDrawing: (drawShape) =>
				set({ activeTool: 'draw', drawShape, previousTool: null }),
			setBrushColor: (brushColor) => set({ brushColor }),
			setBrushSize: (brushSize) => set({ brushSize }),
			setBrushThinning: (brushThinning) => set({ brushThinning }),
			setBrushSmoothing: (brushSmoothing) => set({ brushSmoothing }),
			holdTool: (tool) => {
				const { activeTool, previousTool } = get();
				if (activeTool === tool) return;
				set({ activeTool: tool, previousTool: previousTool ?? activeTool });
			},
			releaseTool: () => {
				const { previousTool } = get();
				if (previousTool === null) return;
				set({ activeTool: previousTool, previousTool: null });
			},
			setIsExporting: (isExporting) => set({ isExporting }),
			setExportTransparent: (exportTransparent) => set({ exportTransparent }),
			setLockAspect: (lockAspect) => set({ lockAspect }),
			setPropertiesOpen: (propertiesOpen) => set({ propertiesOpen }),
			setSelectedTab: (selectedTab) => set({ selectedTab }),
		}),
		{
			name: 'karbonized:ui',
			// Only the layout survives a reload; tools and flags start fresh.
			partialize: ({ propertiesOpen }) => ({ propertiesOpen }),
		},
	),
);
