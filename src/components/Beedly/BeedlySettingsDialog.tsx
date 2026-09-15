import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useBeedlySettings } from '@/lib/beedly/settings';
import { useBeedlyUI } from '@/lib/beedly/ui-store';
import { ProvidersSettings } from './ProvidersSettings';

export const BeedlySettingsDialog: React.FC = () => {
	const open = useBeedlyUI((state) => state.settingsOpen);
	const setOpen = useBeedlyUI((state) => state.setSettingsOpen);
	const refreshKeys = useBeedlySettings((state) => state.refreshKeys);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (next) void refreshKeys();
				setOpen(next);
			}}
		>
			<DialogContent className='sm:max-w-[680px]'>
				<DialogHeader>
					<DialogTitle>Beedly settings</DialogTitle>
					<DialogDescription>Choose the model Beedly uses.</DialogDescription>
				</DialogHeader>
				<ProvidersSettings />
			</DialogContent>
		</Dialog>
	);
};

export default BeedlySettingsDialog;
