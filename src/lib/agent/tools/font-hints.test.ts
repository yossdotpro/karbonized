import { describe, expect, it } from 'vitest';
import type { GoogleFont } from '@/lib/fonts/fonts';
import { cssFontHints, textFontHints } from './font-hints';

const catalog: GoogleFont[] = [
	{ family: 'Inter', category: 'sans', weights: [400, 500, 700, 800] },
	{ family: 'Bebas Neue', category: 'display', weights: [400] },
];

describe('textFontHints', () => {
	it('accepts a Google family with a weight it has', () => {
		expect(
			textFontHints(
				{ fontFamily: 'Inter', fontSource: 'google', fontWeight: 800 },
				catalog,
			),
		).toEqual([]);
	});

	it('leaves the app font and system fonts alone', () => {
		expect(textFontHints({}, catalog)).toEqual([]);
		expect(
			textFontHints({ fontFamily: 'Segoe UI', fontSource: 'system' }, catalog),
		).toEqual([]);
	});

	it('flags a family that is not in Google Fonts', () => {
		const [hint] = textFontHints(
			{ fontFamily: 'Made Up Sans', fontSource: 'google' },
			catalog,
		);
		expect(hint).toMatch(/not a Google Fonts family/);
	});

	it('asks for the google source and the exact name', () => {
		const hints = textFontHints({ fontFamily: 'bebas neue' }, catalog);
		expect(hints.join(' ')).toMatch(/"Bebas Neue"; use it exactly/);
		expect(hints.join(' ')).toMatch(/set fontSource "google"/);
	});

	it('flags a weight the family does not have, bold included', () => {
		const [hint] = textFontHints(
			{ fontFamily: 'Bebas Neue', fontSource: 'google', isBold: true },
			catalog,
		);
		expect(hint).toMatch(/no 700 weight \(it has 400\)/);
	});
});

describe('cssFontHints', () => {
	it('flags only families nobody provides', () => {
		const hints = cssFontHints(
			'.a { font-family: Inter, -apple-system, "Segoe UI", sans-serif; } .b { font-family: "Made Up Sans"; }',
			catalog,
		);
		expect(hints).toHaveLength(1);
		expect(hints[0]).toMatch(/"Made Up Sans"/);
	});
});
