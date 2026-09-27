import { toast } from 'sonner';
import { getFilesBridge } from '@/lib/persistence/desktop-files';
import type { SaveResult } from './exporter';

/** After an export from the UI: say where the file went (desktop only). */
export const toastSaved = (result: SaveResult | null): void => {
	if (result?.kind !== 'file') return;
	const files = getFilesBridge();
	const name = result.path.split(/[\\/]/).pop() ?? result.path;
	toast.success(`Saved ${name}`, {
		description: result.path,
		action: files?.reveal && {
			label: 'Show',
			onClick: () => void files.reveal?.(result.path),
		},
	});
};
