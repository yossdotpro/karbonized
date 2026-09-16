import { z } from 'zod';
import {
	BLOCK_TYPES,
	getBlockProperties,
	validatePropertyValue,
} from '@/lib/blocks/catalog';
import {
	addBlock,
	alignBlocks,
	deleteBlocks,
	distributeBlocks,
	getHtmlBlockCode,
	requireBlock,
	reorderBlock,
	selectBlocks,
	setHtmlBlockCode,
	summarizeBlock,
	updateBlock,
	waitForBlock,
} from '@/lib/editor/actions';
import { languages } from '@/utils/Languages';
import { themes } from '@/utils/PrismThemes';
import { ToolError, defineTool } from './registry';

const blockTypes = BLOCK_TYPES.map((spec) => spec.type) as [
	string,
	...string[],
];

const HTML_CODE_KEYS = ['html', 'css', 'js'];

const themeNames = themes.map((theme) => theme.label);

/** Common short names models use for Prism language ids. */
const LANGUAGE_ALIASES: Record<string, string> = {
	ts: 'typescript',
	js: 'javascript',
	py: 'python',
	sh: 'bash',
	shell: 'bash',
	zsh: 'bash',
	html: 'markup',
	xml: 'markup',
	svg: 'markup',
	rs: 'rust',
	golang: 'go',
	yml: 'yaml',
	md: 'markdown',
	'c++': 'cpp',
	'c#': 'csharp',
	cs: 'csharp',
	kt: 'kotlin',
	rb: 'ruby',
};

/** Check property values against the catalog; returns normalized values. */
export const validateBlockProperties = (
	type: string,
	properties: Record<string, unknown> | undefined,
): Record<string, unknown> => {
	if (!properties) return {};

	const specs = getBlockProperties(type);
	const errors: string[] = [];
	const values: Record<string, unknown> = {};

	Object.entries(properties).forEach(([key, value]) => {
		if (type === 'html' && HTML_CODE_KEYS.includes(key)) {
			if (typeof value === 'string') values[key] = value;
			else errors.push(`${key} must be a string`);
			return;
		}

		const spec = specs.find((item) => item.key === key);
		if (!spec) {
			errors.push(
				`Unknown property "${key}" for ${type} blocks. Valid: ${specs
					.map((item) => item.key)
					.join(', ')}`,
			);
			return;
		}

		const result = validatePropertyValue(spec, value);
		if (!result.ok) {
			errors.push(result.error);
			return;
		}

		// Option lists too long for the catalog.
		if (type === 'code' && key === 'lang') {
			const lang = String(result.value).toLowerCase();
			const id = LANGUAGE_ALIASES[lang] ?? lang;
			if (!languages.includes(id)) {
				errors.push(
					`Unknown language "${lang}". Use a Prism id such as typescript, tsx, javascript, python, rust, go, bash or json.`,
				);
				return;
			}
			values[key] = id;
			return;
		}
		if (
			type === 'code' &&
			key === 'theme' &&
			!themeNames.includes(String(result.value))
		) {
			errors.push(
				`Unknown theme "${String(result.value)}". Themes: ${themeNames.join(', ')}`,
			);
			return;
		}

		values[key] = result.value;
	});

	if (errors.length > 0) throw new ToolError(errors.join('\n'));
	return values;
};

const MAX_VALUE_LENGTH = 300;

/** Keep data URLs and long code out of results sent to a model. */
export const compactValue = (value: unknown): unknown => {
	if (typeof value !== 'string' || value.length <= MAX_VALUE_LENGTH) {
		return value;
	}
	if (value.startsWith('data:')) {
		return `[data URL, ${Math.round(value.length / 1024)} KB]`;
	}
	return `${value.slice(0, MAX_VALUE_LENGTH)}… [${value.length} characters]`;
};

export const compactBlock = (id: string) => {
	const summary = summarizeBlock(requireBlock(id));
	return {
		...summary,
		properties: Object.fromEntries(
			Object.entries(summary.properties).map(([key, value]) => [
				key,
				compactValue(value),
			]),
		),
	};
};

const geometry = {
	x: z.number().optional().describe('Left edge in canvas pixels.'),
	y: z.number().optional().describe('Top edge in canvas pixels.'),
	width: z.number().positive().optional().describe('Width in pixels.'),
	height: z.number().positive().optional().describe('Height in pixels.'),
	rotation: z.number().optional().describe('Rotation in degrees.'),
};

const properties = z
	.record(z.string(), z.unknown())
	.optional()
	.describe(
		'Block properties by key, e.g. {"text": "Hello", "color": "#ffffff"}. See list_block_types for the keys of each type.',
	);

const blockIds = z.array(z.string()).min(1).describe('Block ids.');

const crop = z
	.object({
		top: z.number().min(0).max(100).optional(),
		right: z.number().min(0).max(100).optional(),
		bottom: z.number().min(0).max(100).optional(),
		left: z.number().min(0).max(100).optional(),
	})
	.optional()
	.describe(
		'Cut away part of the block, in percent of its size on each side. All zeros removes the crop. Only the sides given change.',
	);

export const listBlockTypesTool = defineTool({
	name: 'list_block_types',
	title: 'List block types',
	description:
		'List the block types that can be added, with their properties (key, kind, default, options, limits) and size limits.',
	input: z.object({}),
	mutates: false,
	execute: () => ({
		blockTypes: BLOCK_TYPES.map((spec) => ({
			type: spec.type,
			label: spec.label,
			description: spec.description,
			defaultSize: spec.defaultSize,
			minSize: spec.minSize,
			maxSize: spec.maxSize,
			properties: getBlockProperties(spec.type),
		})),
		codeThemes: themes.map((theme) => theme.label),
	}),
});

export const addBlockTool = defineTool({
	name: 'add_block',
	title: 'Add block',
	description:
		'Add a block to the canvas and select it. It is centered on the canvas unless x and y are given. For html blocks, properties may include html, css and js code.',
	input: z.object({
		type: z.enum(blockTypes).describe('Block type.'),
		name: z.string().optional().describe('Layer name.'),
		...geometry,
		properties,
	}),
	mutates: true,
	execute: (args) => {
		const values = validateBlockProperties(args.type, args.properties);
		return addBlock({ ...args, properties: values });
	},
	settle: async (block) => {
		// Let the block run its mount effects (they may adjust properties).
		if (await waitForBlock(block.id)) {
			await new Promise((resolve) => setTimeout(resolve, 80));
		}
		return compactBlock(block.id);
	},
});

export const updateBlockTool = defineTool({
	name: 'update_block',
	title: 'Update block',
	description:
		'Change the name, position, size, rotation, visibility, lock or properties of a block. Only the given fields change.',
	input: z.object({
		id: z.string().describe('Block id.'),
		name: z.string().optional(),
		...geometry,
		visible: z.boolean().optional(),
		locked: z.boolean().optional(),
		crop,
		properties,
	}),
	mutates: true,
	execute: ({ id, ...args }) => {
		const block = requireBlock(id);
		const values = validateBlockProperties(block.type, args.properties);
		updateBlock(id, { ...args, properties: values });
		return id;
	},
	settle: (id) => compactBlock(id),
});

export const deleteBlocksTool = defineTool({
	name: 'delete_blocks',
	title: 'Delete blocks',
	description: 'Delete blocks (and the children of groups).',
	input: z.object({ ids: blockIds }),
	mutates: true,
	execute: ({ ids }) => {
		deleteBlocks(ids);
		return `Deleted ${ids.length} block${ids.length === 1 ? '' : 's'}.`;
	},
});

export const selectBlocksTool = defineTool({
	name: 'select_blocks',
	title: 'Select blocks',
	description:
		'Select blocks in the editor. An empty list clears the selection.',
	input: z.object({ ids: z.array(z.string()).describe('Block ids.') }),
	mutates: false,
	execute: ({ ids }) => {
		selectBlocks(ids);
		return ids.length === 0
			? 'Selection cleared.'
			: `Selected ${ids.join(', ')}.`;
	},
});

const renderedBoxes = (ids: string[]) =>
	ids
		.map((id) => compactBlock(id))
		.map(({ id, x, y, width, height }) => ({
			id,
			x,
			y,
			width,
			height,
		}));

export const alignBlocksTool = defineTool({
	name: 'align_blocks',
	title: 'Align blocks',
	description:
		'Align blocks to each other. A single block aligns to the canvas (e.g. center + middle centers it). Locked and hidden blocks do not move.',
	input: z.object({
		ids: blockIds,
		alignment: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom']),
	}),
	mutates: true,
	execute: ({ ids, alignment }) => {
		alignBlocks(ids, alignment);
		return ids;
	},
	settle: renderedBoxes,
});

export const distributeBlocksTool = defineTool({
	name: 'distribute_blocks',
	title: 'Distribute blocks',
	description:
		'Space three or more blocks evenly between the first and the last one.',
	input: z.object({
		ids: z.array(z.string()).min(3).describe('Block ids.'),
		axis: z.enum(['horizontal', 'vertical']),
	}),
	mutates: true,
	execute: ({ ids, axis }) => {
		distributeBlocks(ids, axis);
		return ids;
	},
	settle: renderedBoxes,
});

export const reorderBlockTool = defineTool({
	name: 'reorder_block',
	title: 'Reorder block',
	description: 'Move a block in the layer order.',
	input: z.object({
		id: z.string(),
		position: z.enum(['front', 'back', 'forward', 'backward']),
	}),
	mutates: true,
	execute: ({ id, position }) => {
		reorderBlock(id, position);
		return `Moved ${id} ${position === 'front' || position === 'back' ? 'to the ' : ''}${position}.`;
	},
});

export const getHtmlBlockTool = defineTool({
	name: 'get_html_block',
	title: 'Read HTML block',
	description: 'Read the HTML, CSS and JavaScript code of an HTML block.',
	input: z.object({ id: z.string() }),
	mutates: false,
	execute: ({ id }) => getHtmlBlockCode(id),
});

export const updateHtmlBlockTool = defineTool({
	name: 'update_html_block',
	title: 'Edit HTML block',
	description:
		'Replace the HTML, CSS and/or JavaScript code of an HTML block. Omitted parts are kept. CSS is scoped to the block. Set the allow-scripts property with update_block to run the JavaScript.',
	input: z.object({
		id: z.string(),
		html: z.string().optional(),
		css: z.string().optional(),
		js: z.string().optional(),
	}),
	mutates: true,
	execute: ({ id, html, css, js }) => {
		if (html === undefined && css === undefined && js === undefined) {
			throw new ToolError('Give at least one of html, css or js.');
		}
		setHtmlBlockCode(id, { html, css, js });
		return `Updated the code of ${id}.`;
	},
});

export const blockTools = [
	listBlockTypesTool,
	addBlockTool,
	updateBlockTool,
	deleteBlocksTool,
	selectBlocksTool,
	alignBlocksTool,
	distributeBlocksTool,
	reorderBlockTool,
	getHtmlBlockTool,
	updateHtmlBlockTool,
];
