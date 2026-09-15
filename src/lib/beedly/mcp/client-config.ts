import type { McpStatus } from '../bridge';

/**
 * Configuration snippets for MCP clients, shown in Beedly settings.
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

export const mcpClientSnippets = (status: McpStatus): McpClientSnippet[] => [
	{
		id: 'claude-desktop',
		label: 'Claude Desktop',
		hint: 'Settings → Developer → Edit Config, then restart Claude Desktop. Karbonized runs a small bridge with its own executable, so Node.js is not needed.',
		language: 'json',
		code: json({
			mcpServers: {
				[MCP_SERVER_NAME]: {
					command: status.executablePath,
					args: [status.stdioProxyPath],
					env: {
						ELECTRON_RUN_AS_NODE: '1',
						KARBONIZED_MCP_URL: status.url,
						KARBONIZED_MCP_TOKEN: status.token,
					},
				},
			},
		}),
	},
	{
		id: 'claude-code',
		label: 'Claude Code',
		hint: 'Run in a terminal.',
		language: 'bash',
		code: `claude mcp add --transport http ${MCP_SERVER_NAME} ${status.url} --header ${quote(`Authorization: Bearer ${status.token}`)}`,
	},
	{
		id: 'cursor',
		label: 'Cursor',
		hint: 'Add to ~/.cursor/mcp.json (or .cursor/mcp.json in a project).',
		language: 'json',
		code: json({
			mcpServers: {
				[MCP_SERVER_NAME]: {
					url: status.url,
					headers: { Authorization: `Bearer ${status.token}` },
				},
			},
		}),
	},
];
