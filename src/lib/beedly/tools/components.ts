import { z } from 'zod';
import {
	addBlock,
	getHtmlBlockCode,
	requireBlock,
	waitForBlock,
} from '@/lib/editor/actions';
import { kcomponentBlockInput } from '@/hooks/useAddKComponentToCanvas';
import { getComponentKey } from '@/models/KComponent';
import { useKComponentStore } from '@/stores/kcomponent-store';
import {
	parseKComponentDocument,
	stringifyKComponent,
} from '@/utils/kcomponentParser';
import { loadStarterPack } from '@/utils/starterPack';
import { ToolError, defineTool } from './registry';
import { compactBlock } from './blocks';

/**
 * The component library: `.kcomponent` files the user imported, plus the
 * bundled starter pack. A component is an HTML block with a manifest, so
 * putting one on the canvas goes through the same action the gallery uses.
 */

const library = () => useKComponentStore.getState();

const summarize = (id: string) => {
	const entry = library().getImportedComponent(id);
	if (!entry) return null;

	const { manifest, js } = entry.component;
	return {
		id: entry.id,
		name: manifest.name,
		author: manifest.author,
		version: manifest.version,
		category: manifest.category,
		description: manifest.description,
		tags: manifest.tags,
		width: manifest.width,
		height: manifest.height,
		/** The block needs allow-scripts before these run. */
		hasActions: /\/\/\s*@action:/.test(js),
		usageCount: entry.usageCount,
		favorite: entry.favorite,
	};
};

const requireComponent = (id: string) => {
	const entry = library().getImportedComponent(id);
	if (!entry) {
		throw new ToolError(
			`No component with id "${id}" in the library. Use list_components.`,
		);
	}
	return entry;
};

export const listComponentsTool = defineTool({
	name: 'list_components',
	title: 'List components',
	description:
		'List the components in the library (imported .kcomponent files and the starter pack), with the id add_component takes.',
	input: z.object({
		category: z
			.string()
			.optional()
			.describe('Only components in this category.'),
		query: z
			.string()
			.optional()
			.describe('Match against name, author, description, category and tags.'),
	}),
	mutates: false,
	execute: ({ category, query }) => {
		const needle = query?.trim().toLowerCase();

		const components = library()
			.importedComponents.map((entry) => summarize(entry.id))
			.filter((item): item is NonNullable<typeof item> => item !== null)
			.filter((item) => !category || item.category === category)
			.filter(
				(item) =>
					!needle ||
					[
						item.name,
						item.author,
						item.description,
						item.category,
						...(item.tags ?? []),
					]
						.filter((value): value is string => Boolean(value))
						.some((value) => value.toLowerCase().includes(needle)),
			);

		return { components, total: library().importedComponents.length };
	},
});

export const importComponentTool = defineTool({
	name: 'import_component',
	title: 'Import a .kcomponent',
	description:
		'Add a .kcomponent file (YAML) to the library. Returns its id for add_component. A component with the same name and author is replaced when replace is true, and reported otherwise.',
	input: z.object({
		yaml: z.string().describe('The contents of the .kcomponent file.'),
		replace: z
			.boolean()
			.optional()
			.describe('Replace a component that has the same name and author.'),
	}),
	mutates: false,
	execute: ({ yaml, replace }) => {
		const { component, errors, warnings } = parseKComponentDocument(yaml);
		if (!component) {
			throw new ToolError(errors.join(' ') || 'The file could not be parsed.');
		}

		const [result] = library().importComponents([component], { replace });

		if (result.outcome === 'limit') {
			throw new ToolError(
				'The library is full. Remove a component before importing another.',
			);
		}
		if (result.outcome === 'duplicate') {
			throw new ToolError(
				`"${result.name}" is already in the library. Pass replace: true to update it.`,
			);
		}

		return {
			id: result.id,
			name: result.name,
			outcome: result.outcome,
			warnings,
		};
	},
});

export const addComponentTool = defineTool({
	name: 'add_component',
	title: 'Add component to canvas',
	description:
		'Put a component from the library on the canvas as an HTML block, at the size its manifest asks for unless width and height are given.',
	input: z.object({
		id: z.string().describe('Component id from list_components.'),
		x: z.number().optional().describe('Left edge in canvas pixels.'),
		y: z.number().optional().describe('Top edge in canvas pixels.'),
		width: z.number().positive().optional().describe('Width in pixels.'),
		height: z.number().positive().optional().describe('Height in pixels.'),
		name: z.string().optional().describe('Layer name for the new block.'),
	}),
	mutates: true,
	execute: ({ id, name, ...box }) => {
		const entry = requireComponent(id);
		const input = kcomponentBlockInput(entry.component);

		const block = addBlock({
			...input,
			name: name ?? input.name,
			width: box.width ?? input.width,
			height: box.height ?? input.height,
			x: box.x,
			y: box.y,
		});

		library().markComponentUsed(id);
		return block;
	},
	settle: async (block) => {
		if (await waitForBlock(block.id)) {
			await new Promise((resolve) => setTimeout(resolve, 80));
		}
		return compactBlock(block.id);
	},
});

export const exportComponentTool = defineTool({
	name: 'export_component',
	title: 'Export a .kcomponent',
	description:
		'Return the .kcomponent file (YAML) of a library component, or of an HTML block on the canvas, ready to save or share.',
	input: z.object({
		componentId: z.string().optional().describe('Id from list_components.'),
		blockId: z
			.string()
			.optional()
			.describe('Id of an HTML block on the canvas.'),
		name: z
			.string()
			.optional()
			.describe('Name for the manifest when exporting a block.'),
	}),
	mutates: false,
	execute: ({ componentId, blockId, name }) => {
		if (!componentId === !blockId) {
			throw new ToolError('Give either componentId or blockId.');
		}

		if (componentId) {
			return stringifyKComponent(requireComponent(componentId).component);
		}

		const block = requireBlock(blockId as string);
		if (block.type !== 'html') {
			throw new ToolError(`Block ${block.id} is not an HTML block.`);
		}

		const code = getHtmlBlockCode(block.id);
		return stringifyKComponent({
			manifest: {
				name: name?.trim() || block.name,
				version: '1.0.0',
				category: 'HTML Blocks',
				tags: ['karbonized', 'html-block'],
			},
			html: code.html,
			css: code.css,
			js: code.js,
		});
	},
});

export const loadStarterPackTool = defineTool({
	name: 'load_starter_pack',
	title: 'Load the starter pack',
	description:
		'Import the components that ship with Karbonized into the library. Components already there are left alone.',
	input: z.object({}),
	mutates: false,
	execute: async () => {
		const pack = await loadStarterPack();
		const existing = new Set(
			library().importedComponents.map((entry) =>
				getComponentKey(entry.component.manifest),
			),
		);

		const missing = pack.filter(
			(component) => !existing.has(getComponentKey(component.manifest)),
		);

		const results = library().importComponents(missing);

		return {
			added: results
				.filter((result) => result.outcome === 'added')
				.map((result) => ({ id: result.id, name: result.name })),
			alreadyInLibrary: pack.length - missing.length,
		};
	},
});

export const componentTools = [
	listComponentsTool,
	importComponentTool,
	addComponentTool,
	exportComponentTool,
	loadStarterPackTool,
];
