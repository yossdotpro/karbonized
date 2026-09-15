import { toBlob, toJpeg, toPng, toSvg } from 'html-to-image';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUIStore } from '@/stores';
import { isNative } from '@/utils/isNative';
import { Base64Binary } from '@/utils/Base64Utils';

/**
 * Image export for the workspace and individual blocks.
 *
 * Every export goes through `renderImage`, which toggles the exporting state
 * (hides selection handles, optionally the background), waits for blocks to
 * settle and renders with html-to-image at the requested scale.
 */

export type ExportFormat = 'png' | 'jpeg' | 'svg';

export interface ExportSettings {
	format: ExportFormat;
	scale: number;
	/** PNG/SVG only: leave out the workspace background. */
	transparent: boolean;
	/** JPEG only, 0–1. */
	quality: number;
}

export const EXPORT_SCALES = [0.5, 1, 2, 3, 4];
/** Browsers refuse canvases larger than this on either side. */
export const MAX_CANVAS_SIDE = 16384;

interface ExportSettingsState extends ExportSettings {
	setSettings: (settings: Partial<ExportSettings>) => void;
}

export const useExportSettings = create<ExportSettingsState>()(
	persist(
		(set) => ({
			format: 'png',
			scale: 2,
			transparent: false,
			quality: 0.95,
			setSettings: (settings) => set(settings),
		}),
		{
			name: 'karbonized:export-settings',
			partialize: ({ format, scale, transparent, quality }) => ({
				format,
				scale,
				transparent,
				quality,
			}),
		},
	),
);

export const supportsTransparency = (format: ExportFormat): boolean =>
	format !== 'jpeg';

export const supportsScale = (format: ExportFormat): boolean =>
	format !== 'svg';

export const outputSize = (
	width: number,
	height: number,
	{ format, scale }: Pick<ExportSettings, 'format' | 'scale'>,
) => {
	const factor = supportsScale(format) ? scale : 1;
	return {
		width: Math.round(width * factor),
		height: Math.round(height * factor),
	};
};

export const exceedsCanvasLimit = (
	width: number,
	height: number,
	settings: Pick<ExportSettings, 'format' | 'scale'>,
): boolean => {
	const size = outputSize(width, height, settings);
	return size.width > MAX_CANVAS_SIDE || size.height > MAX_CANVAS_SIDE;
};

const EXTENSIONS: Record<ExportFormat, string> = {
	png: 'png',
	jpeg: 'jpg',
	svg: 'svg',
};

const nextFrame = () =>
	new Promise<void>((resolve) => {
		// requestAnimationFrame does not fire in background tabs; don't hang.
		const timeout = setTimeout(resolve, 120);
		requestAnimationFrame(() => {
			clearTimeout(timeout);
			setTimeout(resolve, 0);
		});
	});

/** Put the editor in export mode while `render` runs. */
const withExportMode = async <T>(
	settings: Pick<ExportSettings, 'format' | 'transparent'>,
	render: () => Promise<T>,
): Promise<T> => {
	const ui = useUIStore.getState();
	ui.setIsExporting(true);
	ui.setExportTransparent(
		settings.transparent && supportsTransparency(settings.format),
	);
	window.dispatchEvent(
		new CustomEvent('html-block-export', { detail: 'export-start' }),
	);

	try {
		// Let React hide the selection and background, and HTML blocks settle.
		await nextFrame();
		await new Promise((resolve) => setTimeout(resolve, 150));
		return await render();
	} finally {
		window.dispatchEvent(
			new CustomEvent('html-block-export', { detail: 'export-end' }),
		);
		ui.setExportTransparent(false);
		ui.setIsExporting(false);
	}
};

const renderOptions = (settings: ExportSettings) => ({
	cacheBust: true,
	pixelRatio: supportsScale(settings.format) ? settings.scale : 1,
	quality: settings.quality,
	// JPEG has no alpha channel: paint transparent areas white.
	backgroundColor: settings.format === 'jpeg' ? '#ffffff' : undefined,
});

export const renderImage = (
	element: HTMLElement,
	settings: ExportSettings,
): Promise<string> =>
	withExportMode(settings, () => {
		const options = renderOptions(settings);
		switch (settings.format) {
			case 'jpeg':
				return toJpeg(element, options);
			case 'svg':
				return toSvg(element, options);
			default:
				return toPng(element, options);
		}
	});

const safeFileName = (name: string) =>
	name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'karbonized';

const saveDataUrl = async (
	dataUrl: string,
	name: string,
	format: ExportFormat,
): Promise<void> => {
	const fileName = `${safeFileName(name)}.${EXTENSIONS[format]}`;

	if (await isNative()) {
		const [{ save }, { writeBinaryFile, writeTextFile }] = await Promise.all([
			import('@tauri-apps/api/dialog'),
			import('@tauri-apps/api/fs'),
		]);
		const filePath = await save({
			defaultPath: fileName,
			filters: [{ name: 'Image', extensions: [EXTENSIONS[format]] }],
		});
		if (filePath === null) return;

		if (format === 'svg') {
			await writeTextFile(filePath, dataUrl);
		} else {
			const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
			await writeBinaryFile(filePath, Base64Binary.decodeArrayBuffer(base64));
		}
		return;
	}

	const link = document.createElement('a');
	link.download = fileName;
	link.href = dataUrl;
	link.click();
};

export const exportElement = async (
	element: HTMLElement | null,
	name: string,
	overrides: Partial<ExportSettings> = {},
): Promise<void> => {
	if (!element) return;

	const settings = { ...useExportSettings.getState(), ...overrides };
	const dataUrl = await renderImage(element, settings);
	await saveDataUrl(dataUrl, name, settings.format);
};

export const canCopyImage = (): boolean =>
	typeof ClipboardItem !== 'undefined' &&
	typeof navigator.clipboard?.write === 'function';

/** Copy a PNG of the element (current scale and transparency) to the clipboard. */
export const copyElementImage = async (
	element: HTMLElement | null,
	overrides: Partial<ExportSettings> = {},
): Promise<void> => {
	if (!element) return;
	if (!canCopyImage()) {
		throw new Error('Copying images is not supported in this browser.');
	}

	const settings = {
		...useExportSettings.getState(),
		...overrides,
		format: 'png' as const,
	};

	// Safari requires the ClipboardItem to be created synchronously in the user
	// gesture, with a promise for the data.
	const blob = withExportMode(settings, async () => {
		const result = await toBlob(element, renderOptions(settings));
		if (!result) throw new Error('Could not render the image.');
		return result;
	});

	// If the clipboard rejects first, don't leave a render failure unhandled.
	blob.catch(() => undefined);

	try {
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
	} catch (error) {
		if ((error as DOMException)?.name === 'NotAllowedError') {
			throw new Error('Allow clipboard access for Karbonized and try again.');
		}
		throw error;
	}
};

/** Render a PNG blob, e.g. for the Web Share API. */
export const renderBlob = async (
	element: HTMLElement,
	overrides: Partial<ExportSettings> = {},
): Promise<Blob | null> => {
	const settings = {
		...useExportSettings.getState(),
		...overrides,
		format: 'png' as const,
	};
	return withExportMode(settings, () =>
		toBlob(element, renderOptions(settings)),
	);
};
