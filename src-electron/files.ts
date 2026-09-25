import { BrowserWindow, dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

/**
 * Writing files the app produced (projects, for now) from the main process.
 *
 * The renderer could only download them, and Electron's download dialog
 * suggests the `blob:` id as the file name, so the desktop app asks here
 * instead and gets a real "Save as" dialog.
 */

const MAX_TEXT_BYTES = 200 * 1024 * 1024;

interface SaveTextInput {
	defaultName: string;
	text: string;
	extensions: string[];
	filterName: string;
}

const isSaveTextInput = (value: unknown): value is SaveTextInput => {
	const input = value as SaveTextInput;
	return (
		typeof input === 'object' &&
		input !== null &&
		typeof input.defaultName === 'string' &&
		typeof input.text === 'string' &&
		input.text.length <= MAX_TEXT_BYTES &&
		typeof input.filterName === 'string' &&
		Array.isArray(input.extensions) &&
		input.extensions.every(
			(extension) =>
				typeof extension === 'string' && /^[a-z0-9]+$/i.test(extension),
		)
	);
};

export const registerFiles = (): void => {
	ipcMain.handle(
		'karbonized:files:save-text',
		async (event, input: unknown): Promise<string | null> => {
			if (!isSaveTextInput(input)) throw new Error('Invalid save request');

			const window = BrowserWindow.fromWebContents(event.sender);
			const options = {
				// The name comes from the page, so keep only its last segment.
				defaultPath: basename(input.defaultName),
				filters: [
					{ name: input.filterName, extensions: input.extensions },
					{ name: 'All files', extensions: ['*'] },
				],
			};

			const { canceled, filePath } =
				window === null
					? await dialog.showSaveDialog(options)
					: await dialog.showSaveDialog(window, options);

			if (canceled || filePath === undefined) return null;

			await writeFile(filePath, input.text, 'utf8');
			return filePath;
		},
	);
};
