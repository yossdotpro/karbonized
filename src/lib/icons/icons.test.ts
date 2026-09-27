import { beforeEach, describe, expect, it } from 'vitest';
import { useKComponentStore } from '@/stores/kcomponent-store';
import { parseKComponent } from '@/utils/kcomponentParser';
import {
	BUILT_IN_ICON_SETS,
	iconMaskUrl,
	iconSetOf,
	iconSvg,
	listIconSets,
	loadIconSet,
	normalizeIconName,
	resolveIcon,
	searchIcons,
} from './icons';

const PACK = `
manifest:
  name: "Test Shapes"
  author: "Karbonized tests"
  type: icon-pack
  prefix: shapes
  license: MIT
icons:
  square: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16"/></svg>'
  arrow-right: '<svg viewBox="0 0 24 24"><path d="M4 12h14M12 6l6 6-6 6"/></svg>'
`;

beforeEach(() => {
	useKComponentStore.setState({ importedComponents: [] });
});

const installPack = () =>
	useKComponentStore.getState().importComponents([parseKComponent(PACK)]);

describe('built-in icons', () => {
	it('finds the set of a name by its prefix', () => {
		expect(iconSetOf('FaRocket')?.id).toBe('font-awesome');
		expect(iconSetOf('Rocket')).toBeUndefined();
		expect(BUILT_IN_ICON_SETS.map((set) => set.id)).toEqual(['font-awesome']);
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
});

describe('icon packs', () => {
	it('lists installed packs as sets after the built-in ones', () => {
		expect(listIconSets().map((set) => set.id)).toEqual(['font-awesome']);
		installPack();
		expect(listIconSets().map((set) => set.id)).toEqual([
			'font-awesome',
			'pack:shapes',
		]);
		expect(iconSetOf('shapes:square')?.name).toBe('Test Shapes');
	});

	it('names pack icons prefix:name and serves their SVG', async () => {
		installPack();
		const names = (await loadIconSet('pack:shapes')).map((entry) => entry.name);
		expect(names).toEqual(['shapes:square', 'shapes:arrow-right']);
		expect(await iconSvg('shapes:square')).toContain('<rect');
		expect(await iconMaskUrl('"shapes:square"')).toMatch(/^url\("data:/);
		expect(await resolveIcon('shapes:nope')).toBeNull();
		expect(await resolveIcon('other:square')).toBeNull();
	});

	it('searches pack icons by the words of their names', async () => {
		installPack();
		expect(await searchIcons('arrow', { sets: ['pack:shapes'] })).toEqual([
			'shapes:arrow-right',
		]);
	});

	it('forgets icons when the pack is removed', async () => {
		const [result] = installPack();
		useKComponentStore.getState().removeImportedComponent(result.id!);
		expect(await iconSvg('shapes:square')).toBeNull();
	});
});
