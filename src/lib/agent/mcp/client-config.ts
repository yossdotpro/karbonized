import type { McpStatus } from '../bridge';

/**
 * Configuration snippets for MCP clients, shown in Agent settings.
 */

export const MCP_SERVER_NAME = 'karbonized';

export interface McpClientSnippet {
	id: 'claude-desktop' | 'claude-code' | 'cursor';
	label: string;
	/** Where the snippet goes. */
	hint: string;
	language: 'json' | 'bash';
	code: string;
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

const quote = (value: string) =>
	/^[\w@%+=:,./-]+$/.test(value)
		? value
		: `"${value.replace(/(["\\$`])/g, '\\$1')}"`;

/**
 * Every client goes through the stdio bridge (the app's own executable
 * running `mcp-stdio.cjs` as Node), which also starts Karbonized in the
 * background when it is not running.
 */
const stdioServer = (status: McpStatus) => ({
	command: status.executablePath,
	args: [status.stdioProxyPath],
	env: {
		ELECTRON_RUN_AS_NODE: '1',
		KARBONIZED_MCP_URL: status.url,
		KARBONIZED_MCP_TOKEN: status.token,
	},
});

export const mcpClientSnippets = (status: McpStatus): McpClientSnippet[] => {
	const server = stdioServer(status);
	return [
		{
			id: 'claude-desktop',
			label: 'Claude Desktop',
			hint: 'Settings → Developer → Edit Config, then restart Claude Desktop. Karbonized runs a small bridge with its own executable (no Node.js needed) and opens in the background if it is not running.',
			language: 'json',
			code: json({ mcpServers: { [MCP_SERVER_NAME]: server } }),
		},
		{
			id: 'claude-code',
			label: 'Claude Code',
			hint: 'Run in a terminal. Karbonized opens in the background if it is not running.',
			language: 'bash',
			code: [
				`claude mcp add ${MCP_SERVER_NAME}`,
				...Object.entries(server.env).map(
					([key, value]) => `-e ${quote(`${key}=${value}`)}`,
				),
				'--',
				quote(server.command),
				...server.args.map(quote),
			].join(' '),
		},
		{
			id: 'cursor',
			label: 'Cursor',
			hint: 'Add to ~/.cursor/mcp.json (or .cursor/mcp.json in a project). Karbonized opens in the background if it is not running.',
			language: 'json',
			code: json({ mcpServers: { [MCP_SERVER_NAME]: server } }),
		},
	];
};
