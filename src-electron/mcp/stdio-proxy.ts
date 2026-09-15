/**
 * stdio bridge to the Karbonized MCP server, for MCP clients that only start
 * local processes (e.g. Claude Desktop).
 *
 * Runs with plain Node or with the Karbonized executable and
 * ELECTRON_RUN_AS_NODE=1. Reads JSON-RPC messages (one per line) from stdin,
 * posts them to the app's Streamable HTTP endpoint and writes the replies to
 * stdout. Configuration comes from KARBONIZED_MCP_URL and KARBONIZED_MCP_TOKEN,
 * or from the settings file of the app.
 */
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

const readConfig = (): { url: string; token: string } => {
	let url = process.env.KARBONIZED_MCP_URL;
	let token = process.env.KARBONIZED_MCP_TOKEN;

	if (!url || !token) {
		try {
			const settings = JSON.parse(
				readFileSync(
					join(appDataDir(), 'karbonized', 'beedly-mcp.json'),
					'utf-8',
				),
			);
			url ??= `http://127.0.0.1:${settings.port}/mcp`;
			token ??= settings.token;
		} catch {
			// Reported below.
		}
	}

	if (!url || !token) {
		log(
			'Missing configuration. Copy the client configuration from Karbonized → Beedly settings → MCP server.',
		);
		process.exit(1);
	}
	return { url, token };
};

const { url, token } = readConfig();
let sessionId: string | undefined;

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

const forward = async (line: string) => {
	let message: { id?: unknown };
	try {
		message = JSON.parse(line);
	} catch {
		log('Ignored a line that is not JSON.');
		return;
	}

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
				authorization: `Bearer ${token}`,
				...(sessionId && { 'mcp-session-id': sessionId }),
			},
			body: line,
		});
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
					? 'Karbonized rejected the token. Copy the configuration again from Beedly settings.'
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
			'Could not reach Karbonized. Open the app and turn on the MCP server in Beedly settings.',
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
