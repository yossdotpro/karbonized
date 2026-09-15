import { describe, expect, it } from 'vitest';
import {
	MAX_CANVAS_SIDE,
	exceedsCanvasLimit,
	outputSize,
	supportsScale,
	supportsTransparency,
} from './exporter';

describe('export settings helpers', () => {
	it('knows what each format supports', () => {
		expect(supportsTransparency('png')).toBe(true);
		expect(supportsTransparency('svg')).toBe(true);
		expect(supportsTransparency('jpeg')).toBe(false);

		expect(supportsScale('png')).toBe(true);
		expect(supportsScale('jpeg')).toBe(true);
		expect(supportsScale('svg')).toBe(false);
	});

	it('computes the output size for the scale', () => {
		expect(outputSize(1920, 1080, { format: 'png', scale: 2 })).toEqual({
			width: 3840,
			height: 2160,
		});
		expect(outputSize(1280, 720, { format: 'jpeg', scale: 0.5 })).toEqual({
			width: 640,
			height: 360,
		});
		// SVG ignores the scale.
		expect(outputSize(1280, 720, { format: 'svg', scale: 3 })).toEqual({
			width: 1280,
			height: 720,
		});
	});

	it('flags outputs larger than the browser canvas limit', () => {
		expect(exceedsCanvasLimit(3840, 2160, { format: 'png', scale: 4 })).toBe(
			false,
		);
		expect(exceedsCanvasLimit(4500, 1000, { format: 'png', scale: 4 })).toBe(
			true,
		);
		expect(
			exceedsCanvasLimit(MAX_CANVAS_SIDE + 1, 10, { format: 'svg', scale: 1 }),
		).toBe(true);
	});
});
