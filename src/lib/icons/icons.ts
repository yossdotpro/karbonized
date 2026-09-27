import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { useKComponentStore } from '@/stores/kcomponent-store';
import { isIconPack } from '@/models/KComponent';

/**
 * Icons available in the app, from two kinds of sets:
 *
 * - **Built-in**: Font Awesome, the set the Icon block has always used. Names
 *   carry the set prefix: `FaRocket`.
 * - **Icon packs**: `.kcomponent` files made by creators and imported into
 *   the component library (`docs/icon-packs.md`). Names are
 *   `<pack prefix>:<icon>`, e.g. `acme:cloud`.
 *
 * A saved design stores the name only. The Icon block offers every set;
 * `@type:icon` variables of components offer icon packs only.
 */

export type IconComponent = ComponentType<{
	size?: string | number;
	className?: string;
	style?: React.CSSProperties;
}>;

export interface IconSet {
	/** Stable id, used by the picker tabs and search_icons. */
	id: string;
	name: string;
	/** What every icon name of the set starts with (`Fa`, `acme:`). */
	prefix: string;
	license?: string;
	url?: string;
	kind: 'built-in' | 'pack';
}

export interface IconEntry {
	name: string;
	icon: IconComponent;
}

interface BuiltInSet extends IconSet {
	kind: 'built-in';
	/** A module whose exports are the icons, keyed by name. */
	load: () => Promise<Record<string, unknown>>;
}

export const BUILT_IN_ICON_SETS: readonly BuiltInSet[] = [
	{
		id: 'font-awesome',
		name: 'Font Awesome',
		prefix: 'Fa',
		license: 'CC BY 4.0',
		url: 'https://fontawesome.com',
		kind: 'built-in',
		load: () => import('react-icons/fa'),
	},
];

const PACK_ID_PREFIX = 'pack:';

/** Icon packs installed in the component library. */
const installedPacks = () =>
	useKComponentStore
		.getState()
		.importedComponents.map((entry) => entry.component)
		.filter(isIconPack);

const packSet = (
	component: ReturnType<typeof installedPacks>[number],
): IconSet => ({
	id: `${PACK_ID_PREFIX}${component.manifest.prefix}`,
	name: component.manifest.name,
	prefix: `${component.manifest.prefix}:`,
	license: component.manifest.license,
	kind: 'pack',
});

/** Sets to offer: built-in sets and installed packs, or packs only. */
export const listIconSets = ({
	packsOnly = false,
}: { packsOnly?: boolean } = {}): IconSet[] => [
	...(packsOnly ? [] : BUILT_IN_ICON_SETS),
	...installedPacks().map(packSet),
];

const packByPrefix = (prefix: string) =>
	installedPacks().find((pack) => pack.manifest.prefix === prefix);

/** The set an icon name belongs to. */
export const iconSetOf = (name: string): IconSet | undefined => {
	const colon = name.indexOf(':');
	if (colon > 0) {
		const pack = packByPrefix(name.slice(0, colon));
		return pack ? packSet(pack) : undefined;
	}
	return BUILT_IN_ICON_SETS.find(
		(set) =>
			name.startsWith(set.prefix) &&
			// `Fa` must not claim a name such as `Far…` from another set.
			/[A-Z0-9]/.test(name.charAt(set.prefix.length)),
	);
};

/** Pack SVGs have no size (sanitizing drops it); fill the element they sit in. */
export const sizedSvg = (svg: string) =>
	svg.replace('<svg ', '<svg width="100%" height="100%" ');

const packIconCache = new Map<string, IconComponent>();

/** A component that renders a pack icon's (sanitized) SVG. */
const packIcon = (svg: string): IconComponent => {
	const cached = packIconCache.get(svg);
	if (cached) return cached;

	const PackIcon: IconComponent = ({ className, style }) =>
		createElement('span', {
			className,
			style: className
				? { display: 'inline-flex', ...style }
				: { display: 'inline-flex', width: '1em', height: '1em', ...style },
			dangerouslySetInnerHTML: { __html: sizedSvg(svg) },
		});
	packIconCache.set(svg, PackIcon);
	return PackIcon;
};

const loaded = new Map<string, Promise<IconEntry[]>>();

/** Every icon of a set, in the order the set lists them. */
export const loadIconSet = async (id: string): Promise<IconEntry[]> => {
	if (id.startsWith(PACK_ID_PREFIX)) {
		// Packs can be updated or removed at any time: read them every time.
		const pack = packByPrefix(id.slice(PACK_ID_PREFIX.length));
		return Object.entries(pack?.icons ?? {}).map(([name, svg]) => ({
			name: `${pack?.manifest.prefix}:${name}`,
			icon: packIcon(svg),
		}));
	}

	const set = BUILT_IN_ICON_SETS.find((item) => item.id === id);
	if (!set) return [];

	let entries = loaded.get(id);
	if (!entries) {
		entries = set
			.load()
			.then((module) =>
				Object.entries(module)
					.filter(
						([name, value]) =>
							name.startsWith(set.prefix) && typeof value === 'function',
					)
					.map(([name, value]) => ({ name, icon: value as IconComponent })),
			)
			.catch((error) => {
				loaded.delete(id);
				throw error;
			});
		loaded.set(id, entries);
	}
	return entries;
};

/** `"FaRocket"`, `'FaRocket'` or ` FaRocket ` → `FaRocket`. */
export const normalizeIconName = (value: unknown): string =>
	String(value ?? '')
		.trim()
		.replace(/^["']|["']$/g, '')
		.trim();

/** The stored SVG of a pack icon (`prefix:name`), or null. */
const packSvg = (name: string): string | null => {
	const colon = name.indexOf(':');
	if (colon <= 0) return null;
	const pack = packByPrefix(name.slice(0, colon));
	return pack?.icons?.[name.slice(colon + 1)] ?? null;
};

/** The component of an icon, or null when no set has it. */
export const resolveIcon = async (
	name: string,
): Promise<IconComponent | null> => {
	const key = normalizeIconName(name);
	const pack = packSvg(key);
	if (pack) return packIcon(pack);

	const set = iconSetOf(key);
	if (!set) return null;
	const entries = await loadIconSet(set.id);
	return entries.find((entry) => entry.name === key)?.icon ?? null;
};

const svgCache = new Map<string, string>();

/** SVG markup of an icon (painted with `currentColor`), or null. */
export const iconSvg = async (name: string): Promise<string | null> => {
	const key = normalizeIconName(name);
	const pack = packSvg(key);
	if (pack) return pack;

	const cached = svgCache.get(key);
	if (cached) return cached;

	const icon = await resolveIcon(key);
	if (!icon) return null;

	const markup = renderToStaticMarkup(createElement(icon, { size: '1em' }));
	// Standalone SVG (as in a data URL) needs the namespace, exactly once.
	const svg = markup.includes('xmlns=')
		? markup
		: markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
	svgCache.set(key, svg);
	return svg;
};

/**
 * CSS `url()` of an icon, meant for `mask-image` so the icon takes the color
 * of `background-color` (see the `.k-icon` helper of HTML blocks).
 */
export const iconMaskUrl = async (name: string): Promise<string | null> => {
	const svg = await iconSvg(name);
	return svg
		? `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
		: null;
};

/** `FaArrowRight` → `arrow right`; `acme:arrow-right` → `arrow right`. */
const words = (name: string) => {
	const colon = name.indexOf(':');
	return colon > 0
		? name.slice(colon + 1).split('-')
		: name
				.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
				.toLowerCase()
				.split(' ')
				.slice(1);
};

/**
 * Icon names whose words contain every word of `query`, from the given sets
 * (built-in sets and installed packs by default). Exact word matches rank
 * first.
 */
export const searchIcons = async (
	query: string,
	{ sets, limit = 40 }: { sets?: string[]; limit?: number } = {},
): Promise<string[]> => {
	const terms = query
		.toLowerCase()
		.split(/[\s,_-]+/)
		.filter(Boolean);
	const ids = sets?.length ? sets : listIconSets().map((set) => set.id);
	const names = (
		await Promise.all(ids.map((id) => loadIconSet(id).catch(() => [])))
	)
		.flat()
		.map((entry) => entry.name);

	if (terms.length === 0) return names.slice(0, limit);

	const scored = names
		.map((name) => {
			const parts = words(name);
			const lower = name.toLowerCase();
			if (!terms.every((term) => lower.includes(term))) return null;
			const exact = terms.filter((term) => parts.includes(term)).length;
			return { name, score: exact * 10 - parts.length };
		})
		.filter((item): item is { name: string; score: number } => item !== null)
		.sort((a, b) => b.score - a.score);

	return scored.slice(0, limit).map((item) => item.name);
};
