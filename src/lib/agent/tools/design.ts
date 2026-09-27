import { z } from 'zod';
import { DESIGN_GUIDE } from '../core/design-guide';
import { ICON_SETS, searchIcons } from '@/lib/icons/icons';
import { defineTool } from './registry';

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
		'Find icon names for the `icon` property of icon blocks and for `/* @type:icon */` variables of HTML blocks.',
		`Sets: ${ICON_SETS.map((set) => `${set.id} (${set.name}, names start with ${set.prefix})`).join('; ')}.`,
		'Use lucide for UI and feature icons, brands for company and product logos.',
	].join(' '),
	input: z.object({
		query: z
			.string()
			.min(1)
			.describe('Words to match, e.g. "rocket", "arrow right", "github".'),
		sets: z
			.array(z.enum(ICON_SETS.map((set) => set.id) as [string, ...string[]]))
			.optional()
			.describe('Limit the search to these sets (default: all).'),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	mutates: false,
	execute: async ({ query, sets, limit }) => {
		const icons = await searchIcons(query, { sets, limit: limit ?? 30 });
		return icons.length > 0
			? { icons }
			: { icons, hint: 'No match. Try a simpler or more generic word.' };
	},
});

export const designTools = [getDesignGuideTool, searchIconsTool];
