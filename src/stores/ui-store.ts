import { create } from 'zustand';
import type { WorkspaceMode, SelectedTab } from '../types';

/**
 * What a drag on the canvas does. One tool is active at a time: the panels,
 * the canvas and the shortcuts all read this instead of keeping their own
 * flags in step.
 */
export type EditorTool = 'select' | 'pan' | 'crop' | 'warp';

interface UIState {
	activeTool: EditorTool;
	/** The tool to go back to when a held key (Space) is released. */
	previousTool: EditorTool | null;
	isExporting: boolean;
	/** Leave out the workspace background while exporting. */
	exportTransparent: boolean;
	lockAspect: boolean;
	workspaceMode: WorkspaceMode;
	selectedTab: SelectedTab;
}

interface UIActions {
	setActiveTool: (tool: EditorTool) => void;
	/** Switch to `tool` while a key is held, remembering the current one. */
	holdTool: (tool: EditorTool) => void;
	/** Go back to the tool that was active before `holdTool`. */
	releaseTool: () => void;
	setIsExporting: (isExporting: boolean) => void;
	setExportTransparent: (exportTransparent: boolean) => void;
	setLockAspect: (lockAspect: boolean) => void;
	setWorkspaceMode: (mode: WorkspaceMode) => void;
	setSelectedTab: (tab: SelectedTab) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set, get) => ({
	activeTool: 'select',
	previousTool: null,
	isExporting: false,
	exportTransparent: false,
	lockAspect: false,
	workspaceMode: 'zen',
	selectedTab: 'hierarchy',

	setActiveTool: (activeTool) => set({ activeTool, previousTool: null }),
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
	setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
	setSelectedTab: (selectedTab) => set({ selectedTab }),
}));

/** The selection handles show for every tool but panning. */
export const selectToolState = (state: UIStore) => ({
	editing: state.activeTool !== 'pan',
	drag: state.activeTool === 'pan',
	crop: state.activeTool === 'crop',
	warp: state.activeTool === 'warp',
});
