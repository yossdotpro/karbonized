import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { type McpStatus, getBeedlyBridge } from '../bridge';

/** Message of an error thrown by the main process, without Electron's prefix. */
export const ipcErrorMessage = (error: unknown): string =>
	error instanceof Error
		? error.message.replace(
				/^Error invoking remote method '[^']+': (Error: )?/,
				'',
			)
		: String(error);

/** Live status of the MCP server; null on the web or until it is known. */
export const useMcpStatus = (): McpStatus | null => {
	const [status, setStatus] = useState<McpStatus | null>(null);

	useEffect(() => {
		const bridge = getBeedlyBridge();
		if (!bridge) return;

		let active = true;
		void bridge.mcp.getStatus().then((next) => {
			if (active) setStatus(next);
		});
		const unsubscribe = bridge.mcp.onStatus(setStatus);
		return () => {
			active = false;
			unsubscribe();
		};
	}, []);

	return status;
};

/** Turn the MCP server on or off (desktop only). Reports failures. */
export const setMcpEnabled = async (enabled: boolean): Promise<void> => {
	const bridge = getBeedlyBridge();
	if (!bridge) return;

	try {
		const status = await bridge.mcp.setEnabled(enabled);
		if (status.error) {
			toast.error('Could not start the MCP server', {
				description: status.error,
			});
		} else if (enabled) {
			toast.success('MCP server on', { description: status.url });
		}
	} catch (error) {
		toast.error('Could not update the MCP server', {
			description: ipcErrorMessage(error),
		});
	}
};
