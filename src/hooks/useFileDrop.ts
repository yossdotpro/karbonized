import { useEffect } from 'react';

/**
 * Files dropped anywhere on the window.
 *
 * Without this the browser would navigate away from the editor and the open
 * project would be gone, so every file drop is swallowed; `onFiles` only gets
 * the ones whose name ends with one of `extensions`. Drops that a block
 * already handled (an image dropped on an image block) stop before they reach
 * the window.
 */
export const useFileDrop = (
	extensions: string[],
	onFiles: (files: File[]) => void,
): void => {
	useEffect(() => {
		const hasFiles = (event: DragEvent): boolean =>
			event.dataTransfer?.types.includes('Files') ?? false;

		const onDragOver = (event: DragEvent) => {
			if (!hasFiles(event) || event.defaultPrevented) return;
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		};

		const onDrop = (event: DragEvent) => {
			if (!hasFiles(event) || event.defaultPrevented) return;
			event.preventDefault();

			const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
				extensions.some((extension) =>
					file.name.toLowerCase().endsWith(extension),
				),
			);

			if (files.length > 0) onFiles(files);
		};

		window.addEventListener('dragover', onDragOver);
		window.addEventListener('drop', onDrop);
		return () => {
			window.removeEventListener('dragover', onDragOver);
			window.removeEventListener('drop', onDrop);
		};
	}, [extensions.join(','), onFiles]);
};
