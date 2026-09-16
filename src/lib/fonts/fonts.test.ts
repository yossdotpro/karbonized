import { describe, expect, it } from 'vitest';
import {
	GOOGLE_FONTS,
	fontStack,
	filterFonts,
	googleFontHref,
	isGoogleFont,
	loadGoogleCatalog,
	previewText,
} from './fonts';

describe('fontStack', () => {
	it('keeps the app font when no family is set', () => {
		expect(fontStack('')).toBe('');
		expect(fontStack('   ')).toBe('');
	});

	it('quotes the family and adds a fallback', () => {
		expect(fontStack('Space Grotesk')).toBe(
			'"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
		);
	});
});

describe('googleFontHref', () => {
	it('asks for every weight of a family', () => {
		const href = googleFontHref(['Playfair Display']);
		expect(href).toContain(
			'family=Playfair+Display:wght@300;400;500;600;700;800',
		);
		expect(href).toContain('display=swap');
		expect(href).not.toContain('text=');
	});

	it('requests only the preview glyphs when a text is given', () => {
		const href = googleFontHref(['Inter', 'Lato'], 'aeilnort');
		expect(href).toContain('family=Inter');
		expect(href).toContain('family=Lato');
		expect(href).toContain('text=aeilnort');
	});

	it('asks only for the weights a family has, when they are known', () => {
		expect(googleFontHref(['Pacifico'], undefined, [400])).toContain(
			'family=Pacifico:wght@400',
		);
	});

	it('leaves out empty families', () => {
		expect(googleFontHref(['', ' '])).toBe(
			'https://fonts.googleapis.com/css2?display=swap',
		);
	});
});

describe('previewText', () => {
	it('collects each character once', () => {
		expect(previewText(['aa', 'ab'])).toBe('ab');
	});
});

describe('isGoogleFont', () => {
	it('recognises the popular families', () => {
		expect(isGoogleFont(GOOGLE_FONTS[0])).toBe(true);
		expect(isGoogleFont('Segoe UI')).toBe(false);
	});
});

describe('the Google Fonts catalog', () => {
	it('holds the whole catalog, most used first', async () => {
		const fonts = await loadGoogleCatalog();

		expect(fonts.length).toBeGreaterThan(1500);
		expect(fonts[0].family).toBe('Roboto');
		expect(fonts.every((font) => font.weights.length > 0)).toBe(true);
	});

	it('is read once', async () => {
		expect(await loadGoogleCatalog()).toBe(await loadGoogleCatalog());
	});
});

describe('filterFonts', () => {
	const fonts = [
		{ family: 'Roboto', category: 'sans' as const, weights: [400] },
		{ family: 'Roboto Mono', category: 'mono' as const, weights: [400] },
		{ family: 'Lora', category: 'serif' as const, weights: [400] },
	];

	it('keeps the order of the catalog', () => {
		expect(filterFonts(fonts, '', 'all').map((font) => font.family)).toEqual([
			'Roboto',
			'Roboto Mono',
			'Lora',
		]);
	});

	it('matches part of a name, whatever the case', () => {
		expect(filterFonts(fonts, 'robo', 'all')).toHaveLength(2);
		expect(filterFonts(fonts, 'ROBOTO MONO', 'all')).toHaveLength(1);
	});

	it('narrows down to a category', () => {
		expect(filterFonts(fonts, '', 'serif').map((font) => font.family)).toEqual([
			'Lora',
		]);
	});

	it('never returns more than the limit', () => {
		expect(filterFonts(fonts, '', 'all', 2)).toHaveLength(2);
	});
});
