import { describe, expect, it } from 'vitest';
import {
	KCOMPONENT_LIMITS,
	generateKComponentExample,
	parseKComponent,
	parseKComponentDocument,
	slugifyComponentName,
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

	it('round-trips the block size', () => {
		const sized = {
			...component,
			manifest: { ...component.manifest, width: 320, height: 180 },
		};
		const parsed = parseKComponent(stringifyKComponent(sized));

		expect(parsed.manifest.width).toBe(320);
		expect(parsed.manifest.height).toBe(180);
	});

	it('leaves empty fields out of the exported file', () => {
		const exported = stringifyKComponent({
			manifest: { name: 'Solo' },
			html: '<p></p>',
			css: '',
			js: '',
		});

		expect(exported).not.toContain('author');
		expect(exported).not.toContain('css:');
		expect(exported).not.toContain('js:');
		expect(parseKComponentDocument(exported).component).not.toBeNull();
	});

	it('generates a valid example', () => {
		expect(validateKComponentFile(generateKComponentExample())).toEqual({
			valid: true,
			warnings: [],
		});
	});

	it('imports a component that only has markup', () => {
		const { component: parsed, warnings } = parseKComponentDocument(
			'manifest:\n  name: Card\nhtml: |\n  <div>hi</div>\n',
		);

		expect(parsed?.css).toBe('');
		expect(parsed?.js).toBe('');
		// Not an error, but the author should know the sections are missing.
		expect(warnings).toHaveLength(2);
	});

	it('reports the missing field', () => {
		expect(validateKComponentFile('manifest:\n  name: A\n').error).toContain(
			'Missing "html" field',
		);
		expect(validateKComponentFile('manifest: {}\nhtml: <p/>').error).toContain(
			'manifest.name',
		);
		expect(validateKComponentFile('html: <p/>').error).toContain(
			'Missing "manifest" field',
		);
		expect(validateKComponentFile('').valid).toBe(false);
		expect(validateKComponentFile('just a string').valid).toBe(false);
	});

	it('points at the line of a YAML syntax error', () => {
		const { component: parsed, errors } = parseKComponentDocument(
			'manifest:\n  name: "unterminated\nhtml: <p/>\n',
		);

		expect(parsed).toBeNull();
		expect(errors[0]).toMatch(/line \d+/);
	});

	it('rejects a section that is not text', () => {
		expect(
			validateKComponentFile('manifest:\n  name: A\nhtml: 42\n').error,
		).toContain('"html" must be text');
		expect(
			validateKComponentFile('manifest:\n  - a\nhtml: <p/>\n').error,
		).toContain('"manifest" must be an object');
	});

	it('refuses a file past the size limit', () => {
		const huge = `manifest:\n  name: Big\nhtml: |\n  ${'x'.repeat(
			KCOMPONENT_LIMITS.section + 1,
		)}\n`;

		expect(parseKComponentDocument(huge).component).toBeNull();
	});

	it('normalizes loose manifests instead of failing', () => {
		const { component: parsed, warnings } = parseKComponentDocument(
			[
				'manifest:',
				'  name: "  Spaced  "',
				'  tags: "one, two, ONE, three"',
				'  version: banana',
				'  width: "240"',
				'  height: 99999',
				'  thumbnail: "javascript:alert(1)"',
				'  extra: nope',
				'html: <p/>',
			].join('\n'),
		);

		expect(parsed?.manifest.name).toBe('Spaced');
		// Accepts a comma separated string, and drops the repeat.
		expect(parsed?.manifest.tags).toEqual(['one', 'two', 'three']);
		expect(parsed?.manifest.width).toBe(240);
		// Out of range, so it is dropped rather than clamped to a surprise.
		expect(parsed?.manifest.height).toBeUndefined();
		// Only https and inline images are kept.
		expect(parsed?.manifest.thumbnail).toBeUndefined();
		expect(warnings.some((warning) => warning.includes('banana'))).toBe(true);
		expect(warnings.some((warning) => warning.includes('manifest.extra'))).toBe(
			true,
		);
	});

	it('keeps an inline thumbnail', () => {
		const { component: parsed } = parseKComponentDocument(
			'manifest:\n  name: A\n  thumbnail: "data:image/png;base64,iVBORw0KGgo="\nhtml: <p/>\n',
		);

		expect(parsed?.manifest.thumbnail).toContain('data:image/png;base64,');
	});

	it('makes a filename from any name', () => {
		expect(slugifyComponentName('Botón Rápido 2.0')).toBe('boton-rapido-2-0');
		expect(slugifyComponentName('***')).toBe('component');
	});
});
