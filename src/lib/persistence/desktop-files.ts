/**
 * Saving files from the desktop app.
 *
 * In the browser the only way out is a download, and Electron turns that into
 * a download of a `blob:` URL: its save dialog then suggests the blob id as
 * the file name. On the desktop the main process writes the file instead,
 * through a proper "Save as" dialog (`src-electron/files.ts`).
 */

export interface FilesBridge {
	/** Returns the path that was written, or `null` if the dialog was cancelled. */
	saveText: (input: {
		defaultName: string;
		text: string;
		/** Extensions offered by the dialog, without the dot. */
		extensions: string[];
		filterName: string;
	}) => Promise<string | null>;
}

export const getFilesBridge = (): FilesBridge | undefined =>
	typeof window === 'undefined' ? undefined : window.karbonized?.files;
