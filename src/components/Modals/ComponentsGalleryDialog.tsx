import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ComponentsGallery } from '../Panels/ComponentsGallery';
import { KComponent } from '@/models/KComponent';
import { addBlock } from '@/lib/editor/actions';
import { useKComponentStore } from '@/stores/kcomponent-store';

interface ComponentsGalleryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddToCanvas: (component: KComponent, importedId?: string) => void;
	/** Closes the dialog once a component lands on the canvas. */
	closeOnAdd?: boolean;
}

export const ComponentsGalleryDialog: React.FC<
	ComponentsGalleryDialogProps
> = ({ open, onOpenChange, onAddToCanvas, closeOnAdd = true }) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='flex h-[70vh] flex-col overflow-hidden sm:max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Component library</DialogTitle>
					<DialogDescription>
						Add an imported component to the canvas, or an icon from an icon
						pack.
					</DialogDescription>
				</DialogHeader>
				<div className='-mx-5 -mb-5 flex min-h-0 flex-1 flex-col border-t border-border'>
					<ComponentsGallery
						onAddToCanvas={(component, importedId) => {
							onAddToCanvas(component, importedId);
							if (closeOnAdd) onOpenChange(false);
						}}
						onAddIcon={(name, importedId) => {
							addBlock({ type: 'icon', properties: { icon: name } });
							useKComponentStore.getState().markComponentUsed(importedId);
							if (closeOnAdd) onOpenChange(false);
						}}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ComponentsGalleryDialog;
