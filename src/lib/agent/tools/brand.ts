import { z } from 'zod';
import {
	type BrandFont,
	type BrandFontRole,
	type BrandKit,
	type BrandLogo,
	BRAND_FONT_ROLES,
	BRAND_LIMITS,
	LOGO_VARIANTS,
	describeBrandKit,
	isBrandKitEmpty,
	normalizeHex,
	pickLogo,
} from '@/lib/brand/brand-kit';
import { type LogoImage, imageSize, svgLogo } from '@/lib/brand/brand-logo';
import {
	addBlock,
	requireBlock,
	summarizeBlock,
	waitForBlock,
} from '@/lib/editor/actions';
import { COMMON_SYSTEM_FONTS, loadGoogleCatalog } from '@/lib/fonts/fonts';
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
				hint: 'No brand kit is set. Choose colors and fonts from the design guide. When the user gives you their brand (or asks you to create one), save it with update_brand_kit and save_brand_logo.',
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
		// Mutating tools run synchronously, so the kit cannot be awaited here;
		// right after launch it may still be on its way from IndexedDB.
		const { kit, hydrated } = useBrandStore.getState();
		if (!hydrated) {
			throw new ToolError(
				'The brand kit is still loading. Call get_brand_kit, then try again.',
			);
		}
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

const fontInput = z
	.object({
		family: z.string().min(1).describe('Font family, e.g. "Space Grotesk".'),
		source: z
			.enum(['google', 'system'])
			.optional()
			.describe('google (default, loaded from Google Fonts) or system.'),
	})
	.nullable();

/** Check a font against the Google catalog; returns it with the catalog's name. */
const resolveFont = async (
	role: BrandFontRole,
	font: { family: string; source?: 'google' | 'system' },
): Promise<BrandFont> => {
	const family = font.family.trim();
	const source = font.source ?? 'google';
	if (source === 'system') {
		const known = COMMON_SYSTEM_FONTS.find(
			(name) => name.toLowerCase() === family.toLowerCase(),
		);
		return { family: known ?? family, source };
	}
	const catalog = await loadGoogleCatalog().catch(() => []);
	if (catalog.length === 0) return { family, source };
	const found = catalog.find(
		(item) => item.family.toLowerCase() === family.toLowerCase(),
	);
	if (!found) {
		throw new ToolError(
			`The ${role} font "${family}" is not in Google Fonts. Look it up with search_fonts, or give source "system" for a font installed on the machine.`,
		);
	}
	return { family: found.family, source };
};

/** Save the kit, keeping what is not changed; the panel shows it at once. */
const saveKit = (kit: BrandKit) => {
	useBrandStore.getState().setKit(kit);
	return useBrandStore.getState().kit;
};

export const updateBrandKitTool = defineTool({
	name: 'update_brand_kit',
	title: 'Edit the brand kit',
	description:
		"Create or change the user's brand kit: its name, colors, fonts for headings, body and code, the name and use of its logos, and the guidelines. Only the fields given change. colors replaces the whole palette (read it with get_brand_kit first to keep colors); a font set to null is removed. Add logos with save_brand_logo. Change the brand kit only when the user asks for it or gives you their brand, not to try a palette for one design. The user sees and edits it in the Brand kit tab of the properties panel; changes are saved at once and are not part of the canvas undo.",
	input: z.object({
		name: z.string().max(BRAND_LIMITS.name).optional().describe('Brand name.'),
		colors: z
			.array(
				z.object({
					name: z
						.string()
						.describe('Role of the color: Primary, Accent, Ink, Background…'),
					value: z.string().describe('Hex color, #rrggbb or #rrggbbaa.'),
				}),
			)
			.max(BRAND_LIMITS.colors)
			.optional()
			.describe('The whole palette, in order of importance.'),
		fonts: z
			.object({ heading: fontInput, body: fontInput, code: fontInput })
			.partial()
			.optional()
			.describe(
				'Fonts by role, each { family: "Space Grotesk", source?: "google" | "system" }, e.g. { heading: { family: "Space Grotesk" }, code: null }. null removes the font of that role; roles left out stay.',
			),
		logos: z
			.array(
				z.object({
					id: z.string(),
					name: z.string().optional(),
					variant: z
						.enum(LOGO_VARIANTS as [string, ...string[]])
						.optional()
						.describe(
							'primary, light (for dark backgrounds), dark (for light backgrounds) or mark.',
						),
				}),
			)
			.optional()
			.describe('Rename logos or change what they are for.'),
		removeLogos: z.array(z.string()).optional().describe('Logo ids to remove.'),
		notes: z
			.string()
			.max(BRAND_LIMITS.notes)
			.optional()
			.describe(
				'Guidelines: tone of voice, what to avoid, how the logo is used. Replaces the current ones.',
			),
	}),
	mutates: false,
	execute: async ({ name, colors, fonts, logos, removeLogos, notes }) => {
		const kit = await brandKit();
		const next: BrandKit = { ...kit, fonts: { ...kit.fonts } };

		if (name !== undefined) next.name = name.trim();
		if (notes !== undefined) next.notes = notes;

		if (colors !== undefined) {
			const invalid = colors.filter((color) => !normalizeHex(color.value));
			if (invalid.length > 0) {
				throw new ToolError(
					`Not hex colors: ${invalid.map((color) => `${color.name} ${color.value}`).join(', ')}. Use #rrggbb or #rrggbbaa.`,
				);
			}
			next.colors = colors.map((color) => ({
				name: color.name.trim(),
				value: normalizeHex(color.value)!,
			}));
		}

		if (fonts !== undefined) {
			for (const role of BRAND_FONT_ROLES) {
				const font = fonts[role];
				if (font === undefined) continue;
				if (font === null) delete next.fonts[role];
				else next.fonts[role] = await resolveFont(role, font);
			}
		}

		const known = new Set(kit.logos.map((logo) => logo.id));
		const unknown = [
			...(logos ?? []).map((logo) => logo.id),
			...(removeLogos ?? []),
		].filter((id) => !known.has(id));
		if (unknown.length > 0) {
			throw new ToolError(
				`No logo ${unknown.join(', ')}. Logos: ${kit.logos.map((logo) => logo.id).join(', ') || 'none'}.`,
			);
		}
		next.logos = kit.logos
			.filter((logo) => !removeLogos?.includes(logo.id))
			.map((logo) => {
				const change = logos?.find((item) => item.id === logo.id);
				return change
					? {
							...logo,
							name: change.name?.trim() || logo.name,
							variant: (change.variant as BrandLogo['variant']) ?? logo.variant,
						}
					: logo;
			});

		return { saved: true, brandKit: describeBrandKit(saveKit(next)) };
	},
});

export const saveBrandLogoTool = defineTool({
	name: 'save_brand_logo',
	title: 'Save a logo in the brand kit',
	description:
		'Add a logo to the brand kit, from one of: svg (SVG markup with a viewBox, e.g. a wordmark or mark you drew; draw letters as paths or use a common font, since the image cannot load web fonts), src (a data:image/… URL) or blockId (an image block on the canvas that holds one). Then place it with add_brand_logo. Only when the user asks for it or gives you their logo.',
	input: z.object({
		name: z.string().min(1).max(60).describe('Logo name.'),
		variant: z
			.enum(LOGO_VARIANTS as [string, ...string[]])
			.optional()
			.describe(
				'primary, light (for dark backgrounds), dark (for light backgrounds) or mark. Default: primary for the first logo, mark after it.',
			),
		svg: z.string().optional().describe('SVG markup.'),
		src: z.string().optional().describe('A data:image/… URL.'),
		blockId: z
			.string()
			.optional()
			.describe('An image block whose image becomes the logo.'),
	}),
	mutates: false,
	execute: async ({ name, variant, svg, src, blockId }) => {
		const sources = [svg, src, blockId].filter((item) => item !== undefined);
		if (sources.length !== 1) {
			throw new ToolError('Give exactly one of svg, src or blockId.');
		}

		const kit = await brandKit();
		if (kit.logos.length >= BRAND_LIMITS.logos) {
			throw new ToolError(
				`The brand kit already holds ${BRAND_LIMITS.logos} logos; remove one with update_brand_kit first.`,
			);
		}

		let image: LogoImage;
		if (svg !== undefined) {
			const result = svgLogo(svg);
			if (!result.ok) throw new ToolError(result.error);
			image = result.logo;
		} else {
			const data =
				src ??
				String(summarizeBlock(requireBlock(blockId!)).properties.src ?? '');
			if (!/^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/.test(data)) {
				throw new ToolError(
					blockId
						? `Block ${blockId} does not hold an image as a data URL.`
						: 'src must be a data:image/png, jpeg, webp, gif or svg+xml URL.',
				);
			}
			const size = await imageSize(data);
			if (!size) throw new ToolError('The image could not be read.');
			image = { src: data, ...size };
		}

		if (image.src.length > BRAND_LIMITS.logoBytes * 1.4) {
			throw new ToolError('The logo is larger than 2 MB.');
		}

		const logo: BrandLogo = {
			id: `logo-${Date.now().toString(36)}-${kit.logos.length}`,
			name: name.trim(),
			variant:
				(variant as BrandLogo['variant']) ??
				(kit.logos.length === 0 ? 'primary' : 'mark'),
			...image,
		};
		const saved = saveKit({ ...kit, logos: [...kit.logos, logo] });
		const stored = saved.logos.find((item) => item.id === logo.id);
		if (!stored) throw new ToolError('The logo could not be saved.');
		const { id, width, height } = stored;
		return {
			saved: true,
			logo: { id, name: stored.name, variant: stored.variant, width, height },
		};
	},
});

export const brandTools = [
	getBrandKitTool,
	updateBrandKitTool,
	saveBrandLogoTool,
	addBrandLogoTool,
];
