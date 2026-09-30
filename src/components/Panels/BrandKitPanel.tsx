import React, { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { useBrandStore } from '@/stores/brand-store';
import {
	BRAND_FILE_EXTENSION,
	BrandKitEditor,
	exportBrandKitFile,
	importBrandKitFile,
} from '../Brand/BrandKitEditor';

/** The brand kit in its own tab of the properties panel. */
export const BrandKitPanel: React.FC = () => {
	const importInput = useRef<HTMLInputElement>(null);

	return (
		<div className='flex flex-col pb-3'>
			<p className='px-2 pb-2 text-[11px] leading-relaxed text-muted-foreground'>
				Your colors, fonts and logos. The color and font pickers offer them
				first, and Agent and MCP clients read them (and can fill them in) before
				designing.
			</p>

			<BrandKitEditor compact />

			<div className='flex gap-1 px-1 pt-2'>
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
					onClick={() => void exportBrandKitFile(useBrandStore.getState().kit)}
				>
					<Download />
					Export
				</Button>
			</div>
		</div>
	);
};

export default BrandKitPanel;
