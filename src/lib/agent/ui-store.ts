import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentSettingsTab = 'providers' | 'mcp';

interface AgentUIState {
	panelOpen: boolean;
	settingsOpen: boolean;
	settingsTab: AgentSettingsTab;
	/**
	 * A response is being generated. Mirrored here so the status bar and menus
	 * can show it without loading the conversation store and its tools.
	 */
	working: boolean;
	setPanelOpen: (open: boolean) => void;
	togglePanel: () => void;
	openSettings: (tab?: AgentSettingsTab) => void;
	setSettingsOpen: (open: boolean) => void;
	setSettingsTab: (tab: AgentSettingsTab) => void;
}

export const useAgentUI = create<AgentUIState>()(
	persist(
		(set) => ({
			panelOpen: false,
			settingsOpen: false,
			settingsTab: 'providers',
			working: false,
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
			name: 'karbonized:beedly-ui', // legacy name, keeps the panel state,
			partialize: ({ panelOpen }) => ({ panelOpen }),
		},
	),
);
