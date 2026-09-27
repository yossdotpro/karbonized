import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAgentBridge } from '@/lib/agent/bridge';
import { useAgentSettings } from '@/lib/agent/settings';
import { type AgentSettingsTab, useAgentUI } from '@/lib/agent/ui-store';
import { ProvidersSettings } from './ProvidersSettings';

const McpSettings = React.lazy(async () => await import('./McpSettings'));

export const AgentSettingsDialog: React.FC = () => {
	const open = useAgentUI((state) => state.settingsOpen);
	const setOpen = useAgentUI((state) => state.setSettingsOpen);
	const tab = useAgentUI((state) => state.settingsTab);
	const setTab = useAgentUI((state) => state.setSettingsTab);
	const refreshKeys = useAgentSettings((state) => state.refreshKeys);

	// The MCP server runs in the desktop app only.
	const desktop = getAgentBridge() !== undefined;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (next) void refreshKeys();
				setOpen(next);
			}}
		>
			<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[680px]'>
				<DialogHeader>
					<DialogTitle>Agent settings</DialogTitle>
					<DialogDescription>
						{desktop
							? 'Choose the model the agent uses and let other apps control Karbonized.'
							: 'Choose the model the agent uses.'}
					</DialogDescription>
				</DialogHeader>

				{desktop ? (
					<Tabs
						value={tab}
						onValueChange={(value) => setTab(value as AgentSettingsTab)}
					>
						<TabsList>
							<TabsTrigger value='providers'>Providers</TabsTrigger>
							<TabsTrigger value='mcp'>MCP server</TabsTrigger>
						</TabsList>
						<TabsContent value='providers' className='pt-3'>
							<ProvidersSettings />
						</TabsContent>
						<TabsContent value='mcp' className='pt-3'>
							<React.Suspense fallback={null}>
								<McpSettings />
							</React.Suspense>
						</TabsContent>
					</Tabs>
				) : (
					<ProvidersSettings />
				)}
			</DialogContent>
		</Dialog>
	);
};

export default AgentSettingsDialog;
