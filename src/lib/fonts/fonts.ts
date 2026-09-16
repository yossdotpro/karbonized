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

/** A selection of Google Fonts, grouped the way the picker shows them. */
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

const GOOGLE_FAMILIES = new Set(GOOGLE_FONTS);

export const isGoogleFont = (family: string): boolean =>
	GOOGLE_FAMILIES.has(family);

/** Weights requested from Google Fonts: regular, semibold and bold text. */
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
): string => {
	const params = families
		.filter((family) => family.trim() !== '')
		.map(
			(family) =>
				`family=${encodeURIComponent(family.trim()).replace(/%20/g, '+')}:wght@${FONT_WEIGHTS.join(';')}`,
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
export const loadGoogleFont = async (family: string): Promise<void> => {
	const name = family.trim();
	if (name === '') return;

	await injectStylesheet(googleFontHref([name]), `family:${name}`);

	if (typeof document === 'undefined' || !document.fonts) return;
	try {
		await Promise.all(
			FONT_WEIGHTS.map(
				async (weight) => await document.fonts.load(`${weight} 16px "${name}"`),
			),
		);
	} catch {
		// A family that fails to load just falls back to the UI font.
	}
};

/** Load the small subset used to preview family names in the picker. */
export const loadGoogleFontPreviews = async (
	families: readonly string[] = GOOGLE_FONTS,
): Promise<void> => {
	if (families.length === 0) return;
	await injectStylesheet(
		googleFontHref(families, previewText(families)),
		'previews',
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
