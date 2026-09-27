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
		expect(iconSetOf('FaRegHeart')?.id).toBe('font-awesome');
		expect(iconSetOf('Rocket')).toBeUndefined();
	});

	it('normalizes quoted names', () => {
		expect(normalizeIconName(' "FaRocket" ')).toBe('FaRocket');
	});

	it('renders a standalone SVG with one namespace', async () => {
		const svg = await iconSvg('FaRocket');
		expect(svg).toMatch(/^<svg /);
		expect(svg?.match(/xmlns=/g)).toHaveLength(1);
		expect(await iconMaskUrl('FaRocket')).toMatch(
			/^url\("data:image\/svg\+xml;utf8,/,
		);
	});

	it('returns null for unknown icons', async () => {
		expect(await resolveIcon('FaNotAnIconAtAll')).toBeNull();
		expect(await iconSvg('Nope')).toBeNull();
	});

	it('searches icon names, exact words first', async () => {
		const results = await searchIcons('rocket');
		expect(results[0]).toBe('FaRocket');
		expect(await searchIcons('github')).toContain('FaGithub');
	});
});
