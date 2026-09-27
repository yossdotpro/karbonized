/**
 * Clean the SVG of an icon pack before it is stored or shown. Icons come from
 * third-party files and end up in the app's own DOM, so only drawing is kept:
 * no scripts, no event handlers, no foreign content and no external links.
 */

const ALLOWED_ELEMENTS = new Set([
	'svg',
	'g',
	'path',
	'circle',
	'ellipse',
	'line',
	'polyline',
	'polygon',
	'rect',
	'defs',
	'lineargradient',
	'radialgradient',
	'stop',
	'clippath',
	'mask',
	'use',
	'symbol',
	'title',
	'desc',
]);

/** Presentation and geometry attributes an icon needs. */
const ALLOWED_ATTRIBUTES = new Set([
	'viewbox',
	'xmlns',
	'xmlns:xlink',
	'id',
	'class',
	'd',
	'x',
	'y',
	'x1',
	'x2',
	'y1',
	'y2',
	'cx',
	'cy',
	'r',
	'rx',
	'ry',
	'fx',
	'fy',
	'width',
	'height',
	'points',
	'transform',
	'fill',
	'fill-rule',
	'fill-opacity',
	'clip-rule',
	'clip-path',
	'mask',
	'stroke',
	'stroke-width',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-miterlimit',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-opacity',
	'opacity',
	'offset',
	'stop-color',
	'stop-opacity',
	'gradientunits',
	'gradienttransform',
	'spreadmethod',
	'maskunits',
	'maskcontentunits',
	'clippathunits',
	'preserveaspectratio',
	'href',
	'xlink:href',
	'vector-effect',
	'shape-rendering',
]);

/** Only references inside the icon (`#id`, `url(#id)`) are allowed. */
const isLocalReference = (value: string) => /^#[\w-]+$/.test(value.trim());
const hasExternalUrl = (value: string) =>
	/url\(\s*(?!['"]?#)/i.test(value) || /javascript:/i.test(value);

export type SanitizeResult =
	{ ok: true; svg: string } | { ok: false; error: string };

export const sanitizeIconSvg = (markup: string): SanitizeResult => {
	if (typeof DOMParser === 'undefined') {
		return { ok: false, error: 'SVG cannot be checked here.' };
	}

	const document = new DOMParser().parseFromString(
		markup.trim(),
		'image/svg+xml',
	);
	const root = document.documentElement;

	if (
		root.nodeName.toLowerCase() !== 'svg' ||
		document.getElementsByTagName('parsererror').length > 0
	) {
		return { ok: false, error: 'is not a valid <svg> element' };
	}

	const clean = (element: Element) => {
		for (const child of Array.from(element.children)) {
			if (!ALLOWED_ELEMENTS.has(child.nodeName.toLowerCase())) {
				child.remove();
				continue;
			}
			clean(child);
		}

		for (const attribute of Array.from(element.attributes)) {
			const name = attribute.name.toLowerCase();
			const value = attribute.value;
			const keep =
				ALLOWED_ATTRIBUTES.has(name) &&
				!(
					(name === 'href' || name === 'xlink:href') &&
					!isLocalReference(value)
				) &&
				!hasExternalUrl(value);
			if (!keep) element.removeAttribute(attribute.name);
		}
	};
	clean(root);

	// Size comes from where the icon is used; the view box keeps its shape.
	if (!root.getAttribute('viewBox')) {
		const width = parseFloat(root.getAttribute('width') ?? '');
		const height = parseFloat(root.getAttribute('height') ?? '');
		if (!(width > 0 && height > 0)) {
			return { ok: false, error: 'needs a viewBox (e.g. viewBox="0 0 24 24")' };
		}
		root.setAttribute('viewBox', `0 0 ${width} ${height}`);
	}
	root.removeAttribute('width');
	root.removeAttribute('height');
	root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	// Unfilled shapes would be black; icons follow the text color instead.
	if (!root.hasAttribute('fill')) root.setAttribute('fill', 'currentColor');

	if (root.children.length === 0) {
		return { ok: false, error: 'draws nothing' };
	}

	return { ok: true, svg: new XMLSerializer().serializeToString(root) };
};
