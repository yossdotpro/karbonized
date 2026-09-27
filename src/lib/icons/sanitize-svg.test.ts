import { describe, expect, it } from 'vitest';
import { sanitizeIconSvg } from './sanitize-svg';

const clean = (markup: string) => {
	const result = sanitizeIconSvg(markup);
	if (!result.ok) throw new Error(result.error);
	return result.svg;
};

describe('sanitizeIconSvg', () => {
	it('keeps the drawing and drops the size', () => {
		const svg = clean(
			'<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0z"/></svg>',
		);
		expect(svg).toContain('viewBox="0 0 24 24"');
		expect(svg).toContain('<path d="M0 0h24v24H0z"');
		expect(svg).not.toMatch(/width=|height=/);
	});

	it('derives a view box from width and height', () => {
		expect(
			clean('<svg width="16" height="16"><circle cx="8" cy="8" r="4"/></svg>'),
		).toContain('viewBox="0 0 16 16"');
	});

	it('fills with the text color unless the icon sets a fill', () => {
		expect(
			clean('<svg viewBox="0 0 8 8"><rect width="8" height="8"/></svg>'),
		).toContain('fill="currentColor"');
		expect(
			clean(
				'<svg viewBox="0 0 8 8" fill="none" stroke="currentColor"><path d="M0 0l8 8"/></svg>',
			),
		).toContain('fill="none"');
	});

	it('removes scripts, handlers, foreign content and external links', () => {
		const svg = clean(`<svg viewBox="0 0 24 24" onload="alert(1)">
			<script>alert(1)</script>
			<foreignObject><div>x</div></foreignObject>
			<a href="https://example.com"><path d="M1 1"/></a>
			<use href="https://evil.example/icons.svg#x"/>
			<use href="#local"/>
			<path d="M2 2" fill="url(https://evil.example/p)" onclick="x()"/>
			<rect width="4" height="4" style="fill:red"/>
		</svg>`);
		expect(svg).not.toMatch(
			/script|onload|onclick|foreignObject|evil|https:|style=/,
		);
		expect(svg).toContain('href="#local"');
		expect(svg).toContain('<path d="M2 2"');
	});

	it('rejects what is not an icon', () => {
		expect(sanitizeIconSvg('<div>hi</div>').ok).toBe(false);
		expect(sanitizeIconSvg('<svg><path d="M0 0"/></svg>').ok).toBe(false);
		expect(sanitizeIconSvg('<svg viewBox="0 0 1 1"></svg>').ok).toBe(false);
		expect(sanitizeIconSvg('not markup').ok).toBe(false);
	});
});
