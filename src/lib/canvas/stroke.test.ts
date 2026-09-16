import { describe, expect, it } from 'vitest';
import {
	boundsOf,
	relativeTo,
	simplifyPoints,
	smoothPath,
	strokeFromPoints,
} from './stroke';

describe('simplifyPoints', () => {
	it('drops the points that sit on the line', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 5, y: 0 },
			{ x: 10, y: 0 },
		];

		expect(simplifyPoints(points, 1)).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		]);
	});

	it('keeps the points that shape the line', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 5, y: 10 },
			{ x: 10, y: 0 },
		];

		expect(simplifyPoints(points, 1)).toHaveLength(3);
	});

	it('keeps every point when smoothing is off', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 2, y: 0 },
		];

		expect(simplifyPoints(points, 0)).toHaveLength(3);
	});
});

describe('smoothPath', () => {
	it('paints a single point as a dot', () => {
		expect(smoothPath([{ x: 3, y: 4 }])).toBe('M3,4 L3,4');
	});

	it('joins two points with a line', () => {
		expect(
			smoothPath([
				{ x: 0, y: 0 },
				{ x: 10, y: 5 },
			]),
		).toBe('M0,0 L10,5');
	});

	it('makes a curve through every point', () => {
		const path = smoothPath([
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
			{ x: 20, y: 0 },
		]);

		expect(path.startsWith('M0,0')).toBe(true);
		// One curve per segment, each ending on its point.
		expect(path.match(/C/g)).toHaveLength(2);
		expect(path.endsWith('20,0')).toBe(true);
	});
});

describe('boundsOf', () => {
	it('is the box around the points', () => {
		expect(
			boundsOf([
				{ x: 10, y: 20 },
				{ x: 30, y: 5 },
			]),
		).toEqual({ x: 10, y: 5, width: 20, height: 15 });
	});

	it('grows by the padding on each side', () => {
		expect(boundsOf([{ x: 10, y: 10 }], 4)).toEqual({
			x: 6,
			y: 6,
			width: 8,
			height: 8,
		});
	});
});

describe('relativeTo', () => {
	it('moves the points to the corner of the box', () => {
		expect(relativeTo([{ x: 15, y: 25 }], { x: 10, y: 20 })).toEqual([
			{ x: 5, y: 5 },
		]);
	});
});

describe('strokeFromPoints', () => {
	it('returns a path measured from its own box', () => {
		const stroke = strokeFromPoints(
			[
				{ x: 100, y: 100 },
				{ x: 150, y: 120 },
				{ x: 200, y: 100 },
			],
			{ padding: 2 },
		);

		expect(stroke?.box).toEqual({ x: 98, y: 98, width: 104, height: 24 });
		expect(stroke?.path.startsWith('M2,2')).toBe(true);
	});

	it('has nothing to draw without points', () => {
		expect(strokeFromPoints([])).toBeNull();
	});
});
