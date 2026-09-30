import { useEffect } from 'react';
import { toast } from 'sonner';
import {
	BRAND_FILE_EXTENSION,
	importBrandKitFile,
} from '@/components/Brand/BrandKitEditor';
import {
	getFilesBridge,
	type OpenedFile,
} from '@/lib/persistence/desktop-files';
import { ProjectFileError } from '@/lib/persistence/project-file';
import { openProjectFile } from '@/lib/persistence/project-io';
import { currentPath, navigateTo } from '@/lib/routing';
import { useUIStore } from '@/stores';

const openFile = async ({ name, text }: OpenedFile): Promise<void> => {
	const file = new File([text], name);

	if (name.toLowerCase().endsWith(BRAND_FILE_EXTENSION)) {
		if (!(await importBrandKitFile(file))) return;
		// In the editor the kit has its own tab; show it.
		if (currentPath() === '/editor') {
			const ui = useUIStore.getState();
			ui.setSelectedTab('brand');
			ui.setPropertiesOpen(true);
		}
		return;
	}

	try {
		const project = await openProjectFile(file);
		navigateTo('/editor');
		toast.success(`Opened ${project.name}`);
	} catch (error) {
		console.error(error);
		toast.error(
			error instanceof ProjectFileError
				? error.message
				: 'Could not open the project file',
			{ description: name },
		);
	}
};

/**
 * Opens the `.kproject` and `.kbrand` files the desktop app was started with
 * from the file manager (`src-electron/open-files.ts`). Renders nothing.
 */
export const OpenedFiles = () => {
	useEffect(() => {
		let queue = Promise.resolve();
		return getFilesBridge()?.onOpen?.((file) => {
			// One at a time: each project opens next to the ones before it.
			queue = queue.then(() => openFile(file));
		});
	}, []);

	return null;
};

export default OpenedFiles;
