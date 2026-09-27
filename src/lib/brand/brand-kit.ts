import type { FontSource } from '@/lib/fonts/fonts';

/**
 * The brand kit: the colors, fonts, logos and guidelines of the user's brand,
 * kept in one place. The color and font pickers offer it first, and Agent and
 * MCP clients read it (`get_brand_kit`) before designing.
 */

export interface BrandColor {
	name: string;
	/** `#rrggbb` or `#rrggbbaa`. */
	value: string;
}

export interface BrandFont {
	family: string;
	source: FontSource;
}

export type BrandFontRole = 'heading' | 'body' | 'code';

export type LogoVariant = 'primary' | 'light' | 'dark' | 'mark';

export interface BrandLogo {
	id: string;
	name: string;
	variant: LogoVariant;
	/** A data URL, so exports never depend on the network. */
	src: string;
	/** Natural size, to keep the proportions when it is placed. */
	width: number;
	height: number;
}

export interface BrandKit {
	name: string;
	colors: BrandColor[];
	fonts: Partial<Record<BrandFontRole, BrandFont>>;
	logos: BrandLogo[];
	/** Guidelines for Agent: tone, do and don't, how the logo is used. */
	notes: string;
}

export const BRAND_FONT_ROLES: BrandFontRole[] = ['heading', 'body', 'code'];
export const LOGO_VARIANTS: LogoVariant[] = [
	'primary',
	'light',
	'dark',
	'mark',
];

export const BRAND_LIMITS = {
	colors: 24,
	logos: 8,
	/** Per logo, as a data URL. */
	logoBytes: 2 * 1024 * 1024,
	notes: 4000,
	name: 80,
};

export const EMPTY_BRAND_KIT: BrandKit = {
	name: '',
	colors: [],
	fonts: {},
	logos: [],
	notes: '',
};

const HEX_COLOR = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i;

export const isBrandKitEmpty = (kit: BrandKit): boolean =>
	kit.name.trim() === '' &&
	kit.colors.length === 0 &&
	Object.keys(kit.fonts).length === 0 &&
	kit.logos.length === 0 &&
	kit.notes.trim() === '';

/** `#abc` → `#aabbcc`; anything else that is not hex is rejected. */
export const normalizeHex = (value: string): string | null => {
	const trimmed = value.trim().toLowerCase();
	const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(trimmed);
	if (short)
		return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
	return HEX_COLOR.test(trimmed) ? trimmed : null;
};

/** Keep only well-formed parts of a stored or imported kit. */
export const normalizeBrandKit = (value: unknown): BrandKit => {
	if (typeof value !== 'object' || value === null) return EMPTY_BRAND_KIT;
	const raw = value as Partial<BrandKit>;

	const colors = (Array.isArray(raw.colors) ? raw.colors : [])
		.flatMap((color) => {
			const hex =
				typeof color?.value === 'string' ? normalizeHex(color.value) : null;
			if (!hex) return [];
			return [
				{
					name:
						typeof color.name === 'string'
							? color.name.trim().slice(0, 40)
							: '',
					value: hex,
				},
			];
		})
		.slice(0, BRAND_LIMITS.colors);

	const fonts: BrandKit['fonts'] = {};
	for (const role of BRAND_FONT_ROLES) {
		const font = raw.fonts?.[role];
		if (
			font &&
			typeof font.family === 'string' &&
			font.family.trim() !== '' &&
			(font.source === 'google' || font.source === 'system')
		) {
			fonts[role] = { family: font.family.trim(), source: font.source };
		}
	}

	const logos = (Array.isArray(raw.logos) ? raw.logos : [])
		.filter(
			(logo): logo is BrandLogo =>
				typeof logo?.id === 'string' &&
				typeof logo.src === 'string' &&
				logo.src.startsWith('data:image/') &&
				logo.src.length <= BRAND_LIMITS.logoBytes * 1.4 &&
				Number(logo.width) > 0 &&
				Number(logo.height) > 0,
		)
		.map((logo) => ({
			id: logo.id,
			name: typeof logo.name === 'string' ? logo.name.slice(0, 60) : 'Logo',
			variant: LOGO_VARIANTS.includes(logo.variant) ? logo.variant : 'primary',
			src: logo.src,
			width: Number(logo.width),
			height: Number(logo.height),
		}))
		.slice(0, BRAND_LIMITS.logos);

	return {
		name:
			typeof raw.name === 'string' ? raw.name.slice(0, BRAND_LIMITS.name) : '',
		colors,
		fonts,
		logos,
		notes:
			typeof raw.notes === 'string'
				? raw.notes.slice(0, BRAND_LIMITS.notes)
				: '',
	};
};

/** The kit as a model reads it: everything but the logo images. */
export const describeBrandKit = (kit: BrandKit) => ({
	name: kit.name || undefined,
	colors: kit.colors,
	fonts: kit.fonts,
	logos: kit.logos.map(({ id, name, variant, width, height }) => ({
		id,
		name,
		variant,
		width,
		height,
	})),
	notes: kit.notes || undefined,
});

/** The logo to use: by id, by variant, or the first one. */
export const pickLogo = (
	kit: BrandKit,
	which?: string,
): BrandLogo | undefined =>
	which
		? (kit.logos.find((logo) => logo.id === which) ??
			kit.logos.find((logo) => logo.variant === which))
		: (kit.logos.find((logo) => logo.variant === 'primary') ?? kit.logos[0]);
