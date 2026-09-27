import React, { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getFilesBridge } from '@/lib/persistence/desktop-files';

/**
 * Where exported images go on the desktop: the folder Agent and MCP clients
 * write to without a dialog, and where "Save as" opens. Nothing on the web.
 */
export const ExportFolderField: React.FC<{ hint?: string }> = ({ hint }) => {
	const files = getFilesBridge();
	const [folder, setFolder] = useState<string | null>(null);

	useEffect(() => {
		if (!files?.getExportFolder) return;
		let active = true;
		void files.getExportFolder().then((path) => {
			if (active) setFolder(path);
		});
		return () => {
			active = false;
		};
	}, [files]);

	if (!files?.getExportFolder || folder === null) return null;

	return (
		<div className='flex flex-col gap-1.5'>
			<Label className='text-xs font-normal text-muted-foreground'>
				Export folder
			</Label>
			<div className='flex items-center gap-1'>
				<button
					type='button'
					title={`Open ${folder}`}
					onClick={() => void files.reveal?.(folder)}
					className='flex h-8 min-w-0 flex-1 items-center gap-2 rounded-control border border-input bg-background px-2 text-left transition-colors hover:border-ring/60'
				>
					<FolderOpen className='size-3.5 shrink-0 text-muted-foreground' />
					<span className='truncate font-mono text-[11px] text-foreground'>
						{folder}
					</span>
				</button>
				<Button
					variant='outline'
					size='sm'
					onClick={async () => {
						const chosen = await files.chooseExportFolder?.();
						if (chosen) setFolder(chosen);
					}}
				>
					Change…
				</Button>
			</div>
			{hint && <p className='text-[11px] text-muted-foreground'>{hint}</p>}
		</div>
	);
};
