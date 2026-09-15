import { describe, expect, it } from 'vitest';
import { parseCSSVariables, scopeCSS, updateCSSVariable } from './css-parser';

const pick = (css: string) =>
	parseCSSVariables(css).map(({ name, type, value, unit }) => ({
		name,
		type,
		value,
		unit,
	}));

describe('parseCSSVariables', () => {
	it('infers types from names and values', () => {
		expect(
			pick(`:root {
				--accent-color: #ff6b6b;
				--card-radius: 12px;
				--show-border: true;
				--card-shadow: 0 2px 4px black;
				--line-height: 1.5em;
				--label: hello;
			}`),
		).toEqual([
			{
				name: 'accent-color',
				type: 'color',
				value: '#ff6b6b',
				unit: undefined,
			},
			{ name: 'card-radius', type: 'number', value: 12, unit: 'px' },
			{ name: 'show-border', type: 'boolean', value: true, unit: undefined },
			{
				name: 'card-shadow',
				type: 'shadow',
				value: '0 2px 4px black',
				unit: undefined,
			},
			{ name: 'line-height', type: 'number', value: 1.5, unit: 'em' },
			{ name: 'label', type: 'string', value: 'hello', unit: undefined },
		]);
	});

	it('prefers explicit type annotations', () => {
		const [variable] = parseCSSVariables(`:root {
			/* @type:number min:0 max:48 step:2 */ --gap: 16px;
		}`);

		expect(variable).toMatchObject({
			name: 'gap',
			type: 'number',
			value: 16,
			min: 0,
			max: 48,
			step: 2,
			unit: 'px',
		});
	});

	it('only reads variables from :root', () => {
		expect(parseCSSVariables('.card { --size: 10px; }')).toEqual([]);
	});
});

describe('updateCSSVariable', () => {
	it('keeps the unit of numeric variables', () => {
		const css = ':root { --card-radius: 12px; }';
		const variables = parseCSSVariables(css);

		expect(updateCSSVariable(css, 'card-radius', 20, variables)).toBe(
			':root { --card-radius: 20px; }',
		);
	});

	it('writes other values as-is', () => {
		const css = ':root { --accent-color: #fff; }';
		expect(
			updateCSSVariable(css, 'accent-color', '#000', parseCSSVariables(css)),
		).toBe(':root { --accent-color: #000; }');
	});
});

describe('scopeCSS', () => {
	it('prefixes selectors and maps :root to the scope', () => {
		const scoped = scopeCSS(
			':root { --x: 1; }\n.card, h1 { color: red; }',
			':host',
		);

		expect(scoped).toContain(':host { --x: 1; }');
		expect(scoped).toContain(':host .card');
		expect(scoped).toContain(':host h1');
	});

	it('leaves at-rules alone', () => {
		expect(scopeCSS('@media (min-width: 1px) { }', ':host')).toBe(
			'@media (min-width: 1px) { }',
		);
	});
});
