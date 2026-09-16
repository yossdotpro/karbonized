/**
 * Block catalog: the block types that can be created programmatically (by
 * Beedly or MCP clients) and the properties each one stores.
 *
 * Blocks declare their properties inside their components with
 * `useControlState(default, \`${id}-<key>\`)`; this file mirrors those keys and
 * defaults so tools can validate input and describe blocks to a model. Keep it
 * in sync when a block gains or renames a property.
 */

export type PropertyKind =
	'string' | 'text' | 'number' | 'boolean' | 'color' | 'enum' | 'image';

export interface BlockPropertySpec {
	/** Suffix of the stored property id: `${blockId}-${key}`. */
	key: string;
	kind: PropertyKind;
	default: string | number | boolean;
	description: string;
	options?: readonly string[];
	min?: number;
	max?: number;
}

export interface BlockSize {
	width: number;
	height: number;
}

export interface BlockTypeSpec {
	type: string;
	label: string;
	description: string;
	defaultSize: BlockSize;
	minSize: BlockSize;
	maxSize: BlockSize;
	properties: readonly BlockPropertySpec[];
}

/** Properties every block has (from `ControlTemplate`). */
export const COMMON_PROPERTIES: readonly BlockPropertySpec[] = [
	{
		key: 'opacity',
		kind: 'number',
		default: 100,
		min: 0,
		max: 100,
		description: 'Opacity in percent.',
	},
	{
		key: 'borderRadius',
		kind: 'number',
		default: 2,
		min: 0,
		max: 200,
		description: 'Corner radius in pixels.',
	},
	{
		key: 'rotatex',
		kind: 'number',
		default: 0,
		min: -180,
		max: 180,
		description: '3D rotation around the X axis, in degrees.',
	},
	{
		key: 'rotatey',
		kind: 'number',
		default: 0,
		min: -180,
		max: 180,
		description: '3D rotation around the Y axis, in degrees.',
	},
	{
		key: 'flipx',
		kind: 'boolean',
		default: false,
		description: 'Mirror horizontally.',
	},
	{
		key: 'flipy',
		kind: 'boolean',
		default: false,
		description: 'Mirror vertically.',
	},
	{
		key: 'blur',
		kind: 'number',
		default: 0,
		min: 0,
		max: 50,
		description: 'Blur filter in pixels.',
	},
	{
		key: 'brightness',
		kind: 'number',
		default: 100,
		min: 0,
		max: 200,
		description: 'Brightness filter in percent.',
	},
	{
		key: 'contrast',
		kind: 'number',
		default: 100,
		min: 0,
		max: 200,
		description: 'Contrast filter in percent.',
	},
	{
		key: 'grayscale',
		kind: 'number',
		default: 0,
		min: 0,
		max: 100,
		description: 'Grayscale filter in percent.',
	},
	{
		key: 'huerotate',
		kind: 'number',
		default: 0,
		min: 0,
		max: 360,
		description: 'Hue rotation filter in degrees.',
	},
	{
		key: 'invert',
		kind: 'number',
		default: 0,
		min: 0,
		max: 100,
		description: 'Invert filter in percent.',
	},
	{
		key: 'saturate',
		kind: 'number',
		default: 100,
		min: 0,
		max: 200,
		description: 'Saturation filter in percent.',
	},
	{
		key: 'sepia',
		kind: 'number',
		default: 0,
		min: 0,
		max: 100,
		description: 'Sepia filter in percent.',
	},
	{
		key: 'shadowX',
		kind: 'number',
		default: 0,
		min: -100,
		max: 100,
		description: 'Drop shadow horizontal offset in pixels.',
	},
	{
		key: 'shadowY',
		kind: 'number',
		default: 0,
		min: -100,
		max: 100,
		description: 'Drop shadow vertical offset in pixels.',
	},
	{
		key: 'shadowBlur',
		kind: 'number',
		default: 0,
		min: 0,
		max: 100,
		description: 'Drop shadow blur in pixels (0 hides the shadow).',
	},
	{
		key: 'shadowColor',
		kind: 'color',
		default: '#090b11',
		description: 'Drop shadow color.',
	},
];

const WINDOW_STYLES = [
	'mac',
	'windows',
	'retro',
	'paper',
	'GTK',
	'gnome',
	'pixel',
	'konsole',
] as const;

const SHAPES = [
	'rectangle',
	'ellipse',
	'triangle',
	'polygon',
	'star',
	'heart',
	'line',
	'arrow',
	// Ids kept for projects saved by older versions.
	'oval',
	'poligon',
	'hexagon',
	'arrow2',
	'arrow3',
	'arrow4',
	'arrow5',
	'arrow6',
] as const;

const size = (width: number, height: number): BlockSize => ({ width, height });

export type TextSizing = 'auto' | 'fixed-width' | 'fixed';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export type ImageFit = 'fill' | 'cover' | 'contain';

export const IMAGE_FIT_OPTIONS: ReadonlyArray<{
	value: ImageFit;
	label: string;
	hint: string;
}> = [
	{ value: 'fill', label: 'Stretch', hint: 'The image fills the block' },
	{
		value: 'cover',
		label: 'Cover',
		hint: 'The image covers the block and is cropped',
	},
	{
		value: 'contain',
		label: 'Fit',
		hint: 'The whole image fits inside the block',
	},
];

export const TEXT_ALIGN_OPTIONS: ReadonlyArray<{
	value: TextAlign;
	label: string;
}> = [
	{ value: 'left', label: 'Left' },
	{ value: 'center', label: 'Center' },
	{ value: 'right', label: 'Right' },
	{ value: 'justify', label: 'Justify' },
];

export const TEXT_SIZING_OPTIONS: ReadonlyArray<{
	value: TextSizing;
	label: string;
	hint: string;
}> = [
	{ value: 'auto', label: 'Auto', hint: 'Width and height fit the text' },
	{
		value: 'fixed-width',
		label: 'Auto height',
		hint: 'Fixed width, the text wraps and the height grows',
	},
	{ value: 'fixed', label: 'Fixed', hint: 'Fixed width and height' },
];

export const BLOCK_TYPES: readonly BlockTypeSpec[] = [
	{
		type: 'code',
		label: 'Code',
		description:
			'Syntax highlighted code snippet inside a window frame. Set `code` to plain source text.',
		defaultSize: size(460, 140),
		minSize: size(415, 140),
		maxSize: size(2050, 2050),
		properties: [
			{
				key: 'code',
				kind: 'text',
				default: '',
				description: 'Source code (plain text).',
			},
			{
				key: 'lang',
				kind: 'string',
				default: 'jsx',
				description: 'Prism language id, e.g. tsx, python, rust, bash.',
			},
			{
				key: 'theme',
				kind: 'string',
				default: 'coldarkDark',
				description:
					'Prism theme name (see list_block_types). Changing it also resets `bgcolor` to the theme background.',
			},
			{
				key: 'wintitle',
				kind: 'string',
				default: 'Code.jsx',
				description: 'Title shown in the window tab.',
			},
			{
				key: 'winstyle',
				kind: 'enum',
				default: 'mac',
				options: WINDOW_STYLES,
				description: 'Window frame style.',
			},
			{
				key: 'tabs',
				kind: 'boolean',
				default: true,
				description: 'Show the window title bar.',
			},
			{
				key: 'linenumbers',
				kind: 'boolean',
				default: false,
				description: 'Show line numbers.',
			},
			{
				key: 'wraplines',
				kind: 'boolean',
				default: false,
				description: 'Wrap long lines.',
			},
			{
				key: 'bgcolor',
				kind: 'color',
				default: '#111b28',
				description: 'Window background color (when colormode is Single).',
			},
			{
				key: 'ccolor',
				kind: 'color',
				default: '#b4b4b4',
				description: 'Color of the window controls.',
			},
			{
				key: 'colormode',
				kind: 'enum',
				default: 'Single',
				options: ['Single', 'Gradient'],
				description: 'Window background mode.',
			},
			{
				key: 'gradientc1',
				kind: 'color',
				default: '#0da2e7',
				description: 'First gradient color.',
			},
			{
				key: 'gradientc2',
				kind: 'color',
				default: '#5895c8',
				description: 'Second gradient color.',
			},
			{
				key: 'gradientdeg',
				kind: 'number',
				default: 22,
				min: 0,
				max: 360,
				description: 'Gradient angle in degrees.',
			},
			{
				key: 'border',
				kind: 'number',
				default: 8,
				min: 0,
				max: 22,
				description: 'Window corner radius in pixels.',
			},
		],
	},
	{
		type: 'text',
		label: 'Text',
		description: 'A line of text.',
		defaultSize: size(85, 45),
		minSize: size(50, 20),
		maxSize: size(4000, 4000),
		properties: [
			{ key: 'text', kind: 'text', default: 'lorem', description: 'Text.' },
			{
				key: 'sizing',
				kind: 'enum',
				default: 'fixed',
				options: ['auto', 'fixed-width', 'fixed'],
				description:
					'auto: the block fits the text; fixed-width: the width stays and the text wraps; fixed: width and height stay. New blocks use auto unless a size is given.',
			},
			{
				key: 'color',
				kind: 'color',
				default: '#f3f4f6',
				description: 'Text color.',
			},
			{
				key: 'textSize',
				kind: 'string',
				default: '24',
				description: 'Font size in pixels, as a string.',
			},
			{ key: 'isBold', kind: 'boolean', default: false, description: 'Bold.' },
			{
				key: 'isItalic',
				kind: 'boolean',
				default: false,
				description: 'Italic.',
			},
			{
				key: 'isUnderline',
				kind: 'boolean',
				default: false,
				description: 'Underline.',
			},
			{
				key: 'fontFamily',
				kind: 'string',
				default: '',
				description:
					'Font family name, e.g. Inter or Segoe UI. Empty uses the app font. Google families are loaded automatically when fontSource is google.',
			},
			{
				key: 'fontSource',
				kind: 'enum',
				default: 'default',
				options: ['default', 'system', 'google'],
				description:
					'Where the family comes from: the app font, a font installed on the machine, or Google Fonts.',
			},
			{
				key: 'fontWeight',
				kind: 'number',
				default: 400,
				min: 100,
				max: 900,
				description: 'Font weight. isBold overrides it with 700.',
			},
			{
				key: 'textAlign',
				kind: 'enum',
				default: 'left',
				options: ['left', 'center', 'right', 'justify'],
				description: 'Horizontal alignment of the lines.',
			},
			{
				key: 'lineHeight',
				kind: 'number',
				default: 0,
				min: 0,
				max: 4,
				description: 'Line height as a multiple of the font size (0: default).',
			},
			{
				key: 'letterSpacing',
				kind: 'number',
				default: 0,
				min: -20,
				max: 100,
				description: 'Letter spacing in pixels.',
			},
		],
	},
	{
		type: 'image',
		label: 'Image',
		description: 'An image from a URL or data URL.',
		defaultSize: size(100, 100),
		minSize: size(20, 20),
		maxSize: size(8000, 8000),
		properties: [
			{
				key: 'src',
				kind: 'image',
				default: '',
				description: 'Image URL (https or data URL).',
			},
			{
				key: 'fit',
				kind: 'enum',
				default: 'fill',
				options: ['fill', 'cover', 'contain'],
				description:
					'How the image fills the block: fill stretches it, cover crops it, contain fits it whole.',
			},
			{
				key: 'focalX',
				kind: 'number',
				default: 50,
				min: 0,
				max: 100,
				description:
					'Horizontal part of the image kept in view, in percent (cover and contain).',
			},
			{
				key: 'focalY',
				kind: 'number',
				default: 50,
				min: 0,
				max: 100,
				description:
					'Vertical part of the image kept in view, in percent (cover and contain).',
			},
			{
				key: 'zoom',
				kind: 'number',
				default: 100,
				min: 100,
				max: 400,
				description: 'Zoom into the image, in percent.',
			},
		],
	},
	{
		type: 'window',
		label: 'Window',
		description: 'A browser or app window mockup showing an image.',
		defaultSize: size(400, 200),
		minSize: size(400, 200),
		maxSize: size(3000, 2000),
		properties: [
			{
				key: 'title',
				kind: 'string',
				default: 'Karbonized',
				description: 'Window title.',
			},
			{
				key: 'url',
				kind: 'string',
				default: 'karbonized.onrender.com',
				description: 'Address bar text (browser windows).',
			},
			{
				key: 'windowStyle',
				kind: 'enum',
				default: 'mac',
				options: ['mac', 'window'],
				description: 'Window controls style.',
			},
			{
				key: 'windowType',
				kind: 'enum',
				default: 'browser',
				options: ['normal', 'browser'],
				description: 'Plain window or browser with an address bar.',
			},
			{
				key: 'color',
				kind: 'color',
				default: '#ffffff',
				description: 'Frame color.',
			},
			{
				key: 'controlsColor',
				kind: 'color',
				default: '#0e111b',
				description: 'Window controls color.',
			},
			{
				key: 'src',
				kind: 'image',
				default: '',
				description: 'Screenshot shown inside the window (URL or data URL).',
			},
		],
	},
	{
		type: 'phone_mockup',
		label: 'Phone',
		description: 'A phone mockup showing an image.',
		defaultSize: size(320, 620),
		minSize: size(318, 618),
		maxSize: size(1000, 2000),
		properties: [
			{
				key: 'device_model',
				kind: 'enum',
				default: 'iPhone X',
				options: ['adaptive', 'iPhone X', 'iPhone 14', 'iPhone 14 Pro'],
				description: 'Device frame. Fixed models are limited to 318×618.',
			},
			{
				key: 'src',
				kind: 'image',
				default: '',
				description: 'Screen image (URL or data URL).',
			},
			{
				key: 'borderColor',
				kind: 'color',
				default: '#b4b4b4',
				description: 'Frame color (adaptive).',
			},
			{
				key: 'statusColor',
				kind: 'color',
				default: '#FFFFFF',
				description: 'Status bar color.',
			},
			{
				key: 'statusControlsColor',
				kind: 'color',
				default: '#000000',
				description: 'Status bar icons color.',
			},
			{
				key: 'notchWidth',
				kind: 'number',
				default: 80,
				min: 0,
				max: 200,
				description: 'Notch width (adaptive).',
			},
			{
				key: 'screenRadius',
				kind: 'number',
				default: 20,
				min: 0,
				max: 60,
				description: 'Screen corner radius (adaptive).',
			},
			{
				key: 'phoneRadius',
				kind: 'number',
				default: 30,
				min: 0,
				max: 60,
				description: 'Frame corner radius (adaptive).',
			},
			{
				key: 'drop',
				kind: 'boolean',
				default: false,
				description: 'Use a drop notch instead of a wide notch.',
			},
		],
	},
	{
		type: 'shape',
		label: 'Shape',
		description:
			'A vector shape: rectangle, ellipse, triangle, polygon, star, heart, line or arrow.',
		defaultSize: size(120, 120),
		minSize: size(10, 10),
		maxSize: size(4000, 4000),
		properties: [
			{
				key: 'shape',
				kind: 'enum',
				default: 'ellipse',
				options: SHAPES,
				description: 'Shape.',
			},
			{
				key: 'color',
				kind: 'color',
				default: '#f3f4f6',
				description: 'Fill color (shapes other than line and arrow).',
			},
			{
				key: 'strokeColor',
				kind: 'color',
				default: '#f3f4f6',
				description: 'Stroke color. Lines and arrows are drawn with it.',
			},
			{
				key: 'strokeWidth',
				kind: 'number',
				default: 0,
				min: 0,
				max: 60,
				description:
					'Stroke width in pixels (0 hides it; lines and arrows use 6).',
			},
			{
				key: 'strokeStyle',
				kind: 'enum',
				default: 'solid',
				options: ['solid', 'dashed', 'dotted'],
				description: 'Stroke style.',
			},
			{
				key: 'cornerRadius',
				kind: 'number',
				default: 0,
				min: 0,
				max: 200,
				description: 'Corner radius of rectangles, in pixels.',
			},
			{
				key: 'sides',
				kind: 'number',
				default: 6,
				min: 3,
				max: 12,
				description: 'Number of sides of a polygon.',
			},
			{
				key: 'points',
				kind: 'number',
				default: 5,
				min: 3,
				max: 12,
				description: 'Number of points of a star.',
			},
			{
				key: 'innerRadius',
				kind: 'number',
				default: 45,
				min: 5,
				max: 95,
				description: 'How deep the points of a star cut in, in percent.',
			},
		],
	},
	{
		type: 'icon',
		label: 'Icon',
		description: 'A Font Awesome icon.',
		defaultSize: size(120, 120),
		minSize: size(20, 20),
		maxSize: size(800, 800),
		properties: [
			{
				key: 'icon',
				kind: 'string',
				default: 'FaFontAwesome',
				description:
					'react-icons Font Awesome component name, e.g. FaGithub, FaReact, FaHeart.',
			},
			{
				key: 'iconColor',
				kind: 'color',
				default: '#ffffff',
				description: 'Icon color.',
			},
		],
	},
	{
		type: 'qr',
		label: 'QR code',
		description: 'A QR code.',
		defaultSize: size(150, 150),
		minSize: size(40, 40),
		maxSize: size(2000, 2000),
		properties: [
			{
				key: 'text',
				kind: 'string',
				default: 'karbonized',
				description: 'Encoded text or URL.',
			},
			{
				key: 'foregroundColor',
				kind: 'color',
				default: '#090c12',
				description: 'Module color.',
			},
			{
				key: 'backgroundColor',
				kind: 'color',
				default: '#1e408400',
				description: 'Background color (alpha allowed).',
			},
		],
	},
	{
		type: 'html',
		label: 'HTML',
		description:
			'A custom component written in HTML, CSS and JavaScript, rendered in a shadow root. Edit its code with update_html_block.',
		defaultSize: size(400, 300),
		minSize: size(100, 80),
		maxSize: size(4000, 4000),
		properties: [
			{
				key: 'auto-refresh',
				kind: 'boolean',
				default: true,
				description: 'Re-render when the code changes.',
			},
			{
				key: 'allow-scripts',
				kind: 'boolean',
				default: false,
				description: 'Run the block JavaScript.',
			},
		],
	},
];

/** Code of HTML blocks lives in these properties. */
export const HTML_BLOCK_CODE_KEYS = ['html', 'css', 'js'] as const;

export const getBlockType = (type: string): BlockTypeSpec | undefined =>
	BLOCK_TYPES.find((spec) => spec.type === type);

/** Properties a block of `type` accepts: its own plus the common ones. */
export const getBlockProperties = (type: string): BlockPropertySpec[] => {
	const own = getBlockType(type)?.properties ?? [];
	const ownKeys = new Set(own.map((property) => property.key));

	return [
		...own,
		...COMMON_PROPERTIES.filter((property) => !ownKeys.has(property.key)),
	];
};

/** Id of a stored block property. */
export const propertyId = (blockId: string, key: string): string =>
	`${blockId}-${key}`;

/**
 * Block id a stored property belongs to. Block ids are `<type>-<number>` and
 * property keys may contain dashes (`auto-refresh`), so split after the second
 * segment.
 */
export const blockIdOfProperty = (id: string): string =>
	id.split('-').slice(0, 2).join('-');

export type PropertyValidation =
	{ ok: true; value: string | number | boolean } | { ok: false; error: string };

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Check and normalize a value for a property spec. */
export const validatePropertyValue = (
	spec: BlockPropertySpec,
	value: unknown,
): PropertyValidation => {
	switch (spec.kind) {
		case 'number': {
			const number = typeof value === 'string' ? Number(value) : value;
			if (typeof number !== 'number' || !Number.isFinite(number)) {
				return { ok: false, error: `${spec.key} must be a number` };
			}
			const min = spec.min ?? -Infinity;
			const max = spec.max ?? Infinity;
			return { ok: true, value: Math.min(max, Math.max(min, number)) };
		}
		case 'boolean':
			return typeof value === 'boolean'
				? { ok: true, value }
				: { ok: false, error: `${spec.key} must be true or false` };
		case 'color':
			return typeof value === 'string' && HEX_COLOR.test(value)
				? { ok: true, value }
				: {
						ok: false,
						error: `${spec.key} must be a hex color like #1e293b or #1e293b80`,
					};
		case 'enum':
			return typeof value === 'string' && spec.options?.includes(value)
				? { ok: true, value }
				: {
						ok: false,
						error: `${spec.key} must be one of: ${spec.options?.join(', ')}`,
					};
		default:
			if (typeof value === 'number' && spec.kind === 'string') {
				return { ok: true, value: String(value) };
			}
			return typeof value === 'string'
				? { ok: true, value }
				: { ok: false, error: `${spec.key} must be a string` };
	}
};
