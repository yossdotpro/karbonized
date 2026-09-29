/**
 * Logos Agent and MCP clients add to the brand kit. They arrive as SVG
 * markup or as data URLs and are stored as data URLs, like the ones the
 * user uploads.
 */

export type LogoImage = { src: string; width: number; height: number };

const REMOVED_ELEMENTS = [
	'script',
	'foreignObject',
	'iframe',
	'object',
	'embed',
];

/** A size from a view box, or from width and height attributes. */
const svgSize = (root: Element): { width: number; height: number } | null => {
	const box = (root.getAttribute('viewBox') ?? '')
		.trim()
		.split(/[\s,]+/)
		.map(Number);
	if (box.length === 4 && box[2] > 0 && box[3] > 0) {
		return { width: box[2], height: box[3] };
	}
	const width = parseFloat(root.getAttribute('width') ?? '');
	const height = parseFloat(root.getAttribute('height') ?? '');
	return width > 0 && height > 0 ? { width, height } : null;
};

const toBase64 = (text: string): string => {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
	return btoa(binary);
};

/**
 * Check SVG markup and turn it into a data URL. Scripts, embedded documents,
 * event handlers and links outside the file are taken out.
 */
export const svgLogo = (
	markup: string,
): { ok: true; logo: LogoImage } | { ok: false; error: string } => {
	const document = new DOMParser().parseFromString(
		markup.trim(),
		'image/svg+xml',
	);
	const root = document.documentElement;
	if (
		root.nodeName.toLowerCase() !== 'svg' ||
		document.getElementsByTagName('parsererror').length > 0
	) {
		return { ok: false, error: 'The svg is not a valid <svg> element.' };
	}

	REMOVED_ELEMENTS.forEach((name) =>
		Array.from(root.getElementsByTagName(name)).forEach((element) =>
			element.remove(),
		),
	);
	[root, ...Array.from(root.getElementsByTagName('*'))].forEach((element) =>
		Array.from(element.attributes).forEach((attribute) => {
			const name = attribute.name.toLowerCase();
			const external =
				(name === 'href' || name === 'xlink:href') &&
				!/^(#|data:image\/)/.test(attribute.value.trim());
			if (name.startsWith('on') || external) {
				element.removeAttribute(attribute.name);
			}
		}),
	);

	const size = svgSize(root);
	if (!size) {
		return {
			ok: false,
			error: 'The svg needs a viewBox (e.g. viewBox="0 0 240 64").',
		};
	}
	if (!root.getAttribute('xmlns')) {
		root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	}

	const clean = new XMLSerializer().serializeToString(root);
	return {
		ok: true,
		logo: { src: `data:image/svg+xml;base64,${toBase64(clean)}`, ...size },
	};
};

/** The natural size of an image, or null when it cannot be read in time. */
export const imageSize = (
	src: string,
	timeoutMs = 3000,
): Promise<{ width: number; height: number } | null> =>
	new Promise((resolve) => {
		if (typeof Image === 'undefined') {
			resolve(null);
			return;
		}
		const image = new Image();
		const timer = setTimeout(() => resolve(null), timeoutMs);
		image.onload = () => {
			clearTimeout(timer);
			resolve(
				image.naturalWidth > 0 && image.naturalHeight > 0
					? { width: image.naturalWidth, height: image.naturalHeight }
					: null,
			);
		};
		image.onerror = () => {
			clearTimeout(timer);
			resolve(null);
		};
		image.src = src;
	});
