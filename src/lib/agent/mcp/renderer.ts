import type { AgentBridge, McpRequest } from '../bridge';
import {
	type ToolResult,
	describeTool,
	editorTools,
	errorResult,
	executeTool,
} from '../tools';

/** Longer than any tool should take, shorter than the main process timeout. */
export const MCP_CALL_TIMEOUT_MS = 110_000;

/**
 * Renderer side of the MCP server: the main process forwards tool calls from
 * MCP clients, and they run here against the editor, one at a time.
 */
export const startMcpBridge = (
	bridge: AgentBridge,
	timeoutMs = MCP_CALL_TIMEOUT_MS,
): (() => void) => {
	let queue: Promise<void> = Promise.resolve();

	const runTool = async (
		request: Extract<McpRequest, { type: 'call-tool' }>,
	): Promise<ToolResult> => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const timeout = new Promise<ToolResult>((resolve) => {
			timer = setTimeout(
				() => resolve(errorResult(`${request.name} did not finish in time.`)),
				timeoutMs,
			);
		});

		try {
			return await Promise.race([
				executeTool(editorTools, request.name, request.args, {
					source: 'mcp',
					supportsImages: true,
				}).then((execution) => execution.result),
				timeout,
			]);
		} catch (error) {
			return errorResult(
				error instanceof Error ? error.message : String(error),
			);
		} finally {
			clearTimeout(timer);
		}
	};

	const handle = async (request: McpRequest) => {
		if (request.type === 'list-tools') {
			bridge.mcp.respond({
				requestId: request.requestId,
				type: 'list-tools',
				tools: editorTools.map(describeTool),
			});
			return;
		}

		bridge.mcp.respond({
			requestId: request.requestId,
			type: 'call-tool',
			result: await runTool(request),
		});
	};

	const unsubscribe = bridge.mcp.onRequest((request) => {
		// Listing tools never waits behind a running call.
		if (request.type === 'list-tools') {
			void handle(request);
			return;
		}
		// Serialize calls: each one waits for the canvas to settle. A stuck call
		// times out instead of blocking the ones after it.
		queue = queue.then(() => handle(request));
	});

	return unsubscribe;
};
