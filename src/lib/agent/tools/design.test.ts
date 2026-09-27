import { describe, expect, it } from 'vitest';
import { AGENT_SYSTEM_PROMPT } from '../core/system-prompt';
import { DESIGN_GUIDE } from '../core/design-guide';
import { MCP_INSTRUCTIONS } from '../mcp/instructions';
import { type ToolContext, editorTools, executeTool } from './index';

const context: ToolContext = { source: 'mcp', supportsImages: false };

const text = async (name: string, args: unknown) => {
	const execution = await executeTool(editorTools, name, args, context);
	return execution.result.content
		.map((item) => (item.type === 'text' ? item.text : ''))
		.join('');
};

describe('design guidance', () => {
	it('is part of the Agent prompt and of the MCP instructions', () => {
		expect(AGENT_SYSTEM_PROMPT).toContain(DESIGN_GUIDE);
		expect(MCP_INSTRUCTIONS).toContain(DESIGN_GUIDE);
		expect(DESIGN_GUIDE).toContain('## Checklist before finishing');
		expect(DESIGN_GUIDE).toContain('@type:icon');
	});

	it('is readable through get_design_guide', async () => {
		expect(await text('get_design_guide', {})).toBe(DESIGN_GUIDE);
	});
});

describe('search_icons', () => {
	it('returns icon names from the requested sets', async () => {
		const result = JSON.parse(
			await text('search_icons', { query: 'rocket', sets: ['lucide'] }),
		);
		expect(result.icons).toContain('LuRocket');
		expect(result.icons.every((name: string) => name.startsWith('Lu'))).toBe(
			true,
		);
	});

	it('rejects unknown sets', async () => {
		const execution = await executeTool(
			editorTools,
			'search_icons',
			{ query: 'rocket', sets: ['nope'] },
			context,
		);
		expect(execution.result.isError).toBe(true);
	});
});
