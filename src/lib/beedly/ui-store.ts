import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BeedlySettingsTab = 'providers' | 'mcp';

interface BeedlyUIState {
	panelOpen: boolean;
	settingsOpen: boolean;
	settingsTab: BeedlySettingsTab;
	setPanelOpen: (open: boolean) => void;
	togglePanel: () => void;
	openSettings: (tab?: BeedlySettingsTab) => void;
	setSettingsOpen: (open: boolean) => void;
	setSettingsTab: (tab: BeedlySettingsTab) => void;
}

export const useBeedlyUI = create<BeedlyUIState>()(
	persist(
		(set) => ({
			panelOpen: false,
			settingsOpen: false,
			settingsTab: 'providers',
			setPanelOpen: (panelOpen) => set({ panelOpen }),
			togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
			openSettings: (tab) =>
				set((state) => ({
					settingsOpen: true,
					settingsTab: tab ?? state.settingsTab,
				})),
			setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
			setSettingsTab: (settingsTab) => set({ settingsTab }),
		}),
		{
			name: 'karbonized:beedly-ui',
			partialize: ({ panelOpen }) => ({ panelOpen }),
		},
	),
);
