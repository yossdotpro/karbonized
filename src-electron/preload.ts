import { contextBridge, ipcRenderer, app, shell } from 'electron';
import type {
	BeedlyBridge,
	HttpBridgeEvent,
	McpRequest,
	McpResponse,
	McpStatus,
} from '../src/lib/beedly/bridge';

document.addEventListener('click', (event: any) => {
	if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
		event.preventDefault();
		shell.openExternal(event.target.href);
	}
});

window.addEventListener('DOMContentLoaded', () => {});

export type Channels = 'minimizeApp' | 'maximizeApp' | 'closeApp';

contextBridge.exposeInMainWorld('electron', {
	ipcRenderer: {
		sendMessage(channel: Channels, args: unknown[]) {
			ipcRenderer.send(channel, args);
		},
		on(
			channel: string,
			listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
		) {
			ipcRenderer.on(channel, listener);
		},

		once(
			channel: string,
			listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
		) {
			ipcRenderer.once(channel, listener);
		},

		isLinux() {
			return process.platform === 'linux';
		},

		isWindow() {
			return process.platform === 'win32';
		},

		isMac() {
			return process.platform === 'darwin';
		},

		isLinuxOrWindows() {
			return process.platform === 'win32' || process.platform === 'linux';
		},

		getAppData() {
			console.log(app.getPath('appData'));
		},
	},
});

/** Subscribe to a main process channel; returns the unsubscribe function. */
const subscribe =
	<T>(channel: string) =>
	(listener: (payload: T) => void) => {
		const handler = (_event: Electron.IpcRendererEvent, payload: T) =>
			listener(payload);
		ipcRenderer.on(channel, handler);
		return () => {
			ipcRenderer.removeListener(channel, handler);
		};
	};

const beedly: BeedlyBridge = {
	keys: {
		set: (profileId, key, baseUrl) =>
			ipcRenderer.invoke('beedly:keys:set', profileId, key, baseUrl),
		remove: (profileId) => ipcRenderer.invoke('beedly:keys:remove', profileId),
		has: (profileId, baseUrl) =>
			ipcRenderer.invoke('beedly:keys:has', profileId, baseUrl),
	},
	http: {
		request: (requestId, profileId, request) =>
			ipcRenderer.send('beedly:http:request', requestId, profileId, request),
		abort: (requestId) => ipcRenderer.send('beedly:http:abort', requestId),
		onEvent: subscribe<HttpBridgeEvent>('beedly:http:event'),
	},
	mcp: {
		getStatus: () => ipcRenderer.invoke('beedly:mcp:status'),
		setEnabled: (enabled) =>
			ipcRenderer.invoke('beedly:mcp:set-enabled', enabled),
		setPort: (port) => ipcRenderer.invoke('beedly:mcp:set-port', port),
		regenerateToken: () => ipcRenderer.invoke('beedly:mcp:regenerate-token'),
		onStatus: subscribe<McpStatus>('beedly:mcp:status-changed'),
		onRequest: subscribe<McpRequest>('beedly:mcp:request'),
		respond: (response: McpResponse) =>
			ipcRenderer.send('beedly:mcp:response', response),
	},
};

contextBridge.exposeInMainWorld('karbonized', { beedly });
