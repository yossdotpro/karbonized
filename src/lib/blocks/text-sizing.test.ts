import { describe, expect, it } from 'vitest';
import { isTextSizing, sizingAfterResize, sizingForSize } from './text-sizing';

describe('text sizing', () => {
	it('fixes the width with side handles and both with the others', () => {
		expect(sizingAfterResize('auto', [1, 0])).toBe('fixed-width');
		expect(sizingAfterResize('auto', [-1, 0])).toBe('fixed-width');
		expect(sizingAfterResize('auto', [0, 1])).toBe('fixed');
		expect(sizingAfterResize('auto', [1, -1])).toBe('fixed');
		expect(sizingAfterResize('fixed-width', [1, 0])).toBe('fixed-width');
		expect(sizingAfterResize('fixed-width', [0, -1])).toBe('fixed');
		expect(sizingAfterResize('fixed', [1, 0])).toBe('fixed');
	});

	it('fixes both when the aspect ratio is locked', () => {
		expect(sizingAfterResize('auto', [1, 0], true)).toBe('fixed');
	});

	it('picks the mode for sizes set by tools', () => {
		expect(sizingForSize('auto', {})).toBe('auto');
		expect(sizingForSize('auto', { width: 100 })).toBe('fixed-width');
		expect(sizingForSize('fixed', { width: 100 })).toBe('fixed');
		expect(sizingForSize('fixed-width', { height: 40 })).toBe('fixed');
	});

	it('recognizes stored modes', () => {
		expect(isTextSizing('auto')).toBe(true);
		expect(isTextSizing('grow')).toBe(false);
		expect(isTextSizing(undefined)).toBe(false);
	});
});
