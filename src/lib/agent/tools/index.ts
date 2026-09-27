import { blockTools } from './blocks';
import { commandTools } from './commands';
import { componentTools } from './components';
import { designTools } from './design';
import { exportTools } from './export';
import type { ToolDefinition } from './registry';
import { workspaceTools } from './workspace';

export * from './registry';

/** Every tool, in the order they are listed to models and MCP clients. */
export const editorTools: readonly ToolDefinition[] = [
	...designTools,
	...workspaceTools,
	...blockTools,
	...componentTools,
	...exportTools,
	...commandTools,
];
