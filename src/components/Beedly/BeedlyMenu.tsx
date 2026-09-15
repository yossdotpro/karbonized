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
import { getBeedlyBridge } from '@/lib/beedly/bridge';
import { setMcpEnabled, useMcpStatus } from '@/lib/beedly/mcp/use-mcp-status';
import { getActiveProfile, useBeedlySettings } from '@/lib/beedly/settings';
import { useBeedlyUI } from '@/lib/beedly/ui-store';

/**
 * "Beedly" menu of the menu bar. The panel and the settings dialog live in
 * the editor, so their items are disabled on other pages.
 */
export const BeedlyMenu: React.FC<{ isEditor: boolean }> = ({ isEditor }) => {
	const open = useBeedlyUI((state) => state.panelOpen);
	const working = useBeedlyUI((state) => state.working);
	const profiles = useBeedlySettings((state) => state.profiles);
	const activeId = useBeedlySettings(
		(state) => getActiveProfile(state)?.id ?? '',
	);
	const setActiveProfile = useBeedlySettings((state) => state.setActiveProfile);
	const toggleShortcut = useCommandShortcut('view.toggle-beedly');
	const mcp = useMcpStatus();
	const desktop = getBeedlyBridge() !== undefined;

	return (
		<MenubarMenu>
			<MenubarTrigger>Beedly</MenubarTrigger>
			<MenubarContent>
				<MenubarItem
					disabled={!isEditor}
					onClick={() => runCommand('view.toggle-beedly')}
				>
					{open ? 'Hide Beedly' : 'Show Beedly'}
					<MenubarShortcut>{shortcutLabel(toggleShortcut)}</MenubarShortcut>
				</MenubarItem>
				<MenubarItem
					disabled={!isEditor}
					onClick={() => runCommand('beedly.new-chat')}
				>
					New chat
				</MenubarItem>
				<MenubarItem
					disabled={!isEditor || !working}
					onClick={() => runCommand('beedly.stop')}
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
							onClick={() => runCommand('beedly.settings')}
						>
							Manage providers…
						</MenubarItem>
					</MenubarSubContent>
				</MenubarSub>

				<MenubarItem
					disabled={!isEditor}
					onClick={() => runCommand('beedly.settings')}
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
							onClick={() => runCommand('beedly.mcp-settings')}
						>
							Connect a client…
						</MenubarItem>
					</>
				)}
			</MenubarContent>
		</MenubarMenu>
	);
};

export default BeedlyMenu;
