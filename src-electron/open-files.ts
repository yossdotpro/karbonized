import { app, BrowserWindow, ipcMain } from 'electron';
import { readFile, stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { OpenedFile } from '../src/lib/persistence/desktop-files';

/**
 * Files opened with Karbonized from the file manager (`.kproject`, `.kbrand`).
 *
 * The installers register both extensions (`fileAssociations` in
 * electron-builder.json), so a double click starts the app with the path in
 * its arguments (Windows, Linux), hands it to the running one through
 * `second-instance`, or sends `open-file` (macOS). The paths wait here until
 * the editor says it can take them, then each file goes to it as text.
 */

export const OPENABLE_EXTENSIONS = ['.kproject', '.kbrand'];

const MAX_FILE_BYTES = 200 * 1024 * 1024;

/** The arguments that are files Karbonized opens. */
export const openablePaths = (argv: readonly string[]): string[] =>
	argv
		.slice(1)
		.filter(
			(arg) =>
				!arg.startsWith('-') &&
				OPENABLE_EXTENSIONS.includes(extname(arg).toLowerCase()),
		);

const pending: string[] = [];
let target: Electron.WebContents | null = null;

const deliver = async () => {
	while (target && !target.isDestroyed() && pending.length > 0) {
		const path = pending.shift()!;
		try {
			if ((await stat(path)).size > MAX_FILE_BYTES) continue;
			const file: OpenedFile = {
				name: basename(path),
				text: await readFile(path, 'utf-8'),
			};
			target.send('karbonized:files:opened', file);
		} catch {
			// Moved or unreadable since it was opened: nothing to show.
		}
	}
};

/** Queue files to open, from the arguments of a launch. */
export const openFilesFrom = (argv: readonly string[]): boolean => {
	const paths = openablePaths(argv);
	pending.push(...paths);
	void deliver();
	return paths.length > 0;
};

/**
 * Call before `app.whenReady()`: macOS sends `open-file` for the file that
 * launched the app before it is ready.
 */
export const registerOpenFiles = (): void => {
	openFilesFrom(process.argv);

	app.on('open-file', (event, path) => {
		event.preventDefault();
		pending.push(path);
		void deliver();
		BrowserWindow.getAllWindows()[0]?.show();
	});

	// The editor listens (again after a reload): send what is waiting.
	ipcMain.on('karbonized:files:opened-ready', (event) => {
		target = event.sender;
		void deliver();
	});
};
