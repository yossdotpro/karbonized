import React from 'react';
import {
	MenubarCheckboxItem,
	MenubarContent,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
} from '@/components/ui/menubar';
import { runCommand, useCommandShortcut } from '@/lib/commands/registry';
import { shortcutLabel } from '@/lib/commands/shortcuts';
import { getAgentBridge } from '@/lib/agent/bridge';
import { setMcpEnabled, useMcpStatus } from '@/lib/agent/mcp/use-mcp-status';
import { getActiveProfile, useAgentSettings } from '@/lib/agent/settings';
import { useAgentUI } from '@/lib/agent/ui-store';

/**
 * "AI" menu of the menu bar. The panel and the settings dialog live in
 * the editor, so their items are disabled on other pages.
 */
export const AgentMenu: React.FC<{ isEditor: boolean }> = ({ isEditor }) => {
	const open = useAgentUI((state) => state.panelOpen);
	const working = useAgentUI((state) => state.working);
	const profiles = useAgentSettings((state) => state.profiles);
	const activeId = useAgentSettings(
		(state) => getActiveProfile(state)?.id ?? '',
	);
	const setActiveProfile = useAgentSettings((state) => state.setActiveProfile);
	const toggleShortcut = useCommandShortcut('view.toggle-agent');
	const mcp = useMcpStatus();
	const desktop = getAgentBridge() !== undefined;

	return (
		<MenubarMenu>
			<MenubarTrigger>AI</MenubarTrigger>
			<MenubarContent>
				<MenubarItem
					disabled={!isEditor}
					onClick={() => runCommand('view.toggle-agent')}
				>
					{open ? 'Hide Agent' : 'Show Agent'}
					<MenubarShortcut>{shortcutLabel(toggleShortcut)}</MenubarShortcut>
				</MenubarItem>
				<MenubarItem
					disabled={!isEditor}
					onClick={() => runCommand('agent.new-chat')}
				>
					New chat
				</MenubarItem>
				<MenubarItem
					disabled={!isEditor || !working}
					onClick={() => runCommand('agent.stop')}
				>
					Stop response
				</MenubarItem>

				<MenubarSeparator />

				<MenubarSub>
					<MenubarSubTrigger>Model</MenubarSubTrigger>
					<MenubarSubContent className='min-w-56'>
						{profiles.length === 0 ? (
							<MenubarLabel className='font-normal text-muted-foreground'>
								No providers yet
							</MenubarLabel>
						) : (
							<MenubarRadioGroup
								value={activeId}
								onValueChange={setActiveProfile}
							>
								{profiles.map((profile) => (
									<MenubarRadioItem key={profile.id} value={profile.id}>
										<span className='flex min-w-0 flex-col'>
											<span className='truncate'>{profile.name}</span>
											<span className='truncate font-mono text-[11px] text-muted-foreground'>
												{profile.model || 'No model selected'}
											</span>
										</span>
									</MenubarRadioItem>
								))}
							</MenubarRadioGroup>
						)}
						<MenubarSeparator />
						<MenubarItem
							disabled={!isEditor}
							onClick={() => runCommand('agent.settings')}
						>
							Manage providers…
						</MenubarItem>
					</MenubarSubContent>
				</MenubarSub>

				<MenubarItem
					disabled={!isEditor}
					onClick={() => runCommand('agent.settings')}
				>
					Settings…
				</MenubarItem>

				{desktop && (
					<>
						<MenubarSeparator />
						<MenubarCheckboxItem
							checked={mcp?.enabled ?? false}
							disabled={mcp === null}
							onCheckedChange={(checked) => void setMcpEnabled(checked)}
						>
							MCP server
							{mcp?.enabled && (
								<MenubarShortcut>
									{mcp.error ? 'Error' : mcp.running ? `:${mcp.port}` : '…'}
								</MenubarShortcut>
							)}
						</MenubarCheckboxItem>
						<MenubarItem
							disabled={!isEditor}
							onClick={() => runCommand('agent.mcp-settings')}
						>
							Connect a client…
						</MenubarItem>
					</>
				)}
			</MenubarContent>
		</MenubarMenu>
	);
};

export default AgentMenu;
