import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBeedlyBridge } from '@/lib/beedly/bridge';
import { useBeedlySettings } from '@/lib/beedly/settings';
import { type BeedlySettingsTab, useBeedlyUI } from '@/lib/beedly/ui-store';
import { ProvidersSettings } from './ProvidersSettings';

const McpSettings = React.lazy(async () => await import('./McpSettings'));

export const BeedlySettingsDialog: React.FC = () => {
	const open = useBeedlyUI((state) => state.settingsOpen);
	const setOpen = useBeedlyUI((state) => state.setSettingsOpen);
	const tab = useBeedlyUI((state) => state.settingsTab);
	const setTab = useBeedlyUI((state) => state.setSettingsTab);
	const refreshKeys = useBeedlySettings((state) => state.refreshKeys);

	// The MCP server runs in the desktop app only.
	const desktop = getBeedlyBridge() !== undefined;

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
					<DialogTitle>Beedly settings</DialogTitle>
					<DialogDescription>
						{desktop
							? 'Choose the model Beedly uses and let other apps control Karbonized.'
							: 'Choose the model Beedly uses.'}
					</DialogDescription>
				</DialogHeader>

				{desktop ? (
					<Tabs
						value={tab}
						onValueChange={(value) => setTab(value as BeedlySettingsTab)}
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

export default BeedlySettingsDialog;
