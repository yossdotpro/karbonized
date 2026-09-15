/**
 * Safe DOM manipulation API for HTML Block
 * Provides context-safe methods to avoid "Illegal invocation" errors
 */

export interface SafeDOMAPI {
	querySelector: (selector: string) => Element | null;
	querySelectorAll: (selector: string) => NodeListOf<Element>;
	createElement: (tagName: string) => Element | null;
	appendChild: (parent: Element, child: Element) => boolean;
	removeChild: (parent: Element, child: Element) => boolean;
	setAttribute: (element: Element, name: string, value: string) => boolean;
	getAttribute: (element: Element, name: string) => string | null;
	setStyle: (element: Element, property: string, value: string) => boolean;
	getStyle: (element: Element, property: string) => string | null;
}

export const createSafeDOM = (shadowRoot: ShadowRoot): SafeDOMAPI => {
	return {
		// Safe query selector within Shadow DOM
		querySelector: (selector: string) => {
			try {
				return shadowRoot.querySelector(selector);
			} catch (error) {
				console.error('Error in safeDOM.querySelector:', selector, error);
				return null;
			}
		},

		// Safe query selector all within Shadow DOM
		querySelectorAll: (selector: string) => {
			try {
				return shadowRoot.querySelectorAll(selector);
			} catch (error) {
				console.error('Error in safeDOM.querySelectorAll:', selector, error);
				return {
					length: 0,
					item: () => null,
					namedItem: () => null,
					forEach: () => {},
					entries: function* () {},
					keys: function* () {},
					values: function* () {},
					[Symbol.iterator]: function* () {},
					[Symbol.toStringTag]: 'NodeListOf',
				} as unknown as NodeListOf<Element>;
			}
		},

		// Safe create element
		createElement: (tagName: string) => {
			try {
				return document.createElement(tagName);
			} catch (error) {
				console.error('Error in safeDOM.createElement:', tagName, error);
				return null;
			}
		},

		// Safe append child
		appendChild: (parent: Element, child: Element) => {
			try {
				Element.prototype.appendChild.call(parent, child);
				return true;
			} catch (error) {
				console.error('Error in safeDOM.appendChild:', error);
				return false;
			}
		},

		// Safe remove child
		removeChild: (parent: Element, child: Element) => {
			try {
				Element.prototype.removeChild.call(parent, child);
				return true;
			} catch (error) {
				console.error('Error in safeDOM.removeChild:', error);
				return false;
			}
		},

		// Safe set attribute
		setAttribute: (element: Element, name: string, value: string) => {
			try {
				Element.prototype.setAttribute.call(element, name, value);
				return true;
			} catch (error) {
				console.error('Error in safeDOM.setAttribute:', error);
				return false;
			}
		},

		// Safe get attribute
		getAttribute: (element: Element, name: string) => {
			try {
				return Element.prototype.getAttribute.call(element, name);
			} catch (error) {
				console.error('Error in safeDOM.getAttribute:', error);
				return null;
			}
		},

		// Safe set style property
		setStyle: (element: Element, property: string, value: string) => {
			try {
				(element as HTMLElement).style.setProperty(property, value);
				return true;
			} catch (error) {
				console.error('Error in safeDOM.setStyle:', error);
				return false;
			}
		},

		// Safe get style property
		getStyle: (element: Element, property: string) => {
			try {
				return getComputedStyle(element as HTMLElement).getPropertyValue(
					property,
				);
			} catch (error) {
				console.error('Error in safeDOM.getStyle:', error);
				return null;
			}
		},
	};
};
