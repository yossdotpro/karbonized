import { describe, expect, it } from 'vitest';
import { isGuideInside, tickStep, ticksBetween } from './rulers';

describe('tickStep', () => {
	it('is a round number a ruler is read in', () => {
		[0.1, 0.25, 0.5, 1, 2, 4, 8].forEach((zoom) => {
			const step = tickStep(zoom);
			const normalized = step / 10 ** Math.floor(Math.log10(step));
			expect([1, 2, 5]).toContain(Math.round(normalized));
		});
	});

	it('keeps the ticks apart on screen', () => {
		[0.1, 0.5, 1, 3].forEach((zoom) => {
			expect(tickStep(zoom, 64) * zoom).toBeGreaterThanOrEqual(64);
		});
	});

	it('needs fewer canvas pixels the more it is zoomed in', () => {
		expect(tickStep(4)).toBeLessThan(tickStep(1));
		expect(tickStep(1)).toBeLessThan(tickStep(0.25));
	});
});

describe('ticksBetween', () => {
	it('starts on the first round value in range', () => {
		expect(ticksBetween(-15, 45, 20)).toEqual([0, 20, 40]);
	});

	it('has nothing to show for an empty range', () => {
		expect(ticksBetween(50, 10, 20)).toEqual([]);
		expect(ticksBetween(0, 100, 0)).toEqual([]);
	});
});

describe('isGuideInside', () => {
	it('keeps the guides that fall on the canvas', () => {
		expect(isGuideInside(100, 1000)).toBe(true);
		expect(isGuideInside(-2, 1000)).toBe(false);
		expect(isGuideInside(1200, 1000)).toBe(false);
	});
});
