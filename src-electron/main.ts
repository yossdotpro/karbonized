import { app, BrowserWindow, ipcMain, Menu, nativeImage } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import * as fs from 'node:fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerBeedlyHttp } from './beedly/http';
import { registerMcpServer } from './mcp/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadExtensions = async (event: Electron.IpcMainEvent) => {
	/* Create Extensions Folder */
	mkdirSync(join(app.getPath('appData'), 'karbonized', 'extensions'), {
		recursive: true,
	});

	event.reply('loading_extensions', true);

	const extensionsPath = join(
		app.getPath('appData'),
		'karbonized',
		'extensions',
	);

	const extensions = (await fs.readdir(extensionsPath)).filter((item) =>
		item.endsWith('.kext'),
	);

	const loadedExtensions: Extension[] = [];

	for (const extension of extensions) {
		const newExtension = JSON.parse(
			await fs.readFile(join(extensionsPath, extension), 'utf-8'),
		);

		loadedExtensions.push(newExtension);

		event.reply('extension_loaded', newExtension);
	}

	/* Write Extensions Data */
	await fs.writeFile(
		join(app.getPath('appData'), 'karbonized', 'extensions_data.json'),
		JSON.stringify(loadedExtensions),
	);

	event.reply('extensions_loaded', loadedExtensions);
	event.reply('loading_extensions', false);
};

app.whenReady().then(() => {
	registerBeedlyHttp();

	const icon = nativeImage.createFromPath(
		join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
	);

	const win = new BrowserWindow({
		title: 'Karbonized',
		icon: icon,
		width: 800,
		height: 600,
		minHeight: 600,
		minWidth: 900,
		useContentSize: true,
		frame: process.platform === 'darwin',
		titleBarStyle: 'hidden',

		webPreferences: {
			preload: join(__dirname, 'preload.cjs'),
			sandbox: false,
			// MCP clients edit the canvas while Karbonized is in the background;
			// throttled timers would stall their tool calls.
			backgroundThrottling: false,
		},
	});

	void registerMcpServer({
		getWindow: () => (win.isDestroyed() ? null : win),
		buildDir: __dirname,
	});

	if (!process.env.VITE_DEV_SERVER_URL) {
		app.applicationMenu = new Menu();
	}

	win.maximize();

	// You can use `process.env.VITE_DEV_SERVER_URL` when the vite command is called `serve`
	if (process.env.VITE_DEV_SERVER_URL) {
		win.loadURL(process.env.VITE_DEV_SERVER_URL);
		win.webContents.openDevTools({ mode: 'detach' });
	} else {
		// Load your file
		win.loadFile('dist/index.html');
	}

	ipcMain.on('maximizeApp', (event) => {
		if (win.isMaximized()) {
			win.unmaximize();
			event.reply('maximizedStatus', win.isMaximized());
		} else {
			win.maximize();
			event.reply('maximizedStatus', win.isMaximized());
		}
	});

	ipcMain.on('minimizeApp', () => {
		win.minimize();
	});

	ipcMain.on('closeApp', () => {
		win.close();
	});

	ipcMain.on('getAppData', async (event) => {
		const load = async () => {
			if (
				existsSync(
					join(app.getPath('appData'), 'karbonized', 'extensions_data.json'),
				)
			) {
				const data = JSON.parse(
					await fs.readFile(
						join(app.getPath('appData'), 'karbonized', 'extensions_data.json'),
						'utf-8',
					),
				);

				event.reply('extensions_loaded', data);
			} else {
				await loadExtensions(event);
			}
		};

		await load();
	});

	ipcMain.on('reloadExtensions', async (event) => {
		await loadExtensions(event);
	});
});

interface Extension {
	info?: {
		name: string;
		author: string;
		description: string;
		version: string;
	};
	logo: string;
	components: { properties?: {}; code?: string; image?: string }[];
}
