import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import * as fs from 'node:fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerAgentHttp } from './agent/http';
import { registerFiles } from './files';
import { type McpServerHandle, registerMcpServer } from './mcp/server';

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

/**
 * `--background`: start without showing the window (the MCP stdio bridge
 * and the login item start the app this way). The editor still loads, so
 * MCP clients can use it; the tray icon opens it.
 */
const shouldStartInBackground = () =>
	process.argv.includes('--background') ||
	(process.platform === 'darwin' &&
		app.getLoginItemSettings().wasOpenedAsHidden);

// One Karbonized at a time: a second launch shows the running one (and a
// second MCP server would find its port taken anyway).
const isPrimaryInstance = app.requestSingleInstanceLock();
if (!isPrimaryInstance) app.quit();

let quitting = false;
app.on('before-quit', () => {
	quitting = true;
});

app.whenReady().then(async () => {
	if (!isPrimaryInstance) return;
	const startsInBackground = shouldStartInBackground();
	registerAgentHttp();
	registerFiles();

	const icon = nativeImage.createFromPath(
		join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
	);

	const win = new BrowserWindow({
		show: !startsInBackground,
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

	const showWindow = () => {
		if (win.isDestroyed()) return;
		if (win.isMinimized()) win.restore();
		if (!win.isVisible()) {
			win.show();
			if (startsInBackground) updateTray();
			else win.maximize();
		}
		win.focus();
	};

	/* Tray icon while the window is hidden and the MCP server keeps running */
	let tray: Tray | null = null;
	let mcp: McpServerHandle | null = null;

	const trayMenu = () =>
		Menu.buildFromTemplate([
			{ label: 'Open Karbonized', click: showWindow },
			{ type: 'separator' },
			{
				label: mcp?.status().running
					? `MCP server on port ${mcp.status().port}`
					: 'MCP server off',
				enabled: false,
			},
			{ type: 'separator' },
			{ label: 'Quit Karbonized', click: () => app.quit() },
		]);

	const updateTray = () => {
		const needed = !win.isDestroyed() && !win.isVisible();
		if (!needed) {
			tray?.destroy();
			tray = null;
			return;
		}
		if (!tray) {
			const trayIcon = icon.isEmpty()
				? icon
				: icon.resize({ width: 16, height: 16 });
			tray = new Tray(trayIcon);
			tray.setToolTip('Karbonized — running in the background for MCP clients');
			tray.on('click', showWindow);
		}
		tray.setContextMenu(trayMenu());
	};

	mcp = await registerMcpServer({
		getWindow: () => (win.isDestroyed() ? null : win),
		buildDir: __dirname,
	});
	mcp.onStatus(() => {
		if (tray) tray.setContextMenu(trayMenu());
	});

	// Closing the window hides it while MCP clients may still need the editor.
	win.on('close', (event) => {
		if (quitting || !mcp?.keepsRunningInBackground()) return;
		event.preventDefault();
		win.hide();
	});
	win.on('hide', updateTray);
	win.on('show', updateTray);

	app.on('second-instance', (_event, argv) => {
		if (!argv.includes('--background')) showWindow();
	});
	// macOS: clicking the Dock icon brings the window back.
	app.on('activate', showWindow);

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
