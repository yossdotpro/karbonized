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
	/**
	 * Write an exported image. Without `ask` it goes straight to the export
	 * folder under a free name; with it, a "Save as" dialog opens there.
	 * Returns the path, or `null` if the dialog was cancelled.
	 */
	saveImage?: (input: {
		name: string;
		extension: 'png' | 'jpg' | 'svg';
		/** Base64 for png and jpg, the markup for svg. */
		data: string;
		ask: boolean;
	}) => Promise<string | null>;
	/** Where images are exported (default: Pictures/Karbonized). */
	getExportFolder?: () => Promise<string>;
	/** Pick another export folder; `null` if cancelled. */
	chooseExportFolder?: () => Promise<string | null>;
	/** Show an exported file (or the export folder) in the file manager. */
	reveal?: (path: string) => Promise<void>;
}

export const getFilesBridge = (): FilesBridge | undefined =>
	typeof window === 'undefined' ? undefined : window.karbonized?.files;
