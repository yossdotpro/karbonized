import { z } from 'zod';
import {
	describeBrandKit,
	isBrandKitEmpty,
	pickLogo,
} from '@/lib/brand/brand-kit';
import { addBlock, waitForBlock } from '@/lib/editor/actions';
import { useBrandStore } from '@/stores/brand-store';
import { compactBlock } from './blocks';
import { ToolError, defineTool } from './registry';

/** The brand kit, once it has been read from storage. */
const brandKit = async () => {
	if (!useBrandStore.getState().hydrated) {
		await useBrandStore.persist.rehydrate();
	}
	return useBrandStore.getState().kit;
};

export const getBrandKitTool = defineTool({
	name: 'get_brand_kit',
	title: 'Read the brand kit',
	description:
		"The user's brand: named colors, fonts for headings, body and code, logos (place them with add_brand_logo) and guidelines. Read it before designing and use it instead of picking your own palette and fonts, unless the user asks for something else.",
	input: z.object({}),
	mutates: false,
	execute: async () => {
		const kit = await brandKit();
		if (isBrandKitEmpty(kit)) {
			return {
				empty: true,
				hint: 'No brand kit is set. Choose colors and fonts from the design guide; the user can set a brand kit from the command palette (Brand kit).',
			};
		}
		return describeBrandKit(kit);
	},
});

export const addBrandLogoTool = defineTool({
	name: 'add_brand_logo',
	title: 'Add the brand logo',
	description:
		'Place a logo of the brand kit on the canvas as an image block, keeping its proportions. Pick it by id or variant (primary, light, dark, mark); by default the primary logo. Use light on dark backgrounds and dark on light ones when the kit has both.',
	input: z.object({
		logo: z
			.string()
			.optional()
			.describe('Logo id or variant (primary, light, dark, mark).'),
		x: z.number().optional().describe('Left edge in canvas pixels.'),
		y: z.number().optional().describe('Top edge in canvas pixels.'),
		width: z
			.number()
			.positive()
			.optional()
			.describe('Width in pixels (default 160); the height follows.'),
	}),
	mutates: true,
	execute: ({ logo, x, y, width }) => {
		const { kit } = useBrandStore.getState();
		const found = pickLogo(kit, logo);
		if (!found) {
			throw new ToolError(
				kit.logos.length === 0
					? 'The brand kit has no logo.'
					: `No logo "${logo}". Logos: ${kit.logos.map((item) => `${item.id} (${item.variant})`).join(', ')}.`,
			);
		}
		const blockWidth = Math.round(width ?? 160);
		return addBlock({
			type: 'image',
			name: found.name,
			x,
			y,
			width: blockWidth,
			height: Math.max(
				20,
				Math.round((blockWidth * found.height) / found.width),
			),
			properties: { src: found.src, fit: 'contain' },
		});
	},
	settle: async (block) => {
		await waitForBlock(block.id);
		return compactBlock(block.id);
	},
});

export const brandTools = [getBrandKitTool, addBrandLogoTool];
