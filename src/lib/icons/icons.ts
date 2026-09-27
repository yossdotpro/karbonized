import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Icon sets available in the app: the Icon block, the `icon` variables of
 * HTML blocks / `.kcomponent` files and Agent all read this registry.
 *
 * An icon is identified by its name alone (`FaRocket`): every set has its
 * own prefix, so names never collide and a saved project does not need to
 * store the set. Each set is a separate chunk that loads the first time it
 * is needed.
 *
 * To add a set, see `docs/icon-libraries.md`.
 */

export type IconComponent = ComponentType<{
	size?: string | number;
	className?: string;
	style?: React.CSSProperties;
}>;

export interface IconSet {
	/** Stable id, used by the picker tabs. */
	id: string;
	name: string;
	/** Prefix every icon name of the set starts with, e.g. `Lu`. */
	prefix: string;
	license: string;
	url: string;
	/** A module whose exports are the icons, keyed by name. */
	load: () => Promise<Record<string, unknown>>;
}

export interface IconEntry {
	name: string;
	icon: IconComponent;
}

export const ICON_SETS: readonly IconSet[] = [
	{
		id: 'font-awesome',
		name: 'Font Awesome',
		prefix: 'Fa',
		license: 'CC BY 4.0',
		url: 'https://fontawesome.com',
		load: () => import('react-icons/fa'),
	},
];

/** The set an icon name belongs to, by prefix. */
export const iconSetOf = (name: string): IconSet | undefined =>
	ICON_SETS.find(
		(set) =>
			name.startsWith(set.prefix) &&
			// `Fa` must not claim a name such as `Far…` from another set.
			/[A-Z0-9]/.test(name.charAt(set.prefix.length)),
	);

const loaded = new Map<string, Promise<IconEntry[]>>();

/** Every icon of a set, in the order the set exports them. */
export const loadIconSet = (id: string): Promise<IconEntry[]> => {
	const set = ICON_SETS.find((item) => item.id === id);
	if (!set) return Promise.resolve([]);

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

/** The component of an icon, or null when no set has it. */
export const resolveIcon = async (
	name: string,
): Promise<IconComponent | null> => {
	const key = normalizeIconName(name);
	const set = iconSetOf(key);
	if (!set) return null;
	const entries = await loadIconSet(set.id);
	return entries.find((entry) => entry.name === key)?.icon ?? null;
};

const svgCache = new Map<string, string>();

/** SVG markup of an icon (painted with `currentColor`), or null. */
export const iconSvg = async (name: string): Promise<string | null> => {
	const key = normalizeIconName(name);
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

/** Split `FaArrowRight` into `fa arrow right` for matching. */
const words = (name: string) =>
	name
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.split(' ');

/**
 * Icon names whose words contain every word of `query`, from the given sets
 * (all by default). Exact word matches rank first.
 */
export const searchIcons = async (
	query: string,
	{ sets, limit = 40 }: { sets?: string[]; limit?: number } = {},
): Promise<string[]> => {
	const terms = query
		.toLowerCase()
		.split(/[\s,_-]+/)
		.filter(Boolean);
	const ids = sets?.length ? sets : ICON_SETS.map((set) => set.id);
	const names = (
		await Promise.all(ids.map((id) => loadIconSet(id).catch(() => [])))
	)
		.flat()
		.map((entry) => entry.name);

	if (terms.length === 0) return names.slice(0, limit);

	const scored = names
		.map((name) => {
			const parts = words(name).slice(1);
			const lower = name.toLowerCase();
			if (!terms.every((term) => lower.includes(term))) return null;
			const exact = terms.filter((term) => parts.includes(term)).length;
			return { name, score: exact * 10 - parts.length };
		})
		.filter((item): item is { name: string; score: number } => item !== null)
		.sort((a, b) => b.score - a.score);

	return scored.slice(0, limit).map((item) => item.name);
};
