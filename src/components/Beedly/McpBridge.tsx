import { useEffect } from 'react';
import { getBeedlyBridge } from '@/lib/beedly/bridge';
import { startMcpBridge } from '@/lib/beedly/mcp/renderer';

/** Runs tool calls of MCP clients (desktop app only). Renders nothing. */
export const McpBridge = () => {
	useEffect(() => {
		const bridge = getBeedlyBridge();
		return bridge ? startMcpBridge(bridge) : undefined;
	}, []);

	return null;
};

export default McpBridge;
