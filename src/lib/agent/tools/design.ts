import { z } from 'zod';
import { DESIGN_GUIDE } from '../core/design-guide';
import { loadGoogleCatalog } from '@/lib/fonts/fonts';
import { listIconSets, searchIcons } from '@/lib/icons/icons';
import { ToolError, defineTool } from './registry';

/**
 * Guidance and look-ups that help a model design well. Read-only, so MCP
 * clients can call them freely.
 */

export const getDesignGuideTool = defineTool({
	name: 'get_design_guide',
	title: 'Read the design guide',
	description:
		'The design standards for Karbonized images (social media sizes, layout, typography, color, HTML block rules and a final checklist). Read it before designing if you have not yet.',
	input: z.object({}),
	mutates: false,
	execute: () => DESIGN_GUIDE,
});

export const searchIconsTool = defineTool({
	name: 'search_icons',
	title: 'Search icons',
	description: [
		'Find icon names for icon blocks (`icon` property) and `/* @type:icon */` variables of HTML blocks: the built-in font-awesome set (names like FaRocket) or an installed icon pack (names like acme:cloud).',
		'Icon packs are .kcomponent files imported into the component library; list_components shows them.',
	].join(' '),
	input: z.object({
		query: z
			.string()
			.min(1)
			.describe('Words to match, e.g. "rocket", "arrow right", "github".'),
		sets: z
			.array(z.string())
			.optional()
			.describe(
				'Limit the search to these set ids: font-awesome, or pack:<prefix> for an icon pack (default: all).',
			),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	mutates: false,
	execute: async ({ query, sets, limit }) => {
		const available = listIconSets();
		const unknown = (sets ?? []).filter(
			(id) => !available.some((set) => set.id === id),
		);
		if (unknown.length > 0) {
			throw new ToolError(
				`Unknown icon set: ${unknown.join(', ')}. Sets: ${available.map((set) => set.id).join(', ') || 'none'}.`,
			);
		}

		const icons = await searchIcons(query, {
			sets: sets?.length ? sets : available.map((set) => set.id),
			limit: limit ?? 30,
		});
		if (icons.length > 0) return { icons };
		return { icons, hint: 'No match. Try a simpler or more generic word.' };
	},
});

const FONT_KINDS = ['sans', 'serif', 'display', 'handwriting', 'mono'] as const;

export const searchFontsTool = defineTool({
	name: 'search_fonts',
	title: 'Search fonts',
	description: [
		'Find Google Fonts families for text blocks (fontFamily with fontSource "google") and the font-family of HTML blocks. The whole catalog (about 2000 families) is available and loads on its own.',
		'Returns each family with its kind and the weights it really has, most used first. Browse by kind without a query to see the popular ones, or search a name.',
	].join(' '),
	input: z.object({
		query: z
			.string()
			.optional()
			.describe(
				'Part of a family name, e.g. "grotesk", "serif display", "mono".',
			),
		kind: z
			.enum(FONT_KINDS)
			.optional()
			.describe(
				'sans (UI, clean headlines), serif (editorial, elegant), display (posters, big bold headlines), handwriting (personal, playful), mono (code, numbers, tech).',
			),
		weights: z
			.array(z.number().int().min(100).max(900))
			.optional()
			.describe('Only families that have all these weights, e.g. [400, 800].'),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	mutates: false,
	execute: async ({ query, kind, weights, limit }) => {
		const catalog = await loadGoogleCatalog();
		const needed = weights ?? [];
		const words = (query ?? '').toLowerCase().split(/\s+/).filter(Boolean);

		const fonts = catalog
			.filter(
				(font) =>
					(kind === undefined || font.category === kind) &&
					words.every((word) => font.family.toLowerCase().includes(word)) &&
					needed.every((weight) => font.weights.includes(weight)),
			)
			.slice(0, limit ?? 30);

		if (fonts.length > 0) return { fonts };
		return {
			fonts,
			hint: 'No match. Search a shorter part of the name, drop the weights or browse a kind without a query.',
		};
	},
});

export const designTools = [
	getDesignGuideTool,
	searchIconsTool,
	searchFontsTool,
];
