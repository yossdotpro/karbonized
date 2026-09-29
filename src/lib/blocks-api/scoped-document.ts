/**
 * The `document` block scripts see: queries, `body` and events reach the
 * block's shadow root, `documentElement` its host, and everything else is
 * the page document. Methods of the page document are bound to it, since
 * calling them on the proxy (`document.createElement('li')`) throws
 * "Illegal invocation".
 */
export const createScopedDocument = (
	shadowRoot: ShadowRoot,
	host: HTMLElement,
): Document => {
	const globalDocument = window.document;

	return new Proxy(globalDocument, {
		get(target, prop) {
			switch (prop) {
				case 'querySelector':
					return shadowRoot.querySelector.bind(shadowRoot);
				case 'querySelectorAll':
					return shadowRoot.querySelectorAll.bind(shadowRoot);
				case 'getElementById':
					return shadowRoot.getElementById?.bind(shadowRoot);
				case 'body':
				case 'head':
					return shadowRoot;
				case 'documentElement':
					return host;
				case 'activeElement':
					return shadowRoot.activeElement;
				case 'addEventListener':
					return shadowRoot.addEventListener.bind(shadowRoot);
				case 'removeEventListener':
					return shadowRoot.removeEventListener.bind(shadowRoot);
				case 'dispatchEvent':
					return shadowRoot.dispatchEvent.bind(shadowRoot);
				default: {
					const value = Reflect.get(target, prop, target);
					return typeof value === 'function' ? value.bind(target) : value;
				}
			}
		},
	});
};
