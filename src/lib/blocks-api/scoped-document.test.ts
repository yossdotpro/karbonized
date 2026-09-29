import { describe, expect, it } from 'vitest';
import { createScopedDocument } from './scoped-document';

const setup = () => {
	const host = document.createElement('div');
	const shadowRoot = host.attachShadow({ mode: 'open' });
	shadowRoot.innerHTML = '<ul class="items"></ul>';
	document.body.innerHTML = '<ul class="items" id="outside"></ul>';
	return { host, shadowRoot, scoped: createScopedDocument(shadowRoot, host) };
};

describe('createScopedDocument', () => {
	it('builds nodes with the methods of the page document', () => {
		const { shadowRoot, scoped } = setup();

		const list = scoped.querySelector('.items')!;
		list.replaceChildren(
			...['Fast', 'Safe'].map((text) => {
				const item = scoped.createElement('li');
				item.textContent = text;
				return item;
			}),
			scoped.createTextNode('!'),
		);

		expect(shadowRoot.querySelectorAll('li')).toHaveLength(2);
		expect(document.getElementById('outside')!.children).toHaveLength(0);
	});

	it('keeps queries, body and documentElement inside the block', () => {
		const { host, shadowRoot, scoped } = setup();
		expect(scoped.querySelectorAll('.items')).toHaveLength(1);
		expect(scoped.body).toBe(shadowRoot);
		expect(scoped.documentElement).toBe(host);
	});
});
