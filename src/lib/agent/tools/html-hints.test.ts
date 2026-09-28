import { describe, expect, it } from 'vitest';
import { htmlBlockHints } from './html-hints';

const goodCss = `:root {
	/* @type:color */ --bg: #16161a;
	/* @type:color */ --accent: #fb7185;
	/* @type:number min:0 max:48 step:1 unit:px */ --radius: 24px;
	/* @type:icon */ --icon: FaRocket;
}
.tile { background: var(--bg); border-radius: var(--radius); }`;

describe('htmlBlockHints', () => {
	it('accepts a small component with annotated variables', () => {
		expect(
			htmlBlockHints({
				html: '<div class="tile"><b>128k</b> users</div>',
				css: goodCss,
				box: { width: 400, height: 200 },
				canvas: { width: 1080, height: 1350 },
			}),
		).toEqual([]);
	});

	it('asks for variables when there are none', () => {
		const [hint] = htmlBlockHints({
			html: '<div class="tile">Hi</div>',
			css: '.tile { color: red; }',
		});
		expect(hint).toMatch(/declares no variables/);
	});

	it('asks for annotations on unannotated variables', () => {
		const [hint] = htmlBlockHints({
			html: '<div>Hi</div>',
			css: ':root { --accent-color: #ff0000; } div { color: var(--accent-color); }',
		});
		expect(hint).toMatch(/no \/\* @type/);
	});

	it('flags a block that is the whole image or all its text', () => {
		const hints = htmlBlockHints({
			html: `<section><h1>Launch week</h1><p>${'word '.repeat(60)}</p></section>`,
			css: goodCss,
			box: { width: 1080, height: 1350 },
			canvas: { width: 1080, height: 1350 },
		});
		expect(hints.join(' ')).toMatch(/covers 100% of the canvas/);
		expect(hints.join(' ')).toMatch(/words of text/);
	});
});
