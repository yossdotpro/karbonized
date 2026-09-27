import { describe, expect, it } from 'vitest';
import {
	type ProjectVariable,
	escapeHtml,
	formatDate,
	nextVariableName,
	normalizeVariables,
	resolveVariables,
	variableReferences,
} from './variables';

const variables: ProjectVariable[] = [
	{ name: 'title', kind: 'text', value: 'Ship <it>' },
	{ name: 'release', kind: 'date', value: '2026-03-05', format: 'iso' },
];

describe('project variables', () => {
	it('replaces known references and keeps unknown ones visible', () => {
		expect(
			resolveVariables('{{title}} on {{ release }} by {{author}}', variables),
		).toBe('Ship <it> on 2026-03-05 by {{author}}');
	});

	it('escapes values for markup', () => {
		expect(
			resolveVariables('<h1>{{title}}</h1>', variables, {
				escape: escapeHtml,
			}),
		).toBe('<h1>Ship &lt;it&gt;</h1>');
	});

	it('formats dates, with today as the day of the render', () => {
		const now = new Date(2026, 8, 27);
		expect(formatDate('today', 'iso', { now })).toBe('2026-09-27');
		expect(formatDate('2026-03-05', 'long', { locale: 'en-US' })).toBe(
			'March 5, 2026',
		);
		expect(formatDate('not a date', 'long')).toBe('not a date');
	});

	it('lists the references of a text', () => {
		expect(variableReferences('{{a}} {{b}} {{a}} {{ 1x }}')).toEqual([
			'a',
			'b',
		]);
	});

	it('drops malformed and repeated variables', () => {
		expect(
			normalizeVariables([
				{ name: 'title', kind: 'text', value: 'A' },
				{ name: 'title', kind: 'text', value: 'B' },
				{ name: '1bad', value: 'x' },
				{ name: 'day', kind: 'date', value: 'today', format: 'weird' },
				{ name: 'note', kind: 'nope', value: 3, label: '  Note ' },
				'junk',
			]),
		).toEqual([
			{ name: 'title', kind: 'text', value: 'A' },
			{ name: 'day', kind: 'date', value: 'today' },
			{ name: 'note', kind: 'text', value: '', label: 'Note' },
		]);
	});

	it('suggests free names', () => {
		expect(nextVariableName(variables, 'title')).toBe('title-2');
		expect(nextVariableName(variables, 'subtitle')).toBe('subtitle');
	});
});
