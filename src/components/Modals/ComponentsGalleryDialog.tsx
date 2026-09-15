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

interface ComponentsGalleryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddToCanvas: (component: KComponent) => void;
}

export const ComponentsGalleryDialog: React.FC<
	ComponentsGalleryDialogProps
> = ({ open, onOpenChange, onAddToCanvas }) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='flex h-[70vh] flex-col overflow-hidden sm:max-w-xl'>
				<DialogHeader>
					<DialogTitle>Component library</DialogTitle>
					<DialogDescription>
						Add an imported component to the canvas.
					</DialogDescription>
				</DialogHeader>
				<div className='-mx-5 -mb-5 flex min-h-0 flex-1 flex-col border-t border-border'>
					<ComponentsGallery onAddToCanvas={onAddToCanvas} />
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ComponentsGalleryDialog;
