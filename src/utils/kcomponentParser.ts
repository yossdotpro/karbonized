import * as yaml from 'js-yaml';
import { KComponent, KComponentManifest } from '@/models/KComponent';
import { sanitizeIconSvg } from '@/lib/icons/sanitize-svg';

/** Guard rails: the library lives in localStorage, so sources cannot be unbounded. */
export const KCOMPONENT_LIMITS = {
	section: 512 * 1024,
	total: 1024 * 1024,
	name: 80,
	author: 80,
	category: 40,
	description: 500,
	tags: 12,
	tagLength: 32,
	minSize: 16,
	maxSize: 4096,
	/** Icon packs */
	icons: 2000,
	iconName: 64,
	iconBytes: 16 * 1024,
	prefix: 32,
	license: 80,
} as const;

/** Icon names and pack prefixes: lowercase words joined by dashes. */
export const ICON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PACK_PREFIX_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export interface KComponentParseResult {
	component: KComponent | null;
	/** Fatal problems: the file cannot be imported. */
	errors: string[];
	/** Non fatal problems: the field was dropped or normalized. */
	warnings: string[];
}

export class KComponentParseError extends Error {
	readonly errors: string[];

	constructor(errors: string[]) {
		super(
			`Failed to parse .kcomponent file: ${errors.join(' ') || 'Unknown error'}`,
		);
		this.name = 'KComponentParseError';
		this.errors = errors;
	}
}

const KNOWN_ROOT_KEYS = ['manifest', 'html', 'css', 'js', 'icons'];
const KNOWN_MANIFEST_KEYS = [
	'name',
	'author',
	'description',
	'version',
	'thumbnail',
	'category',
	'tags',
	'width',
	'height',
	'type',
	'prefix',
	'license',
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const byteLength = (value: string): number =>
	typeof TextEncoder !== 'undefined'
		? new TextEncoder().encode(value).length
		: value.length;

/** Reads an optional string field, trimmed and capped. Reports anything odd. */
const readString = (
	value: unknown,
	field: string,
	maxLength: number,
	warnings: string[],
): string | undefined => {
	if (value === undefined || value === null) return undefined;

	if (typeof value !== 'string') {
		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value).slice(0, maxLength);
		}
		warnings.push(`"${field}" must be text, it was ignored.`);
		return undefined;
	}

	const trimmed = value.trim();
	if (!trimmed) return undefined;

	if (trimmed.length > maxLength) {
		warnings.push(`"${field}" is too long, it was cut to ${maxLength} chars.`);
		return trimmed.slice(0, maxLength);
	}

	return trimmed;
};

const readTags = (value: unknown, warnings: string[]): string[] | undefined => {
	if (value === undefined || value === null) return undefined;

	// Accept both `tags: [a, b]` and `tags: "a, b"`.
	const raw = Array.isArray(value)
		? value
		: typeof value === 'string'
			? value.split(',')
			: null;

	if (!raw) {
		warnings.push('"manifest.tags" must be a list, it was ignored.');
		return undefined;
	}

	const seen = new Set<string>();
	const tags: string[] = [];

	for (const entry of raw) {
		if (typeof entry !== 'string' && typeof entry !== 'number') continue;

		const tag = String(entry).trim().slice(0, KCOMPONENT_LIMITS.tagLength);
		const key = tag.toLowerCase();
		if (!tag || seen.has(key)) continue;

		seen.add(key);
		tags.push(tag);
	}

	if (tags.length > KCOMPONENT_LIMITS.tags) {
		warnings.push(
			`Only the first ${KCOMPONENT_LIMITS.tags} tags were kept (${tags.length} found).`,
		);
		return tags.slice(0, KCOMPONENT_LIMITS.tags);
	}

	return tags.length ? tags : undefined;
};

const readSize = (
	value: unknown,
	field: string,
	warnings: string[],
): number | undefined => {
	if (value === undefined || value === null) return undefined;

	const size =
		typeof value === 'number'
			? value
			: typeof value === 'string'
				? parseFloat(value)
				: NaN;

	if (!Number.isFinite(size)) {
		warnings.push(`"${field}" must be a number, it was ignored.`);
		return undefined;
	}

	const rounded = Math.round(size);
	if (
		rounded < KCOMPONENT_LIMITS.minSize ||
		rounded > KCOMPONENT_LIMITS.maxSize
	) {
		warnings.push(
			`"${field}" must be between ${KCOMPONENT_LIMITS.minSize} and ${KCOMPONENT_LIMITS.maxSize}px, it was ignored.`,
		);
		return undefined;
	}

	return rounded;
};

/** Only inline images and https URLs are kept: anything else could be a script URL. */
const readThumbnail = (
	value: unknown,
	warnings: string[],
): string | undefined => {
	const thumbnail = readString(
		value,
		'manifest.thumbnail',
		2_000_000,
		warnings,
	);
	if (!thumbnail) return undefined;

	if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(thumbnail))
		return thumbnail;
	if (/^https:\/\//i.test(thumbnail)) return thumbnail;

	warnings.push(
		'"manifest.thumbnail" must be an https URL or an inline base64 image, it was ignored.',
	);
	return undefined;
};

const readSource = (
	value: unknown,
	field: string,
	errors: string[],
): string => {
	if (value === undefined || value === null) return '';

	if (typeof value !== 'string') {
		errors.push(`"${field}" must be text.`);
		return '';
	}

	if (byteLength(value) > KCOMPONENT_LIMITS.section) {
		errors.push(
			`"${field}" is larger than ${Math.round(KCOMPONENT_LIMITS.section / 1024)} KB.`,
		);
		return '';
	}

	return /^\s*$/.test(value) ? '' : value;
};

/**
 * Reads the `icons` section of an icon pack: a map of names to SVG markup.
 * Invalid icons are skipped with a warning; a pack needs at least one.
 */
const readIcons = (
	value: unknown,
	errors: string[],
	warnings: string[],
): Record<string, string> => {
	if (!isPlainObject(value)) {
		errors.push(
			'An icon pack needs an "icons" section: names mapped to <svg> markup.',
		);
		return {};
	}

	const entries = Object.entries(value);
	if (entries.length > KCOMPONENT_LIMITS.icons) {
		errors.push(
			`An icon pack can hold up to ${KCOMPONENT_LIMITS.icons} icons.`,
		);
		return {};
	}

	const icons: Record<string, string> = {};
	for (const [rawName, markup] of entries) {
		const name = rawName.trim().toLowerCase();
		if (
			!ICON_NAME_PATTERN.test(name) ||
			name.length > KCOMPONENT_LIMITS.iconName
		) {
			warnings.push(
				`Icon "${rawName}" was skipped: names use lowercase letters, digits and dashes (e.g. arrow-right).`,
			);
			continue;
		}
		if (
			typeof markup !== 'string' ||
			byteLength(markup) > KCOMPONENT_LIMITS.iconBytes
		) {
			warnings.push(
				`Icon "${name}" was skipped: it must be <svg> markup under ${KCOMPONENT_LIMITS.iconBytes / 1024} KB.`,
			);
			continue;
		}
		const result = sanitizeIconSvg(markup);
		if (!result.ok) {
			warnings.push(`Icon "${name}" was skipped: it ${result.error}.`);
			continue;
		}
		icons[name] = result.svg;
	}

	if (Object.keys(icons).length === 0 && entries.length > 0) {
		errors.push('None of the icons could be read.');
	} else if (entries.length === 0) {
		errors.push('The "icons" section is empty.');
	}
	return icons;
};

/**
 * Parses a `.kcomponent` document without throwing.
 * `manifest.name` and `html` are the only required fields; `css` and `js`
 * default to empty so markup-only components import cleanly.
 */
export function parseKComponentDocument(
	yamlContent: string,
): KComponentParseResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!yamlContent || !yamlContent.trim()) {
		return { component: null, errors: ['The file is empty.'], warnings };
	}

	if (byteLength(yamlContent) > KCOMPONENT_LIMITS.total) {
		return {
			component: null,
			errors: [
				`The file is larger than ${Math.round(KCOMPONENT_LIMITS.total / 1024)} KB.`,
			],
			warnings,
		};
	}

	let parsed: unknown;
	try {
		parsed = yaml.load(yamlContent, { json: true });
	} catch (error) {
		const reason =
			error instanceof yaml.YAMLException ? error.reason : 'invalid syntax';
		const line =
			error instanceof yaml.YAMLException && error.mark
				? ` (line ${error.mark.line + 1})`
				: '';
		return {
			component: null,
			errors: [`Invalid YAML: ${reason}${line}.`],
			warnings,
		};
	}

	if (!isPlainObject(parsed)) {
		return {
			component: null,
			errors: ['The file must contain a YAML object with a "manifest" field.'],
			warnings,
		};
	}

	for (const key of Object.keys(parsed)) {
		if (!KNOWN_ROOT_KEYS.includes(key))
			warnings.push(`Unknown field "${key}" was ignored.`);
	}

	const rawManifest = parsed.manifest;
	if (rawManifest === undefined) {
		errors.push('Missing "manifest" field.');
	} else if (!isPlainObject(rawManifest)) {
		errors.push('"manifest" must be an object.');
	}

	const manifestSource = isPlainObject(rawManifest) ? rawManifest : {};

	for (const key of Object.keys(manifestSource)) {
		if (!KNOWN_MANIFEST_KEYS.includes(key))
			warnings.push(`Unknown field "manifest.${key}" was ignored.`);
	}

	const name = readString(
		manifestSource.name,
		'manifest.name',
		KCOMPONENT_LIMITS.name,
		warnings,
	);
	if (isPlainObject(rawManifest) && !name)
		errors.push('Missing "manifest.name" field.');

	const version = readString(
		manifestSource.version,
		'manifest.version',
		24,
		warnings,
	);
	if (version && !/^v?\d+(\.\d+){0,2}([-+][0-9a-z.-]+)?$/i.test(version))
		warnings.push(`"${version}" is not a standard version number.`);

	const rawType = manifestSource.type;
	const isPack = rawType === 'icon-pack';
	if (rawType !== undefined && rawType !== 'component' && !isPack) {
		warnings.push(
			`Unknown "manifest.type" "${String(rawType)}": read as a component.`,
		);
	}

	let html = '';
	let css = '';
	let js = '';
	let icons: Record<string, string> | undefined;
	let prefix: string | undefined;

	if (isPack) {
		icons = readIcons(parsed.icons, errors, warnings);
		const rawPrefix = readString(
			manifestSource.prefix,
			'manifest.prefix',
			KCOMPONENT_LIMITS.prefix,
			warnings,
		)?.toLowerCase();
		prefix = rawPrefix || slugifyComponentName(name ?? '');
		if (!PACK_PREFIX_PATTERN.test(prefix)) {
			errors.push(
				`"manifest.prefix" must start with a letter and use lowercase letters, digits and dashes (got "${prefix}").`,
			);
		}
		if (
			parsed.html !== undefined ||
			parsed.css !== undefined ||
			parsed.js !== undefined
		) {
			warnings.push('Icon packs ignore "html", "css" and "js".');
		}
	} else {
		html = readSource(parsed.html, 'html', errors);
		if (parsed.html === undefined) errors.push('Missing "html" field.');
		else if (!html && typeof parsed.html === 'string')
			errors.push('"html" cannot be empty.');

		css = readSource(parsed.css, 'css', errors);
		js = readSource(parsed.js, 'js', errors);

		if (parsed.css === undefined)
			warnings.push('No "css" field: the component will have no styles.');
		if (parsed.js === undefined)
			warnings.push('No "js" field: the component will have no actions.');
		if (parsed.icons !== undefined)
			warnings.push(
				'"icons" is only read in icon packs (manifest.type: icon-pack).',
			);
	}

	if (errors.length || !name) return { component: null, errors, warnings };

	const manifest: KComponentManifest = {
		name,
		author: readString(
			manifestSource.author,
			'manifest.author',
			KCOMPONENT_LIMITS.author,
			warnings,
		),
		description: readString(
			manifestSource.description,
			'manifest.description',
			KCOMPONENT_LIMITS.description,
			warnings,
		),
		version,
		thumbnail: readThumbnail(manifestSource.thumbnail, warnings),
		category: readString(
			manifestSource.category,
			'manifest.category',
			KCOMPONENT_LIMITS.category,
			warnings,
		),
		tags: readTags(manifestSource.tags, warnings),
		width: readSize(manifestSource.width, 'manifest.width', warnings),
		height: readSize(manifestSource.height, 'manifest.height', warnings),
	};

	if (isPack) {
		manifest.type = 'icon-pack';
		manifest.prefix = prefix;
		manifest.license = readString(
			manifestSource.license,
			'manifest.license',
			KCOMPONENT_LIMITS.license,
			warnings,
		);
		return { component: { manifest, html, css, js, icons }, errors, warnings };
	}

	return { component: { manifest, html, css, js }, errors, warnings };
}

/** Throwing variant kept for callers that only care about the happy path. */
export function parseKComponent(yamlContent: string): KComponent {
	const { component, errors } = parseKComponentDocument(yamlContent);
	if (!component) throw new KComponentParseError(errors);
	return component;
}

export function validateKComponentFile(content: string): {
	valid: boolean;
	error?: string;
	warnings: string[];
} {
	const { component, errors, warnings } = parseKComponentDocument(content);
	return component
		? { valid: true, warnings }
		: { valid: false, error: errors.join(' ') || 'Unknown error', warnings };
}

/** Drops empty fields so exported files stay readable. */
export function stringifyKComponent(component: KComponent): string {
	const { manifest } = component;

	const cleanManifest: Record<string, unknown> = { name: manifest.name };
	const optional: Array<[string, unknown]> = [
		['type', manifest.type === 'icon-pack' ? 'icon-pack' : undefined],
		['prefix', manifest.prefix],
		['license', manifest.license],
		['author', manifest.author],
		['description', manifest.description],
		['version', manifest.version],
		['category', manifest.category],
		['tags', manifest.tags?.length ? manifest.tags : undefined],
		['width', manifest.width],
		['height', manifest.height],
		['thumbnail', manifest.thumbnail],
	];

	for (const [key, value] of optional) {
		if (value !== undefined && value !== null && value !== '')
			cleanManifest[key] = value;
	}

	const document: Record<string, unknown> = { manifest: cleanManifest };
	if (manifest.type === 'icon-pack') {
		document.icons = component.icons ?? {};
	} else {
		document.html = component.html;
		if (component.css.trim()) document.css = component.css;
		if (component.js.trim()) document.js = component.js;
	}

	return yaml.dump(document, {
		lineWidth: -1,
		noRefs: true,
		noCompatMode: true,
	});
}

/** Filename-safe slug used for downloads. */
export function slugifyComponentName(name: string): string {
	return (
		name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'component'
	);
}

export function generateKComponentExample(): string {
	return `manifest:
  name: "My Custom Component"
  author: "Your Name"
  description: "A sample custom component with CSS variables"
  version: "1.0.0"
  category: "UI Components"
  width: 320
  height: 180
  tags:
    - "button"
    - "interactive"

html: |
  <div class="custom-button">
    <button class="btn">Click Me</button>
  </div>

css: |
  :root {
    /* @type:color */
    --btn-color: #3b82f6;
    /* @type:color */
    --btn-text: #ffffff;
    /* @type:number min:0 max:50 step:1 unit:px */
    --btn-radius: 8px;
    /* @type:number min:8 max:32 step:1 unit:px */
    --btn-padding: 12px;
    /* @type:number min:12 max:24 step:1 unit:px */
    --btn-font-size: 16px;
    /* @type:shadow */
    --btn-shadow: 0px 2px 4px rgba(0,0,0,0.2);
    /* @type:boolean */
    --show-shadow: true;
  }

  .custom-button {
    padding: 20px;
  }

  .btn {
    background: var(--btn-color);
    color: var(--btn-text);
    border: none;
    padding: var(--btn-padding) 24px;
    border-radius: var(--btn-radius);
    cursor: pointer;
    font-size: var(--btn-font-size);
    transition: opacity 0.2s;
  }

  .btn:hover {
    opacity: 0.9;
  }

  .btn.no-shadow {
    box-shadow: none;
  }

js: |
  // @var message:string = "Hello from custom component!"
  // @action:Show Alert
  alert(message);

  // @action:Change Color
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  document.documentElement.style.setProperty('--btn-color', randomColor);

  // @action:Toggle Shadow
  const currentShadow = getComputedStyle(document.documentElement)
    .getPropertyValue('--show-shadow')
    .trim();
  const btn = document.querySelector('.btn');
  if (currentShadow === 'true') {
    btn.classList.add('no-shadow');
    document.documentElement.style.setProperty('--show-shadow', 'false');
  } else {
    btn.classList.remove('no-shadow');
    document.documentElement.style.setProperty('--show-shadow', 'true');
  }
`;
}
