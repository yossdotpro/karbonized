/**
 * The packaged desktop app is loaded from a `file://` URL, where paths like
 * `/editor` point at the disk instead of a route, so it routes on the hash.
 * Everything else (web, PWA and the Electron dev server) keeps clean paths.
 */
export const usesHashRouting = (): boolean =>
	typeof window !== 'undefined' && window.location.protocol === 'file:';

/** The route showing right now, without the router. */
export const currentPath = (): string => {
	if (typeof window === 'undefined') return '/';
	return usesHashRouting()
		? window.location.hash.replace(/^#/, '') || '/'
		: window.location.pathname;
};

/** Navigate from outside a component, the way the router would. */
export const navigateTo = (path: string): void => {
	if (typeof window === 'undefined' || currentPath() === path) return;

	if (usesHashRouting()) {
		// HashRouter listens for hashchange, which this triggers.
		window.location.hash = path;
		return;
	}

	window.history.pushState({}, '', path);
	window.dispatchEvent(new PopStateEvent('popstate'));
};
