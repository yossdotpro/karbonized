import { describe, expect, it } from 'vitest';
import {
	BLOCK_TYPES,
	blockIdOfProperty,
	getBlockProperties,
	validatePropertyValue,
} from './catalog';

describe('block catalog', () => {
	it('has unique types and property keys', () => {
		const types = BLOCK_TYPES.map((spec) => spec.type);
		expect(new Set(types).size).toBe(types.length);

		BLOCK_TYPES.forEach((spec) => {
			const keys = getBlockProperties(spec.type).map(
				(property) => property.key,
			);
			expect(new Set(keys).size).toBe(keys.length);
		});
	});

	it('keeps default sizes within the limits', () => {
		BLOCK_TYPES.forEach(({ defaultSize, minSize, maxSize }) => {
			expect(defaultSize.width).toBeGreaterThanOrEqual(minSize.width);
			expect(defaultSize.height).toBeGreaterThanOrEqual(minSize.height);
			expect(defaultSize.width).toBeLessThanOrEqual(maxSize.width);
			expect(defaultSize.height).toBeLessThanOrEqual(maxSize.height);
		});
	});

	it('gives every enum a default among its options', () => {
		BLOCK_TYPES.flatMap((spec) => getBlockProperties(spec.type))
			.filter((property) => property.kind === 'enum')
			.forEach((property) => {
				expect(property.options).toContain(property.default);
			});
	});

	it('validates and normalizes values', () => {
		const [opacity] = getBlockProperties('text').filter(
			(property) => property.key === 'opacity',
		);
		expect(validatePropertyValue(opacity, 150)).toEqual({
			ok: true,
			value: 100,
		});
		expect(validatePropertyValue(opacity, '40')).toEqual({
			ok: true,
			value: 40,
		});
		expect(validatePropertyValue(opacity, 'high').ok).toBe(false);

		const [color] = getBlockProperties('text').filter(
			(property) => property.key === 'color',
		);
		expect(validatePropertyValue(color, '#abcdef80').ok).toBe(true);
		expect(validatePropertyValue(color, 'red').ok).toBe(false);

		const [shape] = getBlockProperties('shape').filter(
			(property) => property.key === 'shape',
		);
		expect(validatePropertyValue(shape, 'star').ok).toBe(true);
		expect(validatePropertyValue(shape, 'blob')).toMatchObject({
			ok: false,
			error: expect.stringContaining('oval'),
		});

		const [textSize] = getBlockProperties('text').filter(
			(property) => property.key === 'textSize',
		);
		expect(validatePropertyValue(textSize, 32)).toEqual({
			ok: true,
			value: '32',
		});
	});

	it('finds the block of a property with dashes in its key', () => {
		expect(blockIdOfProperty('html-123-auto-refresh')).toBe('html-123');
		expect(blockIdOfProperty('phone_mockup-9-src')).toBe('phone_mockup-9');
	});
});
