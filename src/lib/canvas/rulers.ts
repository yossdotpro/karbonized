/**
 * Rulers and guides.
 *
 * The ticks of a ruler are chosen so they never crowd: the step grows with
 * the zoom in the round numbers a ruler is read in (1, 2, 5, 10, 20, 50…).
 */

/** Steps a ruler is read in, repeated at every power of ten. */
const STEPS = [1, 2, 5];

/**
 * Distance between ticks, in canvas pixels, so that on screen they stay at
 * least `minSpacing` apart at the given zoom.
 */
export const tickStep = (zoom: number, minSpacing = 64): number => {
	const scale = zoom > 0 ? zoom : 1;
	const wanted = minSpacing / scale;
	const power = Math.floor(Math.log10(Math.max(wanted, 1e-6)));

	for (let exponent = power; exponent < power + 3; exponent += 1) {
		for (const step of STEPS) {
			const candidate = step * 10 ** exponent;
			if (candidate >= wanted) return candidate;
		}
	}

	return 10 ** (power + 1);
};

/** Tick positions, in canvas pixels, covering `from`–`to`. */
export const ticksBetween = (
	from: number,
	to: number,
	step: number,
): number[] => {
	if (step <= 0 || to <= from) return [];

	const first = Math.ceil(from / step) * step;
	const ticks: number[] = [];

	for (let value = first; value <= to; value += step) {
		// Keep the label readable when the step is fractional, and never
		// hand back a negative zero.
		ticks.push(Math.round(value * 100) / 100 + 0);
	}

	return ticks;
};

/** A guide dropped outside the canvas is not a guide. */
export const isGuideInside = (position: number, size: number): boolean =>
	position >= 0 && position <= size;
