import React, { useEffect } from 'react';
import { Plug, PlugZap, Settings2, Square, SquarePen } from 'lucide-react';
import { AgentMark } from './AgentMark';
import { useCommands } from '@/lib/commands/registry';
import { useAgentConversation } from '@/lib/agent/conversation-store';
import { useAgentSettings } from '@/lib/agent/settings';
import { useAgentUI } from '@/lib/agent/ui-store';
import { getAgentBridge } from '@/lib/agent/bridge';
import { setMcpEnabled, useMcpStatus } from '@/lib/agent/mcp/use-mcp-status';
import { AgentSettingsDialog } from './AgentSettingsDialog';

/**
 * Always mounted in the editor: Agent commands and the settings dialog, so
 * they work while the panel is closed.
 */
export const AgentCommands: React.FC = () => {
	const panelOpen = useAgentUI((state) => state.panelOpen);
	const mcp = useMcpStatus();
	// The MCP server exists in the desktop app only.
	const desktop = getAgentBridge() !== undefined;

	useEffect(() => {
		void useAgentSettings.getState().refreshKeys();
		void useAgentConversation.getState().load();
	}, []);

	useCommands([
		{
			id: 'view.toggle-agent',
			title: panelOpen ? 'Hide Agent' : 'Show Agent',
			group: 'View',
			icon: AgentMark,
			shortcut: 'Mod+L',
			keywords: ['assistant', 'ai', 'chat', 'agent'],
			allowInInput: true,
			run: () => useAgentUI.getState().togglePanel(),
		},
		{
			id: 'agent.new-chat',
			title: 'New agent chat',
			group: 'Tools',
			icon: SquarePen,
			keywords: ['assistant', 'ai', 'conversation'],
			run: () => {
				useAgentConversation.getState().newConversation();
				useAgentUI.getState().setPanelOpen(true);
			},
		},
		{
			id: 'agent.settings',
			title: 'Agent settings',
			group: 'Tools',
			icon: Settings2,
			keywords: ['assistant', 'ai', 'provider', 'api key', 'model', 'mcp'],
			run: () => useAgentUI.getState().openSettings('providers'),
		},
		{
			id: 'agent.stop',
			title: 'Stop agent response',
			group: 'Tools',
			icon: Square,
			keywords: ['assistant', 'ai', 'cancel'],
			when: () => useAgentUI.getState().working,
			run: () => useAgentConversation.getState().stop(),
		},
		...(desktop
			? [
					{
						id: 'agent.mcp-toggle',
						title: mcp?.enabled ? 'Turn off MCP server' : 'Turn on MCP server',
						group: 'Tools' as const,
						icon: mcp?.enabled ? Plug : PlugZap,
						keywords: ['mcp', 'claude', 'cursor', 'server', 'connect'],
						run: () => void setMcpEnabled(!mcp?.enabled),
					},
					{
						id: 'agent.mcp-settings',
						title: 'MCP server settings',
						group: 'Tools' as const,
						icon: Settings2,
						keywords: ['mcp', 'claude', 'cursor', 'token', 'port'],
						run: () => useAgentUI.getState().openSettings('mcp'),
					},
				]
			: []),
	]);

	return <AgentSettingsDialog />;
};

export default AgentCommands;
