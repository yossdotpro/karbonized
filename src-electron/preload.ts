import { contextBridge, ipcRenderer, app, shell } from 'electron';
import type { FilesBridge } from '../src/lib/persistence/desktop-files';
import type {
	AgentBridge,
	HttpBridgeEvent,
	McpRequest,
	McpResponse,
	McpStatus,
} from '../src/lib/agent/bridge';

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

const agent: AgentBridge = {
	keys: {
		set: (profileId, key, baseUrl) =>
			ipcRenderer.invoke('agent:keys:set', profileId, key, baseUrl),
		remove: (profileId) => ipcRenderer.invoke('agent:keys:remove', profileId),
		has: (profileId, baseUrl) =>
			ipcRenderer.invoke('agent:keys:has', profileId, baseUrl),
	},
	http: {
		request: (requestId, profileId, request) =>
			ipcRenderer.send('agent:http:request', requestId, profileId, request),
		abort: (requestId) => ipcRenderer.send('agent:http:abort', requestId),
		onEvent: subscribe<HttpBridgeEvent>('agent:http:event'),
	},
	mcp: {
		getStatus: () => ipcRenderer.invoke('agent:mcp:status'),
		setEnabled: (enabled) =>
			ipcRenderer.invoke('agent:mcp:set-enabled', enabled),
		setPort: (port) => ipcRenderer.invoke('agent:mcp:set-port', port),
		regenerateToken: () => ipcRenderer.invoke('agent:mcp:regenerate-token'),
		onStatus: subscribe<McpStatus>('agent:mcp:status-changed'),
		onRequest: subscribe<McpRequest>('agent:mcp:request'),
		respond: (response: McpResponse) =>
			ipcRenderer.send('agent:mcp:response', response),
	},
};

const files: FilesBridge = {
	saveText: (input) => ipcRenderer.invoke('karbonized:files:save-text', input),
};

contextBridge.exposeInMainWorld('karbonized', { agent, files });
