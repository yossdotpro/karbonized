import { z } from 'zod';
import { DESIGN_GUIDE } from '../core/design-guide';
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
		'Find icon names. Icon blocks (`icon` property) take any of them: the built-in font-awesome set (names like FaRocket) or an installed icon pack (names like acme:cloud).',
		'`/* @type:icon */` variables of HTML blocks take icon pack names only.',
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
		packsOnly: z
			.boolean()
			.optional()
			.describe('Search installed icon packs only (for @type:icon variables).'),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	mutates: false,
	execute: async ({ query, sets, packsOnly, limit }) => {
		const available = listIconSets({ packsOnly });
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
		return {
			icons,
			hint:
				available.length === 0
					? 'No icon packs are installed. Icon packs are .kcomponent files with type: icon-pack.'
					: 'No match. Try a simpler or more generic word.',
		};
	},
});

export const designTools = [getDesignGuideTool, searchIconsTool];
