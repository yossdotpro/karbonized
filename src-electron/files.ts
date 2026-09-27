import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve, sep } from 'node:path';

/**
 * Writing files the app produced (projects and images) from the main process.
 *
 * The renderer could only download them, and Electron's download dialog
 * suggests the `blob:` id as the file name, so the desktop app asks here
 * instead and gets a real "Save as" dialog. Images can also go straight to
 * the export folder without a dialog, which is what Agent and MCP clients use.
 */

const MAX_TEXT_BYTES = 200 * 1024 * 1024;
const MAX_IMAGE_BYTES = 200 * 1024 * 1024;
const IMAGE_EXTENSIONS = ['png', 'jpg', 'svg'] as const;

interface SaveTextInput {
	defaultName: string;
	text: string;
	extensions: string[];
	filterName: string;
}

interface SaveImageInput {
	name: string;
	extension: (typeof IMAGE_EXTENSIONS)[number];
	/** Base64 for png and jpg, the markup for svg. */
	data: string;
	/** Show a "Save as" dialog (opened in the export folder). */
	ask: boolean;
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

const isSaveImageInput = (value: unknown): value is SaveImageInput => {
	const input = value as SaveImageInput;
	return (
		typeof input === 'object' &&
		input !== null &&
		typeof input.name === 'string' &&
		IMAGE_EXTENSIONS.includes(input.extension) &&
		typeof input.data === 'string' &&
		input.data.length <= MAX_IMAGE_BYTES &&
		typeof input.ask === 'boolean'
	);
};

/** A file name from the page: its last segment, without reserved characters. */
export const safeFileName = (name: string): string =>
	basename(name.replace(/\\/g, '/'))
		.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-')
		.replace(/^[.\s]+|[.\s]+$/g, '')
		.slice(0, 120) || 'karbonized';

const settingsFile = () => join(app.getPath('userData'), 'files.json');

const defaultExportFolder = () => join(app.getPath('pictures'), 'Karbonized');

const readExportFolder = async (): Promise<string> => {
	try {
		const data = JSON.parse(await readFile(settingsFile(), 'utf-8'));
		if (typeof data.exportFolder === 'string' && data.exportFolder) {
			return data.exportFolder;
		}
	} catch {
		// No settings yet.
	}
	return defaultExportFolder();
};

const writeExportFolder = (folder: string) =>
	writeFile(settingsFile(), JSON.stringify({ exportFolder: folder }, null, 2));

const exists = async (path: string) => {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
};

/** `name.png`, or `name-2.png`… when that is taken. Never overwrites. */
const freePath = async (folder: string, name: string, extension: string) => {
	for (let index = 1; index < 10_000; index++) {
		const suffix = index === 1 ? '' : `-${index}`;
		const path = join(folder, `${name}${suffix}.${extension}`);
		if (!(await exists(path))) return path;
	}
	throw new Error('Could not find a free file name.');
};

const imageBytes = (input: SaveImageInput) =>
	input.extension === 'svg'
		? Buffer.from(input.data, 'utf8')
		: Buffer.from(input.data, 'base64');

/** Files written by this session, the only ones `reveal` shows. */
const writtenFiles = new Set<string>();

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

	ipcMain.handle(
		'karbonized:files:save-image',
		async (event, input: unknown): Promise<string | null> => {
			if (!isSaveImageInput(input)) throw new Error('Invalid save request');

			const folder = await readExportFolder();
			await mkdir(folder, { recursive: true });
			const name = safeFileName(input.name);
			let filePath: string;

			if (input.ask) {
				const window = BrowserWindow.fromWebContents(event.sender);
				const options = {
					defaultPath: await freePath(folder, name, input.extension),
					filters: [
						{
							name: input.extension.toUpperCase(),
							extensions: [input.extension],
						},
					],
				};
				const result =
					window === null || !window.isVisible()
						? await dialog.showSaveDialog(options)
						: await dialog.showSaveDialog(window, options);
				if (result.canceled || result.filePath === undefined) return null;
				filePath = result.filePath;
				if (extname(filePath) === '') filePath += `.${input.extension}`;
			} else {
				filePath = await freePath(folder, name, input.extension);
			}

			await writeFile(filePath, imageBytes(input));
			writtenFiles.add(resolve(filePath));
			return filePath;
		},
	);

	ipcMain.handle('karbonized:files:export-folder', () => readExportFolder());

	ipcMain.handle(
		'karbonized:files:choose-export-folder',
		async (event): Promise<string | null> => {
			const window = BrowserWindow.fromWebContents(event.sender);
			const options = {
				defaultPath: await readExportFolder(),
				properties: ['openDirectory', 'createDirectory'] as Array<
					'openDirectory' | 'createDirectory'
				>,
			};
			const { canceled, filePaths } =
				window === null
					? await dialog.showOpenDialog(options)
					: await dialog.showOpenDialog(window, options);
			if (canceled || !filePaths[0]) return null;
			await writeExportFolder(filePaths[0]);
			return filePaths[0];
		},
	);

	ipcMain.handle(
		'karbonized:files:reveal',
		async (_event, path: unknown): Promise<void> => {
			if (typeof path !== 'string') return;
			const target = resolve(path);
			const folder = resolve(await readExportFolder());
			// Only files this app wrote, or the export folder itself.
			if (target === folder) {
				await mkdir(folder, { recursive: true });
				await shell.openPath(folder);
			} else if (writtenFiles.has(target) || target.startsWith(folder + sep)) {
				shell.showItemInFolder(target);
			}
		},
	);
};
