import { z } from 'zod';
import { useHistoryStore } from '@/stores';
import type { History } from '@/types';

/**
 * Tools: the actions Beedly and MCP clients can run in the editor.
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
	source: 'beedly' | 'mcp';
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
	const { $schema: _ignored, ...json } = z.toJSONSchema(schema, {
		io: 'input',
		unrepresentable: 'any',
	}) as JsonSchema;
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

const describeError = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

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

	let historyEntry: History | null = null;

	try {
		let output: unknown;

		if (tool.mutates) {
			const run = useHistoryStore
				.getState()
				.transaction(() => tool.execute(parsed.data, context));
			historyEntry = run.entry;
			output = run.result;
			if (output instanceof Promise) {
				throw new Error(`Tool ${name} must mutate synchronously.`);
			}
		} else {
			output = await tool.execute(parsed.data, context);
		}

		const settled = tool.settle ? await tool.settle(output, context) : output;
		return { result: toToolResult(settled), historyEntry };
	} catch (error) {
		return { result: errorResult(describeError(error)), historyEntry };
	}
};
