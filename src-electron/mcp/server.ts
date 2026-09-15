import { app, ipcMain, type BrowserWindow } from 'electron';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import {
	createServer,
	type IncomingMessage,
	type Server as HttpServer,
	type ServerResponse,
} from 'node:http';
import { join } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type {
	McpRequestPayload,
	McpResponse,
	McpStatus,
} from '../../src/lib/beedly/bridge';
import { createRequestBroker } from '../../src/lib/beedly/mcp/broker';
import {
	checkMcpRequest,
	createToken,
} from '../../src/lib/beedly/mcp/security';

/**
 * Local MCP server: lets MCP clients (Claude Desktop, Claude Code, Cursor…)
 * control Karbonized with the same tools Beedly uses.
 *
 * Streamable HTTP on 127.0.0.1, stateless, behind a bearer token. Tool calls
 * are forwarded to the editor window, where the tools run.
 */

const DEFAULT_PORT = 7824;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
/** Exporting large images can take a while. */
const TOOL_TIMEOUT_MS = 120_000;

interface McpSettings {
	enabled: boolean;
	port: number;
	token: string;
}

const settingsFile = () => join(app.getPath('userData'), 'beedly-mcp.json');

const loadSettings = async (): Promise<McpSettings> => {
	try {
		const data = JSON.parse(await readFile(settingsFile(), 'utf-8'));
		return {
			enabled: data.enabled === true,
			port: Number.isInteger(data.port) ? data.port : DEFAULT_PORT,
			token:
				typeof data.token === 'string' && data.token.length >= 32
					? data.token
					: createToken(randomBytes(24)),
		};
	} catch {
		return {
			enabled: false,
			port: DEFAULT_PORT,
			token: createToken(randomBytes(24)),
		};
	}
};

const saveSettings = (settings: McpSettings) =>
	writeFile(settingsFile(), JSON.stringify(settings, null, 2), { mode: 0o600 });

/** The stdio bridge must be readable by plain Node, outside the asar archive. */
const stdioProxyPath = (buildDir: string) =>
	join(buildDir, 'mcp-stdio.cjs').replace(
		/app\.asar([\\/])/,
		'app.asar.unpacked$1',
	);

const readBody = (request: IncomingMessage): Promise<unknown> =>
	new Promise((resolve, reject) => {
		let size = 0;
		const chunks: Buffer[] = [];
		request.on('data', (chunk: Buffer) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				reject(new Error('Request body too large.'));
				request.destroy();
				return;
			}
			chunks.push(chunk);
		});
		request.on('end', () => {
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
			} catch {
				reject(new Error('Invalid JSON.'));
			}
		});
		request.on('error', reject);
	});

const sendJsonError = (
	response: ServerResponse,
	status: number,
	message: string,
) => {
	if (response.headersSent) return;
	response.writeHead(status, {
		'content-type': 'application/json',
		...(status === 401 && { 'www-authenticate': 'Bearer' }),
	});
	response.end(
		JSON.stringify({
			jsonrpc: '2.0',
			error: { code: -32000, message },
			id: null,
		}),
	);
};

export const registerMcpServer = async (options: {
	getWindow: () => BrowserWindow | null;
	/** Folder of the built main process (where `mcp-stdio.cjs` is). */
	buildDir: string;
}) => {
	const { getWindow, buildDir } = options;
	let settings = await loadSettings();
	let httpServer: HttpServer | null = null;
	let running = false;
	let error: string | null = null;
	let lastClientAt: number | null = null;
	let lastBroadcast = 0;

	const status = (): McpStatus => ({
		enabled: settings.enabled,
		running,
		port: settings.port,
		url: `http://127.0.0.1:${settings.port}/mcp`,
		token: settings.token,
		stdioProxyPath: stdioProxyPath(buildDir),
		executablePath: process.execPath,
		lastClientAt,
		error,
	});

	const broadcast = () => {
		lastBroadcast = Date.now();
		const window = getWindow();
		if (window && !window.isDestroyed()) {
			window.webContents.send('beedly:mcp:status-changed', status());
		}
	};

	const broker = createRequestBroker<McpRequestPayload, McpResponse>({
		send: (request) => {
			const window = getWindow();
			if (!window || window.isDestroyed()) return false;
			window.webContents.send('beedly:mcp:request', request);
			return true;
		},
		timeoutMs: TOOL_TIMEOUT_MS,
		unavailableMessage: 'Karbonized has no open window.',
		timeoutMessage:
			'Karbonized did not answer in time. Make sure a project is open in the editor.',
	});

	ipcMain.on('beedly:mcp:response', (_event, response: McpResponse) => {
		if (response && typeof response.requestId === 'string') {
			broker.resolve(response);
		}
	});

	const createMcpServer = () => {
		const server = new Server(
			{ name: 'karbonized', version: app.getVersion() },
			{
				capabilities: { tools: {} },
				instructions:
					'Karbonized is an editor for images of code snippets and mockups. Tools act on the project open in the editor: call get_workspace first and use the block ids it returns. Every tool call can be undone in the app.',
			},
		);

		server.setRequestHandler(ListToolsRequestSchema, async () => {
			const response = await broker.request({ type: 'list-tools' });
			if (response.type !== 'list-tools')
				throw new Error('Unexpected response.');
			return {
				tools: response.tools.map((tool) => ({
					name: tool.name,
					title: tool.title,
					description: tool.description,
					inputSchema: tool.inputSchema as { type: 'object' },
					annotations: {
						title: tool.title,
						readOnlyHint: !tool.mutates,
					},
				})),
			};
		});

		server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const response = await broker.request({
				type: 'call-tool',
				callId: String(Date.now()),
				name: request.params.name,
				args: request.params.arguments ?? {},
			});
			if (response.type !== 'call-tool')
				throw new Error('Unexpected response.');
			return { ...response.result };
		});

		return server;
	};

	const handleRequest = async (
		request: IncomingMessage,
		response: ServerResponse,
	) => {
		const url = new URL(request.url ?? '/', 'http://127.0.0.1');
		if (url.pathname !== '/mcp') {
			sendJsonError(response, 404, 'Not found.');
			return;
		}

		const check = checkMcpRequest(
			{
				method: request.method ?? '',
				host: request.headers.host,
				origin: request.headers.origin,
				authorization: request.headers.authorization,
			},
			settings,
		);
		if (!check.ok) {
			sendJsonError(response, check.status, check.message);
			return;
		}

		lastClientAt = Date.now();
		if (lastClientAt - lastBroadcast > 2000) broadcast();

		try {
			const body = await readBody(request);
			// Stateless: a fresh server and transport for every request.
			const server = createMcpServer();
			const transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
			});
			response.on('close', () => {
				void transport.close();
				void server.close();
			});
			await server.connect(transport);
			await transport.handleRequest(request, response, body);
		} catch (requestError) {
			sendJsonError(
				response,
				400,
				requestError instanceof Error ? requestError.message : 'Bad request.',
			);
		}
	};

	const stop = () =>
		new Promise<void>((resolve) => {
			if (!httpServer) {
				resolve();
				return;
			}
			httpServer.close(() => resolve());
			httpServer.closeAllConnections();
			httpServer = null;
			running = false;
		});

	const start = () =>
		new Promise<void>((resolve) => {
			const server = createServer((request, response) => {
				void handleRequest(request, response);
			});
			server.once('error', (listenError: NodeJS.ErrnoException) => {
				running = false;
				httpServer = null;
				error =
					listenError.code === 'EADDRINUSE'
						? `Port ${settings.port} is already in use. Choose another port.`
						: listenError.message;
				resolve();
			});
			server.listen(settings.port, '127.0.0.1', () => {
				httpServer = server;
				running = true;
				error = null;
				resolve();
			});
		});

	const apply = async () => {
		await stop();
		error = null;
		if (settings.enabled) await start();
		broadcast();
		return status();
	};

	ipcMain.handle('beedly:mcp:status', () => status());

	ipcMain.handle('beedly:mcp:set-enabled', async (_event, enabled: unknown) => {
		settings = { ...settings, enabled: enabled === true };
		await saveSettings(settings);
		return apply();
	});

	ipcMain.handle('beedly:mcp:set-port', async (_event, port: unknown) => {
		if (
			!Number.isInteger(port) ||
			(port as number) < 1024 ||
			(port as number) > 65535
		) {
			throw new Error('Use a port between 1024 and 65535.');
		}
		settings = { ...settings, port: port as number };
		await saveSettings(settings);
		return apply();
	});

	ipcMain.handle('beedly:mcp:regenerate-token', async () => {
		settings = { ...settings, token: createToken(randomBytes(24)) };
		await saveSettings(settings);
		broadcast();
		return status();
	});

	await saveSettings(settings);
	if (settings.enabled) await start();

	app.on('before-quit', () => {
		broker.rejectAll('Karbonized is closing.');
		void stop();
	});
};
