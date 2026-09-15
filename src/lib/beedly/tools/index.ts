import { blockTools } from './blocks';
import { commandTools } from './commands';
import { exportTools } from './export';
import type { ToolDefinition } from './registry';
import { workspaceTools } from './workspace';

export * from './registry';

/** Every tool, in the order they are listed to models and MCP clients. */
export const editorTools: readonly ToolDefinition[] = [
	...workspaceTools,
	...blockTools,
	...exportTools,
	...commandTools,
];
