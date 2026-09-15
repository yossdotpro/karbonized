import { describe, expect, it } from 'vitest';
import {
	generateKComponentExample,
	parseKComponent,
	stringifyKComponent,
	validateKComponentFile,
} from './kcomponentParser';
import type { KComponent } from '@/models/KComponent';

const component: KComponent = {
	manifest: {
		name: 'Pricing card',
		author: 'Karbonized',
		description: 'A card with "quotes": and colons',
		version: '1.0.0',
		category: 'Cards',
		tags: ['pricing', 'card'],
	},
	html: '<div class="card">\n  <h1>Pro</h1>\n</div>',
	css: ':root {\n  --accent-color: #ff6b6b;\n}',
	js: '// @action:Upgrade\nlog("upgrade");',
};

describe('kcomponent files', () => {
	it('round-trips through YAML', () => {
		const parsed = parseKComponent(stringifyKComponent(component));

		expect(parsed.manifest).toMatchObject(component.manifest);
		expect(parsed.html).toBe(component.html);
		expect(parsed.css).toBe(component.css);
		expect(parsed.js).toBe(component.js);
	});

	it('generates a valid example', () => {
		expect(validateKComponentFile(generateKComponentExample())).toEqual({
			valid: true,
		});
	});

	it('reports the missing field', () => {
		const missingJs = stringifyKComponent({ ...component, js: '' });

		expect(validateKComponentFile(missingJs)).toEqual({
			valid: false,
			error: 'Failed to parse .kcomponent file: Missing js field',
		});
		expect(validateKComponentFile('manifest: {}').error).toContain(
			'Missing manifest.name field',
		);
		expect(validateKComponentFile('').valid).toBe(false);
		expect(validateKComponentFile('a: [unclosed').valid).toBe(false);
	});
});
