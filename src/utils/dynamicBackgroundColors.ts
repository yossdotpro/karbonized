import { Color, getColor, getPalette } from 'colorthief';

type RGB = [number, number, number];

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const rgbToHex = ([r, g, b]: RGB) =>
	`#${[r, g, b]
		.map((value) =>
			clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'),
		)
		.join('')}`;

const createShade = ([r, g, b]: RGB, factor: number): RGB => [
	clamp(r * factor, 0, 255),
	clamp(g * factor, 0, 255),
	clamp(b * factor, 0, 255),
];

const uniqueColors = (colors: string[]) => [
	...new Set(colors.map((color) => color.toLowerCase())),
];

const waitForImage = async (image: HTMLImageElement): Promise<void> => {
	if (image.complete && image.naturalWidth > 0) {
		return;
	}

	await new Promise<void>((resolve, reject) => {
		const handleLoad = () => {
			cleanup();
			resolve();
		};
		const handleError = () => {
			cleanup();
			reject(new Error('Image could not be loaded for palette extraction'));
		};
		const cleanup = () => {
			image.removeEventListener('load', handleLoad);
			image.removeEventListener('error', handleError);
		};

		image.addEventListener('load', handleLoad, { once: true });
		image.addEventListener('error', handleError, { once: true });
	});
};

export const buildDynamicBackgroundColors = async (
	image: HTMLImageElement,
): Promise<string[]> => {
	await waitForImage(image);

	const dominant = (await getColor(image)) as Color;
	const palette = (await getPalette(image, { colorCount: 5 })) as Color[];

	console.log(dominant);
	const sourceColors = [dominant, ...palette].filter(Boolean);

	const toRGB = (color: Color): RGB => {
		const { r, g, b } = color.rgb();
		return [r, g, b];
	};

	const colors = uniqueColors([
		rgbToHex(createShade(toRGB(dominant), 0.48)),
		...sourceColors.map((color) => rgbToHex(toRGB(color))),
		rgbToHex(createShade(toRGB(dominant), 1.18)),
	]);

	return colors.slice(0, 5);
};
