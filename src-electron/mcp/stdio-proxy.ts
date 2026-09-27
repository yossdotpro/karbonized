/**
 * stdio bridge to the Karbonized MCP server, for MCP clients that only start
 * local processes (e.g. Claude Desktop).
 *
 * Runs with plain Node or with the Karbonized executable and
 * ELECTRON_RUN_AS_NODE=1. Reads JSON-RPC messages (one per line) from stdin,
 * posts them to the app's Streamable HTTP endpoint and writes the replies to
 * stdout. Configuration comes from KARBONIZED_MCP_URL and KARBONIZED_MCP_TOKEN,
 * or from the settings file of the app.
 *
 * When Karbonized is not running, the bridge starts it in the background
 * (hidden, with a tray icon) using the command the app wrote to its settings
 * file, and waits for the server before forwarding the first message.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const log = (message: string) =>
	process.stderr.write(`[karbonized-mcp] ${message}\n`);

const appDataDir = () => {
	if (process.platform === 'win32') {
		return process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming');
	}
	if (process.platform === 'darwin') {
		return join(homedir(), 'Library', 'Application Support');
	}
	return process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
};

interface LaunchCommand {
	command: string;
	args: string[];
}

const readSettings = (): Record<string, unknown> | null => {
	try {
		return JSON.parse(
			readFileSync(
				join(
					appDataDir(),
					'karbonized',
					'beedly-mcp.json' /* legacy name, keeps the MCP token */,
				),
				'utf-8',
			),
		);
	} catch {
		return null;
	}
};

const readLaunchCommand = (): LaunchCommand | null => {
	const launch = readSettings()?.launch as Partial<LaunchCommand> | undefined;
	return typeof launch?.command === 'string' &&
		Array.isArray(launch.args) &&
		launch.args.every((arg) => typeof arg === 'string')
		? { command: launch.command, args: launch.args }
		: null;
};

const readConfig = (): { url: string; token: string } => {
	let url = process.env.KARBONIZED_MCP_URL;
	let token = process.env.KARBONIZED_MCP_TOKEN;

	if (!url || !token) {
		const settings = readSettings();
		if (settings) {
			url ??= `http://127.0.0.1:${settings.port}/mcp`;
			token ??= settings.token as string | undefined;
		}
	}

	if (!url || !token) {
		log(
			'Missing configuration. Copy the client configuration from Karbonized → Agent settings → MCP server.',
		);
		process.exit(1);
	}
	return { url, token };
};

const { url, token } = readConfig();
let sessionId: string | undefined;

/** How long to wait for Karbonized to start and open its server. */
const LAUNCH_TIMEOUT_MS = 60_000;
let launching: Promise<boolean> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The server answers (any HTTP status means it is listening). */
const reachable = async () => {
	try {
		await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) });
		return true;
	} catch {
		return false;
	}
};

/**
 * Start Karbonized in the background once, and wait until its server
 * listens. The app has to have run once with the MCP server turned on: that
 * is when it writes how to start it.
 */
const launchApp = (): Promise<boolean> => {
	launching ??= (async () => {
		const launch = readLaunchCommand();
		if (!launch) return false;

		log('Karbonized is not running; starting it in the background.');
		const env = { ...process.env };
		// The bridge itself runs the app as Node; the app must not.
		delete env.ELECTRON_RUN_AS_NODE;
		try {
			const child = spawn(launch.command, launch.args, {
				detached: true,
				stdio: 'ignore',
				env,
				windowsHide: true,
			});
			child.on('error', (error) =>
				log(`Could not start Karbonized: ${error.message}`),
			);
			child.unref();
		} catch (error) {
			log(`Could not start Karbonized: ${(error as Error).message}`);
			return false;
		}

		const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
		while (Date.now() < deadline) {
			await sleep(500);
			if (await reachable()) return true;
		}
		log('Karbonized did not open its MCP server in time.');
		return false;
	})();
	return launching;
};

const write = (message: unknown) => {
	process.stdout.write(`${JSON.stringify(message)}\n`);
};

const errorReply = (id: unknown, message: string) => {
	// Notifications (no id) get no reply.
	if (id === undefined || id === null) return;
	write({ jsonrpc: '2.0', id, error: { code: -32000, message } });
};

/** Messages carried by an SSE response body. */
const parseEventStream = (text: string): unknown[] =>
	text
		.split(/\r?\n\r?\n/)
		.map((event) =>
			event
				.split(/\r?\n/)
				.filter((line) => line.startsWith('data:'))
				.map((line) => line.slice(5).trimStart())
				.join('\n'),
		)
		.filter((data) => data !== '')
		.flatMap((data) => {
			try {
				return [JSON.parse(data)];
			} catch {
				return [];
			}
		});

const post = (line: string) =>
	fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
			authorization: `Bearer ${token}`,
			...(sessionId && { 'mcp-session-id': sessionId }),
		},
		body: line,
	});

/** Post a message, starting Karbonized first if nothing listens. */
const postStartingApp = async (line: string) => {
	try {
		return await post(line);
	} catch (error) {
		if (!(await launchApp())) throw error;
		return post(line);
	}
};

const forward = async (line: string) => {
	let message: { id?: unknown };
	try {
		message = JSON.parse(line);
	} catch {
		log('Ignored a line that is not JSON.');
		return;
	}

	try {
		const response = await postStartingApp(line);
		sessionId = response.headers.get('mcp-session-id') ?? sessionId;

		if (response.status === 202) return;
		const text = await response.text();

		if (!response.ok) {
			const detail = (() => {
				try {
					return JSON.parse(text).error?.message;
				} catch {
					return undefined;
				}
			})();
			errorReply(
				message.id,
				response.status === 401
					? 'Karbonized rejected the token. Copy the configuration again from Agent settings.'
					: (detail ?? `Karbonized answered with HTTP ${response.status}.`),
			);
			return;
		}

		const replies = (response.headers.get('content-type') ?? '').includes(
			'text/event-stream',
		)
			? parseEventStream(text)
			: [JSON.parse(text)];
		replies.forEach(write);
	} catch {
		errorReply(
			message.id,
			'Could not reach Karbonized. Open the app and turn on the MCP server in Agent settings (it can then start by itself).',
		);
	}
};

// Keep replies in the order of the requests.
let queue = Promise.resolve();
createInterface({ input: process.stdin })
	.on('line', (line) => {
		if (line.trim() === '') return;
		queue = queue.then(() => forward(line));
	})
	.on('close', () => {
		// Let pending replies finish; the process then ends on its own. Calling
		// process.exit() while fetch sockets close crashes Node on Windows.
		void queue.then(() => {
			process.exitCode = 0;
		});
	});
