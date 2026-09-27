import { describe, expect, it } from 'vitest';
import {
	ICON_SETS,
	iconMaskUrl,
	iconSetOf,
	iconSvg,
	normalizeIconName,
	resolveIcon,
	searchIcons,
} from './icons';

describe('icon registry', () => {
	it('gives every set a distinct prefix', () => {
		const prefixes = ICON_SETS.map((set) => set.prefix);
		expect(new Set(prefixes).size).toBe(prefixes.length);
	});

	it('finds the set of a name by its prefix', () => {
		expect(iconSetOf('FaRocket')?.id).toBe('font-awesome');
		expect(iconSetOf('LuSparkles')?.id).toBe('lucide');
		expect(iconSetOf('SiGithub')?.id).toBe('brands');
		expect(iconSetOf('Rocket')).toBeUndefined();
	});

	it('normalizes quoted names', () => {
		expect(normalizeIconName(' "LuRocket" ')).toBe('LuRocket');
	});

	it('renders a standalone SVG with one namespace', async () => {
		const svg = await iconSvg('LuRocket');
		expect(svg).toMatch(/^<svg /);
		expect(svg?.match(/xmlns=/g)).toHaveLength(1);
		expect(await iconMaskUrl('LuRocket')).toMatch(
			/^url\("data:image\/svg\+xml;utf8,/,
		);
	});

	it('returns null for unknown icons', async () => {
		expect(await resolveIcon('LuNotAnIconAtAll')).toBeNull();
		expect(await iconSvg('Nope')).toBeNull();
	});

	it('searches across sets, exact words first', async () => {
		const results = await searchIcons('rocket', {
			sets: ['lucide', 'font-awesome'],
		});
		expect(results).toContain('LuRocket');
		expect(results).toContain('FaRocket');
		expect(results.indexOf('LuRocket')).toBeLessThan(results.length);
		expect(await searchIcons('github', { sets: ['brands'] })).toContain(
			'SiGithub',
		);
	});
});
