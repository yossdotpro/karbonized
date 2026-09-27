import { describe, expect, it } from 'vitest';
import {
	boundsOf,
	outlinePath,
	parsePoints,
	relativeTo,
	serializePoints,
	simplifyPoints,
	smoothPath,
	strokeFromPoints,
	strokeRadii,
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

describe('strokeRadii', () => {
	const line = [
		{ x: 0, y: 0 },
		{ x: 10, y: 0 },
		{ x: 20, y: 0 },
	];

	it('keeps one width when nothing thins the stroke', () => {
		expect(strokeRadii(line, { width: 10, thinning: 0 })).toEqual([5, 5, 5]);
	});

	it('follows the pressure of a pen', () => {
		const radii = strokeRadii(
			[
				{ x: 0, y: 0, pressure: 0.1 },
				{ x: 10, y: 0, pressure: 1 },
			],
			{ width: 10, thinning: 1 },
		);

		expect(radii[0]).toBeLessThan(radii[1]);
		expect(radii[1]).toBeCloseTo(5);
	});

	it('thins the stroke where it moves fast, without a pen', () => {
		const radii = strokeRadii(
			[
				{ x: 0, y: 0 },
				{ x: 2, y: 0 },
				{ x: 40, y: 0 },
			],
			{ width: 10, thinning: 1, fastAt: 24 },
		);

		expect(radii[2]).toBeLessThan(radii[1]);
	});

	it('tapers the ends', () => {
		const radii = strokeRadii(line, { width: 10, thinning: 0, taper: 10 });

		expect(radii[0]).toBeLessThan(radii[1]);
		expect(radii[2]).toBeLessThan(radii[1]);
	});

	it('never goes down to nothing', () => {
		expect(
			strokeRadii(line, { width: 10, thinning: 1, taper: 10 }).every(
				(radius) => radius > 0,
			),
		).toBe(true);
	});
});

describe('outlinePath', () => {
	it('draws a dot as a circle', () => {
		const path = outlinePath([{ x: 10, y: 10 }], { width: 8, thinning: 0 });

		expect(path.match(/A/g)).toHaveLength(2);
		expect(path.endsWith('Z')).toBe(true);
	});

	it('goes out on one side and back on the other', () => {
		const path = outlinePath(
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 20, y: 0 },
			],
			{ width: 10, thinning: 0 },
		);

		// Two sides of three points, minus the point each side starts on.
		expect(path.match(/L/g)).toHaveLength(4);
		// A round cap at each end.
		expect(path.match(/A/g)).toHaveLength(2);
	});

	it('has nothing to draw without points', () => {
		expect(outlinePath([], { width: 10 })).toBe('');
	});
});

describe('serializePoints and parsePoints', () => {
	it('keep the points through a round trip', () => {
		const points = [
			{ x: 1.234, y: 2, pressure: 0.25 },
			{ x: 3, y: 4, pressure: 1 },
		];

		expect(parsePoints(serializePoints(points))).toEqual([
			{ x: 1.23, y: 2, pressure: 0.25 },
			{ x: 3, y: 4, pressure: 1 },
		]);
	});

	it('read nothing from an empty or broken value', () => {
		expect(parsePoints('')).toEqual([]);
		expect(parsePoints(undefined)).toEqual([]);
		expect(parsePoints('nonsense')).toEqual([]);
	});
});
