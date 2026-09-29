import { describe, expect, it } from 'vitest';
import { htmlBlockContractErrors } from './html-contract';

const html = '<div class="tile"><p class="value"></p></div>';
const css =
	':root {\n  /* @type:color */ --bg: #16161a;\n}\n.tile { background: var(--bg); }';
const js =
	'// @var value:string = "128k"\ndocument.querySelector(".value").textContent = value;';

describe('htmlBlockContractErrors', () => {
	it('accepts a block with css and js variables', () => {
		expect(htmlBlockContractErrors({ html, css, js })).toEqual([]);
	});

	it('asks for the missing parts', () => {
		const errors = htmlBlockContractErrors({ html: '', css: '' });
		expect(errors.join('\n')).toMatch(/html is missing/);
		expect(errors.join('\n')).toMatch(/css is missing/);
		expect(errors.join('\n')).toMatch(/js is missing/);
	});

	it('asks for annotated css variables and js variables', () => {
		const errors = htmlBlockContractErrors({
			html,
			css: ':root { --bg: #000; }',
			js: 'console.log(1);',
		});
		expect(errors).toHaveLength(2);
		expect(errors[0]).toMatch(/no annotated :root variables/);
		expect(errors[1]).toMatch(/no \/\/ @var variables/);
	});

	it('refuses a script that declares a variable again', () => {
		const errors = htmlBlockContractErrors({
			html,
			css,
			js: '// @var bars:array = ["a"]\nconst bars = [];',
		});
		expect(errors.join('\n')).toMatch(/declares bars again/);

		// Other names that contain it, and properties, are fine.
		expect(
			htmlBlockContractErrors({
				html,
				css,
				js: '// @var bars:array = ["a"]\nconst allBars = bars; host.bars = 1;',
			}),
		).toEqual([]);
	});

	it('refuses lists that are not JSON lists of strings', () => {
		expect(
			htmlBlockContractErrors({
				html,
				css,
				js: "// @var items:array = ['a', 'b'];",
			}).join('\n'),
		).toMatch(/not valid JSON/);
		expect(
			htmlBlockContractErrors({
				html,
				css,
				js: '// @var items:array = [1, 2]',
			}).join('\n'),
		).toMatch(/list of strings/);
		expect(
			htmlBlockContractErrors({
				html,
				css,
				js: '// @var items:array = null',
			}).join('\n'),
		).toMatch(/list of strings/);
	});
});
