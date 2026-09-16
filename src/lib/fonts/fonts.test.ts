import { describe, expect, it } from 'vitest';
import {
	GOOGLE_FONTS,
	fontStack,
	googleFontHref,
	isGoogleFont,
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
	it('recognises families from the catalog', () => {
		expect(isGoogleFont(GOOGLE_FONTS[0])).toBe(true);
		expect(isGoogleFont('Segoe UI')).toBe(false);
	});
});
