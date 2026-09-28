import { z } from 'zod';
import { useHistoryStore } from '@/stores';
import type { History } from '@/types';

/**
 * Tools: the actions Agent and MCP clients can run in the editor.
 *
 * One definition serves both. The zod schema validates the arguments and is
 * converted to JSON Schema for model providers and for MCP `tools/list`.
 */

export type ToolContent =
	| { type: 'text'; text: string }
	/** `data` is base64 without the `data:` prefix. */
	| { type: 'image'; mimeType: string; data: string };

/** Same shape as an MCP `CallToolResult`. */
export interface ToolResult {
	content: ToolContent[];
	isError?: boolean;
}

export interface ToolContext {
	source: 'agent' | 'mcp';
	/** The caller accepts images in results. */
	supportsImages: boolean;
	signal?: AbortSignal;
}

export interface ToolDefinition<
	Schema extends z.ZodType = z.ZodType,
	Output = unknown,
> {
	name: string;
	title: string;
	description: string;
	input: Schema;
	/**
	 * The tool changes the document. `execute` then runs synchronously inside a
	 * history transaction, so everything it does is undone in one step.
	 */
	mutates: boolean;
	execute: (
		args: z.infer<Schema>,
		context: ToolContext,
	) => Output | Promise<Output>;
	/**
	 * Optional async follow-up of a mutating tool (e.g. wait for a new block to
	 * render) that turns the output of `execute` into the result.
	 */
	settle?: (output: Output, context: ToolContext) => unknown;
}

/** Keeps the argument types of each tool while collecting them in a list. */
export const defineTool = <Schema extends z.ZodType, Output>(
	tool: ToolDefinition<Schema, Output>,
): ToolDefinition => tool as unknown as ToolDefinition;

/** Error with a message meant for the model or MCP client. */
export class ToolError extends Error {}

export interface ToolDescriptor {
	name: string;
	title: string;
	description: string;
	inputSchema: JsonSchema;
	mutates: boolean;
}

export type JsonSchema = Record<string, unknown>;

export const toJsonSchema = (schema: z.ZodType): JsonSchema => {
	const json = z.toJSONSchema(schema, {
		io: 'input',
		unrepresentable: 'any',
	}) as JsonSchema;
	delete json.$schema;
	return json;
};

export const describeTool = (tool: ToolDefinition): ToolDescriptor => ({
	name: tool.name,
	title: tool.title,
	description: tool.description,
	inputSchema: toJsonSchema(tool.input),
	mutates: tool.mutates,
});

export const textResult = (text: string): ToolResult => ({
	content: [{ type: 'text', text }],
});

export const errorResult = (message: string): ToolResult => ({
	content: [{ type: 'text', text: message }],
	isError: true,
});

const isToolResult = (value: unknown): value is ToolResult =>
	typeof value === 'object' &&
	value !== null &&
	Array.isArray((value as ToolResult).content);

export const toToolResult = (value: unknown): ToolResult => {
	if (isToolResult(value)) return value;
	if (value === undefined) return textResult('Done.');
	if (typeof value === 'string') return textResult(value);
	return textResult(JSON.stringify(value));
};

export interface ToolExecution {
	result: ToolResult;
	/** The undo step the call recorded, if any. */
	historyEntry: History | null;
}

/** Time for blocks to apply a change and re-render before the next call. */
const EDITOR_SETTLE_MS = 60;

/**
 * Blocks apply property changes in effects, so the canvas reflects a change a
 * moment later. Tools that measure rendered blocks (align, distribute) must
 * not run before that, or they would read stale positions.
 */
const settleEditor = () =>
	new Promise((resolve) => setTimeout(resolve, EDITOR_SETTLE_MS));

const describeError = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

/**
 * Models tend to build a whole design blind. After a few changes without a
 * look at the canvas, the result of the next change reminds them to check it.
 */
const SNAPSHOT_TOOL = 'get_canvas_snapshot';
export const CHANGES_BEFORE_LOOK = 5;
let changesSinceLook = 0;

export const LOOK_REMINDER = `You have made ${CHANGES_BEFORE_LOOK} changes since you last looked at the canvas: call ${SNAPSHOT_TOOL}, compare the image with the checklist of the design guide and fix what fails before going on.`;

/** Count a change and say whether it is time to look at the canvas. */
const shouldRemindToLook = (
	tools: readonly ToolDefinition[],
	tool: ToolDefinition,
	context: ToolContext,
): boolean => {
	if (tool.name === SNAPSHOT_TOOL) {
		changesSinceLook = 0;
		return false;
	}
	if (
		!tool.mutates ||
		!context.supportsImages ||
		!tools.some((item) => item.name === SNAPSHOT_TOOL)
	) {
		return false;
	}

	changesSinceLook += 1;
	if (changesSinceLook < CHANGES_BEFORE_LOOK) return false;
	changesSinceLook = 0;
	return true;
};

const withLookReminder = (value: unknown): unknown => {
	if (typeof value === 'string') return `${value}\n\n${LOOK_REMINDER}`;
	if (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		!isToolResult(value)
	) {
		return { ...value, reminder: LOOK_REMINDER };
	}
	return value;
};

/** Validate the arguments and run a tool. Never throws. */
export const executeTool = async (
	tools: readonly ToolDefinition[],
	name: string,
	rawArgs: unknown,
	context: ToolContext,
): Promise<ToolExecution> => {
	const tool = tools.find((item) => item.name === name);
	if (!tool) {
		return {
			result: errorResult(`Unknown tool "${name}".`),
			historyEntry: null,
		};
	}

	const parsed = tool.input.safeParse(rawArgs ?? {});
	if (!parsed.success) {
		return {
			result: errorResult(
				`Invalid arguments for ${name}:\n${z.prettifyError(parsed.error)}`,
			),
			historyEntry: null,
		};
	}

	const history = useHistoryStore.getState();
	const before = new Set(history.pastHistory);

	/**
	 * One undo step for the whole call: the transaction, plus steps that blocks
	 * record on their own while they render (e.g. a code block applying its
	 * theme colors) and steps of commands it ran.
	 */
	const collapseCall = (): History | null =>
		useHistoryStore
			.getState()
			.collapseTrailing(
				new Set(
					useHistoryStore
						.getState()
						.pastHistory.filter((entry) => !before.has(entry)),
				),
			);

	try {
		let output: unknown;

		if (tool.mutates) {
			output = history.transaction(() =>
				tool.execute(parsed.data, context),
			).result;
			if (output instanceof Promise) {
				throw new Error(`Tool ${name} must mutate synchronously.`);
			}
			await settleEditor();
		} else {
			output = await tool.execute(parsed.data, context);
		}

		const settled = tool.settle ? await tool.settle(output, context) : output;
		const result = shouldRemindToLook(tools, tool, context)
			? withLookReminder(settled)
			: settled;
		return { result: toToolResult(result), historyEntry: collapseCall() };
	} catch (error) {
		return {
			result: errorResult(describeError(error)),
			historyEntry: collapseCall(),
		};
	}
};
