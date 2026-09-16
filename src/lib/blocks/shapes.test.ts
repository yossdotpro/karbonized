import { describe, expect, it } from 'vitest';
import {
	isStrokedShape,
	regularPolygonPoints,
	resolveShape,
	shapeInset,
	shapePath,
	strokeDashArray,
} from './shapes';

describe('resolveShape', () => {
	it('maps ids saved by older versions', () => {
		expect(resolveShape('oval')).toEqual({ kind: 'ellipse' });
		expect(resolveShape('poligon')).toEqual({ kind: 'polygon', sides: 5 });
		expect(resolveShape('hexagon')).toEqual({ kind: 'polygon', sides: 6 });
	});

	it('keeps the old arrow graphics for their own ids', () => {
		expect(resolveShape('arrow3')).toBeNull();
		expect(resolveShape('nonsense')).toBeNull();
	});

	it('resolves current shapes to themselves', () => {
		expect(resolveShape('star')).toEqual({ kind: 'star' });
	});
});

describe('regularPolygonPoints', () => {
	it('returns one point per side', () => {
		expect(regularPolygonPoints(100, 100, 6)).toHaveLength(6);
	});

	it('adds an inner point between every two for stars', () => {
		expect(regularPolygonPoints(100, 100, 5, 0.5)).toHaveLength(10);
	});

	it('starts at the top of the box', () => {
		const [[x, y]] = regularPolygonPoints(100, 80, 5);
		expect(x).toBeCloseTo(50);
		expect(y).toBeCloseTo(0);
	});
});

describe('shapePath', () => {
	it('draws a rectangle that fills the box when there is no stroke', () => {
		expect(shapePath('rectangle', { width: 40, height: 20 })).toBe(
			'M0,0 L40,0 L40,20 L0,20 Z',
		);
	});

	it('pulls the drawing in by half the stroke', () => {
		expect(shapeInset(8)).toBe(4);
		expect(shapePath('rectangle', { width: 40, height: 20 }, 8)).toBe(
			'M0,0 L32,0 L32,12 L0,12 Z',
		);
	});

	it('rounds the corners of a rectangle', () => {
		expect(
			shapePath('rectangle', { width: 40, height: 20, cornerRadius: 5 }),
		).toContain('A5,5');
	});

	it('draws lines and arrows along the middle', () => {
		expect(shapePath('line', { width: 100, height: 40 })).toBe('M0,20 L100,20');
		expect(shapePath('arrow', { width: 100, height: 40 })).toContain('M0,20');
	});

	it('has as many points as sides', () => {
		const path = shapePath('polygon', { width: 100, height: 100, sides: 7 });
		expect(path.split('L')).toHaveLength(7);
	});
});

describe('isStrokedShape', () => {
	it('is true only for lines and arrows', () => {
		expect(isStrokedShape('line')).toBe(true);
		expect(isStrokedShape('arrow')).toBe(true);
		expect(isStrokedShape('ellipse')).toBe(false);
	});
});

describe('strokeDashArray', () => {
	it('scales with the stroke width', () => {
		expect(strokeDashArray('dashed', 4)).toBe('12 8');
		expect(strokeDashArray('dotted', 4)).toBe('0 8');
		expect(strokeDashArray('solid', 4)).toBeUndefined();
	});
});
