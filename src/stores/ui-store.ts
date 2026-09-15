import { create } from 'zustand';
import type { WorkspaceMode, SelectedTab } from '../types';

interface UIState {
	editing: boolean;
	drag: boolean;
	crop: boolean;
	warp: boolean;
	isExporting: boolean;
	/** Leave out the workspace background while exporting. */
	exportTransparent: boolean;
	lockAspect: boolean;
	workspaceMode: WorkspaceMode;
	selectedTab: SelectedTab;
}

interface UIActions {
	setEditing: (editing: boolean) => void;
	setDrag: (drag: boolean) => void;
	setCrop: (crop: boolean) => void;
	setWarp: (warp: boolean) => void;
	setIsExporting: (isExporting: boolean) => void;
	setExportTransparent: (exportTransparent: boolean) => void;
	setLockAspect: (lockAspect: boolean) => void;
	setWorkspaceMode: (mode: WorkspaceMode) => void;
	setSelectedTab: (tab: SelectedTab) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
	editing: true,
	drag: false,
	crop: false,
	warp: false,
	isExporting: false,
	exportTransparent: false,
	lockAspect: false,
	workspaceMode: 'zen',
	selectedTab: 'hierarchy',

	setEditing: (editing) => set({ editing }),
	setDrag: (drag) => set({ drag }),
	setCrop: (crop) => set({ crop }),
	setWarp: (warp) => set({ warp }),
	setIsExporting: (isExporting) => set({ isExporting }),
	setExportTransparent: (exportTransparent) => set({ exportTransparent }),
	setLockAspect: (lockAspect) => set({ lockAspect }),
	setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
	setSelectedTab: (selectedTab) => set({ selectedTab }),
}));
