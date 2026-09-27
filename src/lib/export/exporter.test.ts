import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveDataUrl } from './exporter';

const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="4"/></svg>';

describe('saveDataUrl on the desktop', () => {
	afterEach(() => {
		delete window.karbonized;
	});

	const withBridge = () => {
		const saveImage = vi.fn(async () => '/pictures/Karbonized/post.png');
		window.karbonized = { files: { saveText: vi.fn(), saveImage } };
		return saveImage;
	};

	it('writes to the export folder without a dialog when asked not to', async () => {
		const saveImage = withBridge();
		const result = await saveDataUrl(
			'data:image/png;base64,AAAA',
			'My: post',
			'png',
			{ ask: false },
		);
		expect(saveImage).toHaveBeenCalledWith({
			name: 'My- post',
			extension: 'png',
			data: 'AAAA',
			ask: false,
		});
		expect(result).toEqual({
			kind: 'file',
			path: '/pictures/Karbonized/post.png',
		});
	});

	it('sends the SVG markup, not the data URL', async () => {
		const saveImage = withBridge();
		await saveDataUrl(
			`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
			'post',
			'svg',
		);
		expect(saveImage).toHaveBeenCalledWith(
			expect.objectContaining({ extension: 'svg', data: svg, ask: true }),
		);
	});

	it('returns null when the dialog is cancelled', async () => {
		const saveImage = withBridge();
		saveImage.mockResolvedValueOnce(null as unknown as string);
		expect(
			await saveDataUrl('data:image/jpeg;base64,AAAA', 'post', 'jpeg'),
		).toBeNull();
	});
});
