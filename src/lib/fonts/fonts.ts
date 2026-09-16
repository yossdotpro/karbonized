/**
 * Fonts available to text blocks.
 *
 * Two sources:
 * - `system`: fonts installed on the machine. Chromium (and the desktop app)
 *   can list them with the Local Font Access API; elsewhere we fall back to a
 *   list of common families and keep the ones the browser can actually render.
 * - `google`: families served by Google Fonts, loaded on demand with a
 *   stylesheet the exporter can read back (`crossorigin`), so exported images
 *   keep the font.
 */

export type FontSource = 'system' | 'google';

export interface FontOption {
	family: string;
	source: FontSource;
}

/** The app font: what text blocks used before fonts could be chosen. */
export const DEFAULT_FONT_FAMILY = '';

/** Families that ship with most operating systems. */
export const COMMON_SYSTEM_FONTS: readonly string[] = [
	'Arial',
	'Arial Black',
	'Bahnschrift',
	'Calibri',
	'Cambria',
	'Candara',
	'Comic Sans MS',
	'Consolas',
	'Constantia',
	'Corbel',
	'Courier New',
	'Franklin Gothic Medium',
	'Gabriola',
	'Gadugi',
	'Georgia',
	'Helvetica',
	'Impact',
	'Ink Free',
	'Lucida Console',
	'Lucida Sans Unicode',
	'Menlo',
	'Monaco',
	'Palatino Linotype',
	'Segoe UI',
	'SF Pro Display',
	'Sitka',
	'Tahoma',
	'Times New Roman',
	'Trebuchet MS',
	'Verdana',
];

export type FontCategory =
	'sans' | 'serif' | 'display' | 'handwriting' | 'mono';

export const FONT_CATEGORIES: ReadonlyArray<{
	value: FontCategory | 'all';
	label: string;
}> = [
	{ value: 'all', label: 'All' },
	{ value: 'sans', label: 'Sans' },
	{ value: 'serif', label: 'Serif' },
	{ value: 'display', label: 'Display' },
	{ value: 'handwriting', label: 'Hand' },
	{ value: 'mono', label: 'Mono' },
];

export interface GoogleFont {
	family: string;
	category: FontCategory;
	/** The weights the family really has. */
	weights: number[];
}

/**
 * The whole Google Fonts catalog, most used first. It is a generated file of
 * some two thousand families, so it is fetched the first time the picker
 * needs it instead of riding along in the main bundle.
 */
let catalog: Promise<GoogleFont[]> | null = null;

export const loadGoogleCatalog = async (): Promise<GoogleFont[]> => {
	catalog ??= import('./google-fonts').then(({ GOOGLE_FONT_ROWS }) =>
		GOOGLE_FONT_ROWS.map(([family, category, weights]) => ({
			family,
			category: category as FontCategory,
			weights: weights.split(',').map(Number),
		})),
	);

	return await catalog;
};

/** Families shown before the catalog has loaded, and as the popular ones. */
export const GOOGLE_FONTS: readonly string[] = [
	'Abril Fatface',
	'Anton',
	'Archivo',
	'Archivo Black',
	'Barlow',
	'Bebas Neue',
	'Bitter',
	'Caveat',
	'Cormorant Garamond',
	'DM Mono',
	'DM Sans',
	'DM Serif Display',
	'Dancing Script',
	'Exo 2',
	'Figtree',
	'Fira Code',
	'Fira Sans',
	'Fraunces',
	'Geist',
	'Geist Mono',
	'IBM Plex Mono',
	'IBM Plex Sans',
	'IBM Plex Serif',
	'Inconsolata',
	'Inter',
	'JetBrains Mono',
	'Josefin Sans',
	'Kanit',
	'Lato',
	'League Spartan',
	'Libre Baskerville',
	'Lobster',
	'Lora',
	'Manrope',
	'Merriweather',
	'Montserrat',
	'Mulish',
	'Nunito',
	'Nunito Sans',
	'Open Sans',
	'Oswald',
	'Outfit',
	'Pacifico',
	'Permanent Marker',
	'Playfair Display',
	'Plus Jakarta Sans',
	'Poppins',
	'Prompt',
	'PT Serif',
	'Quicksand',
	'Raleway',
	'Roboto',
	'Roboto Condensed',
	'Roboto Mono',
	'Roboto Slab',
	'Rubik',
	'Sora',
	'Source Code Pro',
	'Source Sans 3',
	'Space Grotesk',
	'Space Mono',
	'Syne',
	'Ubuntu',
	'Ubuntu Mono',
	'Urbanist',
	'Work Sans',
];

const POPULAR_FAMILIES = new Set(GOOGLE_FONTS);

/** Whether a family is one of the popular ones listed above. */
export const isGoogleFont = (family: string): boolean =>
	POPULAR_FAMILIES.has(family);

/** Weights the text panel offers. */
export const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;

/**
 * The `font-family` value for a block. An empty family keeps the app font,
 * and every family falls back to the UI stack if it cannot be loaded.
 */
export const fontStack = (family: string): string => {
	const name = family.trim();
	if (name === '') return '';
	return `"${name}", ui-sans-serif, system-ui, sans-serif`;
};

/** Stylesheet URL for one family, or for name previews when `text` is given. */
export const googleFontHref = (
	families: readonly string[],
	text?: string,
	weights: readonly number[] = FONT_WEIGHTS,
): string => {
	const axis = weights.length > 0 ? weights : FONT_WEIGHTS;
	const params = families
		.filter((family) => family.trim() !== '')
		.map(
			(family) =>
				`family=${encodeURIComponent(family.trim()).replace(/%20/g, '+')}:wght@${axis.join(';')}`,
		);

	if (text !== undefined && text !== '') {
		// Only the glyphs the previews need: a few hundred bytes per request.
		params.push(`text=${encodeURIComponent(text)}`);
	}
	params.push('display=swap');

	return `https://fonts.googleapis.com/css2?${params.join('&')}`;
};

/** Characters used by a list of names, for the `text=` parameter. */
export const previewText = (families: readonly string[]): string =>
	Array.from(new Set(families.join('').split('')))
		.sort()
		.join('');

const loaded = new Map<string, Promise<void>>();

const injectStylesheet = (href: string, key: string): Promise<void> => {
	const pending = loaded.get(key);
	if (pending) return pending;

	const promise = new Promise<void>((resolve) => {
		if (typeof document === 'undefined') {
			resolve();
			return;
		}

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;
		link.dataset.karbonizedFont = key;
		// The exporter reads the rules back to embed the font in the image.
		link.crossOrigin = 'anonymous';
		link.addEventListener('load', () => resolve());
		link.addEventListener('error', () => {
			loaded.delete(key);
			resolve();
		});
		document.head.appendChild(link);
	});

	loaded.set(key, promise);
	return promise;
};

/** Load a Google family and wait until the browser can render it. */
export const loadGoogleFont = async (
	family: string,
	weights?: readonly number[],
): Promise<void> => {
	const name = family.trim();
	if (name === '') return;

	// Ask only for the weights the family has, when they are known.
	const axis =
		weights ??
		(await loadGoogleCatalog().catch(() => [])).find(
			(font) => font.family === name,
		)?.weights ??
		FONT_WEIGHTS;

	await injectStylesheet(
		googleFontHref([name], undefined, axis),
		`family:${name}`,
	);

	if (typeof document === 'undefined' || !document.fonts) return;
	try {
		await Promise.all(
			axis.map(
				async (weight) => await document.fonts.load(`${weight} 16px "${name}"`),
			),
		);
	} catch {
		// A family that fails to load just falls back to the UI font.
	}
};

/**
 * The families of a catalog that match what was typed and the chosen
 * category, in catalog order (most used first) and capped, because no one
 * reads two thousand names at once.
 */
export const filterFonts = (
	fonts: readonly GoogleFont[],
	query: string,
	category: FontCategory | 'all' = 'all',
	limit = 60,
): GoogleFont[] => {
	const needle = query.trim().toLowerCase();

	return fonts
		.filter(
			(font) =>
				(category === 'all' || font.category === category) &&
				(needle === '' || font.family.toLowerCase().includes(needle)),
		)
		.slice(0, limit);
};

/**
 * Load the glyphs needed to show these family names in their own font. Only
 * the names are fetched (`text=`), so a page of the picker costs a few KB.
 */
export const loadGoogleFontPreviews = async (
	families: readonly string[],
): Promise<void> => {
	if (families.length === 0) return;

	const key = `previews:${families.join('|')}`;
	await injectStylesheet(
		googleFontHref(families, previewText(families), [400]),
		key,
	);
};

/**
 * Whether the browser renders `family` differently from a fallback: the way to
 * tell whether a font is installed when the Local Font Access API is missing.
 */
export const isFontAvailable = (family: string): boolean => {
	if (typeof document === 'undefined') return false;

	const context = document.createElement('canvas').getContext('2d');
	if (!context) return false;

	const sample = 'mmmwwwiiilll0123';
	const measure = (font: string) => {
		context.font = `16px ${font}`;
		return context.measureText(sample).width;
	};

	return ['monospace', 'serif', 'sans-serif'].some(
		(fallback) => measure(`"${family}", ${fallback}`) !== measure(fallback),
	);
};

interface LocalFontData {
	family: string;
}

type FontAccessWindow = Window & {
	queryLocalFonts?: () => Promise<LocalFontData[]>;
};

/**
 * Families installed on the machine, sorted. Uses the Local Font Access API
 * when available (the desktop app), otherwise the common families the browser
 * can render.
 */
export const listSystemFonts = async (): Promise<string[]> => {
	const query = (window as FontAccessWindow).queryLocalFonts;

	if (typeof query === 'function') {
		try {
			const fonts = await query.call(window);
			const families = Array.from(
				new Set(fonts.map((font) => font.family)),
			).sort((a, b) => a.localeCompare(b));
			if (families.length > 0) return families;
		} catch {
			// Permission denied or unsupported: fall back to the common list.
		}
	}

	return COMMON_SYSTEM_FONTS.filter(isFontAvailable);
};
