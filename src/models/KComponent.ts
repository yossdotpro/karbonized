/**
 * `.kcomponent` data model.
 *
 * A kcomponent is either a portable HTML block (a manifest plus the
 * html/css/js sources that get materialized into an HTML block on the canvas)
 * or an icon pack (a manifest plus named SVG icons), see `docs/icon-packs.md`.
 */

export type KComponentType = 'component' | 'icon-pack';

export interface KComponentManifest {
	name: string;
	author?: string;
	description?: string;
	version?: string;
	thumbnail?: string;
	category?: string;
	tags?: string[];
	/** Preferred block width in px when the component is added to the canvas. */
	width?: number;
	/** Preferred block height in px when the component is added to the canvas. */
	height?: number;
	/** `icon-pack` for icon packs; components omit it. */
	type?: KComponentType;
	/** Icon packs: short id icons are named with, as in `acme:cloud`. */
	prefix?: string;
	/** Icon packs: license the icons are distributed under. */
	license?: string;
}

export interface KComponent {
	manifest: KComponentManifest;
	html: string;
	css: string;
	js: string;
	/** Icon packs: icon name → sanitized SVG markup. */
	icons?: Record<string, string>;
}

export interface ImportedComponent {
	id: string;
	component: KComponent;
	preview?: string;
	/** ISO date string: survives the JSON round trip of the persisted store. */
	importedAt: string;
	updatedAt?: string;
	lastUsedAt?: string;
	usageCount: number;
	favorite: boolean;
}

export const UNCATEGORIZED = 'Uncategorized';

/** Category used for grouping and filtering, never empty. */
export const getComponentCategory = (component: KComponent): string =>
	component.manifest.category?.trim() || UNCATEGORIZED;

/** Stable identity of a component: two imports with the same key are the same component. */
export const getComponentKey = (manifest: KComponentManifest): string =>
	`${manifest.name.trim().toLowerCase()}::${(manifest.author ?? '').trim().toLowerCase()}`;

/** Whether a library entry is an icon pack rather than a component. */
export const isIconPack = (component: KComponent): boolean =>
	component.manifest.type === 'icon-pack';
