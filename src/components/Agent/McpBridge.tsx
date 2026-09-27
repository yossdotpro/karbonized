import { useEffect } from 'react';
import { getAgentBridge } from '@/lib/agent/bridge';
import { startMcpBridge } from '@/lib/agent/mcp/renderer';

/** Runs tool calls of MCP clients (desktop app only). Renders nothing. */
export const McpBridge = () => {
	useEffect(() => {
		const bridge = getAgentBridge();
		return bridge ? startMcpBridge(bridge) : undefined;
	}, []);

	return null;
};

export default McpBridge;
