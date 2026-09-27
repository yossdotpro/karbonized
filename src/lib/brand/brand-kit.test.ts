import { describe, expect, it } from 'vitest';
import {
	describeBrandKit,
	isBrandKitEmpty,
	normalizeBrandKit,
	normalizeHex,
	pickLogo,
} from './brand-kit';

const logo = (id: string, variant: string) => ({
	id,
	name: id,
	variant,
	src: 'data:image/png;base64,AAAA',
	width: 200,
	height: 50,
});

describe('brand kit', () => {
	it('normalizes colors, fonts and logos', () => {
		const kit = normalizeBrandKit({
			name: 'Acme',
			colors: [
				{ name: 'Ink', value: '#ABC' },
				{ name: 'Bad', value: 'red' },
				{ value: '#112233ff' },
			],
			fonts: {
				heading: { family: 'Sora', source: 'google' },
				body: { family: '', source: 'google' },
				code: { family: 'Fira Code', source: 'cdn' },
			},
			logos: [
				logo('a', 'light'),
				{ ...logo('b', 'weird'), src: 'https://example.com/logo.png' },
				logo('c', 'nope'),
			],
			notes: 'Lowercase headlines.',
		});

		expect(kit.colors).toEqual([
			{ name: 'Ink', value: '#aabbcc' },
			{ name: '', value: '#112233ff' },
		]);
		expect(kit.fonts).toEqual({
			heading: { family: 'Sora', source: 'google' },
		});
		expect(kit.logos.map((item) => [item.id, item.variant])).toEqual([
			['a', 'light'],
			['c', 'primary'],
		]);
		expect(isBrandKitEmpty(kit)).toBe(false);
		expect(isBrandKitEmpty(normalizeBrandKit(null))).toBe(true);
	});

	it('describes the kit without the logo images', () => {
		const kit = normalizeBrandKit({ logos: [logo('a', 'dark')] });
		expect(describeBrandKit(kit).logos).toEqual([
			{ id: 'a', name: 'a', variant: 'dark', width: 200, height: 50 },
		]);
	});

	it('picks logos by id, variant or primary first', () => {
		const kit = normalizeBrandKit({
			logos: [logo('a', 'dark'), logo('b', 'primary')],
		});
		expect(pickLogo(kit)?.id).toBe('b');
		expect(pickLogo(kit, 'dark')?.id).toBe('a');
		expect(pickLogo(kit, 'b')?.id).toBe('b');
		expect(pickLogo(kit, 'light')).toBeUndefined();
	});

	it('reads hex colors', () => {
		expect(normalizeHex(' #FFF ')).toBe('#ffffff');
		expect(normalizeHex('#12345678')).toBe('#12345678');
		expect(normalizeHex('#12345')).toBeNull();
	});
});
