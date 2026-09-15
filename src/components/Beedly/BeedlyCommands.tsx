import React, { useEffect } from 'react';
import { Settings2, Sparkles, SquarePen } from 'lucide-react';
import { useCommands } from '@/lib/commands/registry';
import { useBeedlyConversation } from '@/lib/beedly/conversation-store';
import { useBeedlySettings } from '@/lib/beedly/settings';
import { useBeedlyUI } from '@/lib/beedly/ui-store';
import { BeedlySettingsDialog } from './BeedlySettingsDialog';

/**
 * Always mounted in the editor: Beedly commands and the settings dialog, so
 * they work while the panel is closed.
 */
export const BeedlyCommands: React.FC = () => {
	const panelOpen = useBeedlyUI((state) => state.panelOpen);

	useEffect(() => {
		void useBeedlySettings.getState().refreshKeys();
		void useBeedlyConversation.getState().load();
	}, []);

	useCommands([
		{
			id: 'view.toggle-beedly',
			title: panelOpen ? 'Hide Beedly' : 'Show Beedly',
			group: 'View',
			icon: Sparkles,
			shortcut: 'Mod+L',
			keywords: ['assistant', 'ai', 'chat', 'agent'],
			allowInInput: true,
			run: () => useBeedlyUI.getState().togglePanel(),
		},
		{
			id: 'beedly.new-chat',
			title: 'New Beedly chat',
			group: 'Tools',
			icon: SquarePen,
			keywords: ['assistant', 'ai', 'conversation'],
			run: () => {
				useBeedlyConversation.getState().newConversation();
				useBeedlyUI.getState().setPanelOpen(true);
			},
		},
		{
			id: 'beedly.settings',
			title: 'Beedly settings',
			group: 'Tools',
			icon: Settings2,
			keywords: ['assistant', 'ai', 'provider', 'api key', 'model', 'mcp'],
			run: () => useBeedlyUI.getState().openSettings(),
		},
	]);

	return <BeedlySettingsDialog />;
};

export default BeedlyCommands;
