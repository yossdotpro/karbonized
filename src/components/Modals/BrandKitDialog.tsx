import React, { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import {
	Dialog,
	DialogBar,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBrandStore } from '@/stores/brand-store';
import {
	BRAND_FILE_EXTENSION,
	BrandKitEditor,
	exportBrandKitFile,
	importBrandKitFile,
} from '../Brand/BrandKitEditor';

/** The brand kit editor in a dialog, for pages without the properties panel. */
export const BrandKitDialog: React.FC<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
	const importInput = useRef<HTMLInputElement>(null);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Brand kit</DialogTitle>
					<DialogDescription>
						Your colors, fonts and logos in one place. The color and font
						pickers offer them first, and Agent and MCP clients read them before
						designing.
					</DialogDescription>
				</DialogHeader>

				<DialogBody className='max-h-[65vh] overflow-y-auto'>
					<BrandKitEditor />
				</DialogBody>

				<DialogBar>
					<input
						ref={importInput}
						type='file'
						accept={`${BRAND_FILE_EXTENSION},application/json`}
						className='hidden'
						onChange={(event) => {
							void importBrandKitFile(event.target.files?.[0]);
							event.target.value = '';
						}}
					/>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => importInput.current?.click()}
					>
						<Upload />
						Import
					</Button>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => exportBrandKitFile(useBrandStore.getState().kit)}
					>
						<Download />
						Export
					</Button>
					<Button
						size='sm'
						className='ml-auto'
						onClick={() => onOpenChange(false)}
					>
						Done
					</Button>
				</DialogBar>
			</DialogContent>
		</Dialog>
	);
};

export default BrandKitDialog;
