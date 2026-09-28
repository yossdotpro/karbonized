import {
	COMMON_SYSTEM_FONTS,
	fontFamiliesInCss,
	type GoogleFont,
} from '@/lib/fonts/fonts';

/**
 * What is wrong with the fonts a model picked, for it to fix: a family that is
 * not in Google Fonts, a Google family left on another source (so it never
 * loads), or a weight the family does not have. Pure, so it can be tested.
 */

const byName = (catalog: readonly GoogleFont[]) =>
	new Map(catalog.map((font) => [font.family.toLowerCase(), font]));

const SYSTEM_FAMILIES = new Set(
	COMMON_SYSTEM_FONTS.map((family) => family.toLowerCase()),
);

/** Families CSS stacks name that are never meant to come from Google. */
const STACK_FAMILIES = new Set([
	'-apple-system',
	'blinkmacsystemfont',
	'helvetica neue',
	'sf pro text',
	'sf mono',
	'apple color emoji',
	'segoe ui emoji',
	'segoe ui symbol',
]);

const listWeights = (font: GoogleFont) => font.weights.join(', ');

export interface TextFontProperties {
	fontFamily?: unknown;
	fontSource?: unknown;
	fontWeight?: unknown;
	isBold?: unknown;
}

export const textFontHints = (
	properties: TextFontProperties,
	catalog: readonly GoogleFont[],
): string[] => {
	const family =
		typeof properties.fontFamily === 'string'
			? properties.fontFamily.trim()
			: '';
	if (family === '') return [];

	const source = properties.fontSource ?? 'default';
	if (source === 'system') return [];

	const font = byName(catalog).get(family.toLowerCase());
	if (!font) {
		return [
			`"${family}" is not a Google Fonts family, so it will not load. Find one with search_fonts, or set fontSource "system" for a font installed on the machine.`,
		];
	}

	const hints: string[] = [];
	if (font.family !== family) {
		hints.push(
			`The Google Fonts name is "${font.family}"; use it exactly as fontFamily.`,
		);
	}
	if (source !== 'google') {
		hints.push(
			`"${font.family}" is a Google font: set fontSource "google" or it will not load.`,
		);
	}

	const weight =
		properties.isBold === true ? 700 : Number(properties.fontWeight ?? 400);
	if (!font.weights.includes(weight)) {
		hints.push(
			`"${font.family}" has no ${weight} weight (it has ${listWeights(font)}); pick one of those or another family.`,
		);
	}
	return hints;
};

/** Families in an HTML block's CSS that neither Google nor the system provide. */
export const cssFontHints = (
	css: string,
	catalog: readonly GoogleFont[],
): string[] => {
	const known = byName(catalog);

	return fontFamiliesInCss(css)
		.filter((name) => {
			const key = name.toLowerCase();
			return (
				!known.has(key) && !SYSTEM_FAMILIES.has(key) && !STACK_FAMILIES.has(key)
			);
		})
		.map(
			(name) =>
				`font-family "${name}" is not a Google Fonts family, so it only shows where it is installed. Find one with search_fonts.`,
		);
};
