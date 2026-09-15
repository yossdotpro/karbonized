import React, { useEffect } from 'react';
import {
	Plug,
	PlugZap,
	Settings2,
	Sparkles,
	Square,
	SquarePen,
} from 'lucide-react';
import { useCommands } from '@/lib/commands/registry';
import { useBeedlyConversation } from '@/lib/beedly/conversation-store';
import { useBeedlySettings } from '@/lib/beedly/settings';
import { useBeedlyUI } from '@/lib/beedly/ui-store';
import { getBeedlyBridge } from '@/lib/beedly/bridge';
import { setMcpEnabled, useMcpStatus } from '@/lib/beedly/mcp/use-mcp-status';
import { BeedlySettingsDialog } from './BeedlySettingsDialog';

/**
 * Always mounted in the editor: Beedly commands and the settings dialog, so
 * they work while the panel is closed.
 */
export const BeedlyCommands: React.FC = () => {
	const panelOpen = useBeedlyUI((state) => state.panelOpen);
	const mcp = useMcpStatus();
	// The MCP server exists in the desktop app only.
	const desktop = getBeedlyBridge() !== undefined;

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
			run: () => useBeedlyUI.getState().openSettings('providers'),
		},
		{
			id: 'beedly.stop',
			title: 'Stop Beedly response',
			group: 'Tools',
			icon: Square,
			keywords: ['assistant', 'ai', 'cancel'],
			when: () => useBeedlyUI.getState().working,
			run: () => useBeedlyConversation.getState().stop(),
		},
		...(desktop
			? [
					{
						id: 'beedly.mcp-toggle',
						title: mcp?.enabled ? 'Turn off MCP server' : 'Turn on MCP server',
						group: 'Tools' as const,
						icon: mcp?.enabled ? Plug : PlugZap,
						keywords: ['mcp', 'claude', 'cursor', 'server', 'connect'],
						run: () => void setMcpEnabled(!mcp?.enabled),
					},
					{
						id: 'beedly.mcp-settings',
						title: 'MCP server settings',
						group: 'Tools' as const,
						icon: Settings2,
						keywords: ['mcp', 'claude', 'cursor', 'token', 'port'],
						run: () => useBeedlyUI.getState().openSettings('mcp'),
					},
				]
			: []),
	]);

	return <BeedlySettingsDialog />;
};

export default BeedlyCommands;
