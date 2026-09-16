import { z } from 'zod';
import { commandRegistry, runCommand } from '@/lib/commands/registry';
import { ToolError, defineTool } from './registry';

/**
 * Editor commands a model may run. Anything that opens dialogs, leaves the
 * editor or clears the canvas without an undo step stays out.
 *
 * Whole families that are safe: `edit.` and `arrange.` are undoable document
 * changes, `view.` only moves the viewport and toggles editor chrome, and
 * `tools.` picks the tool the user then draws with, or inserts a block.
 *
 * Deliberately out, because they need a person or a dedicated tool does the
 * job properly:
 * - `file.*` and `help.*` open dialogs, write files or leave the editor.
 *   `export_image` and `export_component` cover what a model needs.
 * - `tools.components` opens the gallery dialog; `list_components` and
 *   `add_component` reach the library directly.
 * - `block.*` belongs to the block editor page, not the canvas.
 * - `workspace.clean` wipes the canvas with no undo step; `delete_blocks`
 *   removes blocks and can be undone.
 */
const ALLOWED_PREFIXES = ['edit.', 'arrange.', 'view.', 'tools.'];

/** Vetted one by one, outside the safe families. */
const ALLOWED_IDS = new Set(['file.copy-image']);

const BLOCKED = new Set([
	'view.toggle-beedly',
	'view.cycle-mode',
	'tools.components',
]);

export const isAllowedCommand = (id: string): boolean =>
	!BLOCKED.has(id) &&
	(ALLOWED_IDS.has(id) ||
		ALLOWED_PREFIXES.some((prefix) => id.startsWith(prefix)));

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
