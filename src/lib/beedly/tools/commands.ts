import { z } from 'zod';
import { commandRegistry, runCommand } from '@/lib/commands/registry';
import { ToolError, defineTool } from './registry';

/**
 * Editor commands a model may run. Anything that opens dialogs, leaves the
 * editor or clears the canvas without an undo step stays out.
 */
const ALLOWED_PREFIXES = ['edit.', 'arrange.', 'view.'];
const BLOCKED = new Set(['view.toggle-beedly', 'view.cycle-mode']);

export const isAllowedCommand = (id: string): boolean =>
	!BLOCKED.has(id) && ALLOWED_PREFIXES.some((prefix) => id.startsWith(prefix));

const availableCommands = () =>
	commandRegistry
		.getAvailable()
		.filter((command) => isAllowedCommand(command.id))
		.map((command) => ({
			id: command.id,
			title: command.title,
			shortcut: Array.isArray(command.shortcut)
				? command.shortcut[0]
				: command.shortcut,
		}));

export const listCommandsTool = defineTool({
	name: 'list_commands',
	title: 'List editor commands',
	description:
		'List editor commands that can run right now (undo, redo, duplicate, zoom, snapping…).',
	input: z.object({}),
	mutates: false,
	execute: () => ({ commands: availableCommands() }),
});

export const runCommandTool = defineTool({
	name: 'run_command',
	title: 'Run editor command',
	description:
		'Run an editor command by id, as if the user used its shortcut. Get ids with list_commands. Commands act on the current selection.',
	input: z.object({ id: z.string() }),
	// Commands record their own undo steps (undo itself must not be grouped).
	mutates: false,
	execute: ({ id }) => {
		if (!isAllowedCommand(id)) {
			throw new ToolError(`Command "${id}" cannot be run by tools.`);
		}
		if (!runCommand(id)) {
			throw new ToolError(
				`Command "${id}" does not exist or is not available right now.`,
			);
		}
		return `Ran ${id}.`;
	},
});

export const commandTools = [listCommandsTool, runCommandTool];
