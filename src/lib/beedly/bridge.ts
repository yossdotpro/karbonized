import type { HttpRequest } from './core/types';
import type { ToolDescriptor, ToolResult } from './tools/registry';

/**
 * API the Electron preload exposes as `window.karbonized.beedly`. Absent on
 * the web, Android and Tauri.
 */

export type HttpBridgeEvent =
	| { requestId: string; type: 'response'; status: number; ok: boolean }
	| { requestId: string; type: 'chunk'; chunk: string }
	| { requestId: string; type: 'end' }
	| { requestId: string; type: 'error'; message: string; aborted?: boolean };

export interface McpStatus {
	enabled: boolean;
	running: boolean;
	port: number;
	url: string;
	token: string;
	/** Absolute path of the stdio proxy script, for clients without HTTP. */
	stdioProxyPath: string;
	/** Executable that runs the proxy (the app itself, as Node). */
	executablePath: string;
	/** Last time a client called the server (ms since epoch). */
	lastClientAt: number | null;
	error: string | null;
}

export interface McpToolCall {
	callId: string;
	name: string;
	args: unknown;
}

export type McpRequest =
	| { requestId: string; type: 'list-tools' }
	| ({ requestId: string; type: 'call-tool' } & McpToolCall);

export type McpResponse =
	| { requestId: string; type: 'list-tools'; tools: ToolDescriptor[] }
	| { requestId: string; type: 'call-tool'; result: ToolResult };

export interface BeedlyBridge {
	keys: {
		set: (profileId: string, key: string) => Promise<void>;
		remove: (profileId: string) => Promise<void>;
		has: (profileId: string) => Promise<boolean>;
	};
	http: {
		request: (
			requestId: string,
			profileId: string,
			request: HttpRequest,
		) => void;
		abort: (requestId: string) => void;
		onEvent: (listener: (event: HttpBridgeEvent) => void) => () => void;
	};
	mcp: {
		getStatus: () => Promise<McpStatus>;
		setEnabled: (enabled: boolean) => Promise<McpStatus>;
		setPort: (port: number) => Promise<McpStatus>;
		regenerateToken: () => Promise<McpStatus>;
		onStatus: (listener: (status: McpStatus) => void) => () => void;
		onRequest: (listener: (request: McpRequest) => void) => () => void;
		respond: (response: McpResponse) => void;
	};
}

declare global {
	interface Window {
		karbonized?: { beedly?: BeedlyBridge };
	}
}

export const getBeedlyBridge = (): BeedlyBridge | undefined =>
	typeof window === 'undefined' ? undefined : window.karbonized?.beedly;
