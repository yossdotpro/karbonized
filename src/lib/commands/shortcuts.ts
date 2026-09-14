/**
 * Keyboard shortcut helpers.
 *
 * Shortcuts are written as `+`-separated tokens, e.g. `Mod+Shift+Z`.
 * - `Mod` is ⌘ on macOS and Ctrl everywhere else.
 * - Letters and digits match the physical key (`event.code`), so they work the
 *   same on every keyboard layout and with Alt/Option held.
 * - Symbols use named tokens (`Plus`, `Minus`, `Period`, `Enter`, `Escape`…)
 *   and match `event.key`, ignoring Shift, because their position varies
 *   between layouts (e.g. `+` on a Spanish keyboard).
 */

export const isMac =
	typeof navigator !== 'undefined' &&
	/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

interface ParsedShortcut {
	mod: boolean;
	shift: boolean;
	alt: boolean;
	key: string;
}

const SYMBOL_KEYS: Record<string, string[]> = {
	plus: ['+', '='],
	minus: ['-', '_'],
	period: ['.', ':'],
	comma: [',', ';'],
	slash: ['/'],
	enter: ['Enter'],
	escape: ['Escape'],
	space: [' '],
	delete: ['Delete'],
	backspace: ['Backspace'],
	tab: ['Tab'],
	arrowup: ['ArrowUp'],
	arrowdown: ['ArrowDown'],
	arrowleft: ['ArrowLeft'],
	arrowright: ['ArrowRight'],
};

const KEY_LABELS: Record<string, string> = {
	plus: '+',
	minus: '−',
	period: '.',
	comma: ',',
	slash: '/',
	enter: '↵',
	escape: 'Esc',
	space: 'Space',
	delete: 'Del',
	backspace: '⌫',
	tab: 'Tab',
	arrowup: '↑',
	arrowdown: '↓',
	arrowleft: '←',
	arrowright: '→',
};

const cache = new Map<string, ParsedShortcut>();

export const parseShortcut = (shortcut: string): ParsedShortcut => {
	const cached = cache.get(shortcut);
	if (cached) return cached;

	const parsed: ParsedShortcut = {
		mod: false,
		shift: false,
		alt: false,
		key: '',
	};

	shortcut.split('+').forEach((token) => {
		const lower = token.trim().toLowerCase();
		if (lower === 'mod') parsed.mod = true;
		else if (lower === 'shift') parsed.shift = true;
		else if (lower === 'alt') parsed.alt = true;
		else parsed.key = lower;
	});

	cache.set(shortcut, parsed);
	return parsed;
};

export const matchesShortcut = (
	event: KeyboardEvent,
	shortcut: string,
): boolean => {
	const { mod, shift, alt, key } = parseShortcut(shortcut);
	const modPressed = isMac ? event.metaKey : event.ctrlKey;
	const otherModPressed = isMac ? event.ctrlKey : event.metaKey;

	if (mod !== modPressed || otherModPressed || alt !== event.altKey) {
		return false;
	}

	const symbol = SYMBOL_KEYS[key];
	if (symbol) {
		return symbol.includes(event.key);
	}

	if (shift !== event.shiftKey) return false;

	// Prefer the physical key; fall back to `event.key` when the code is not
	// reported (virtual keyboards, some IMEs and synthetic events).
	const hasCode = /^(Key[A-Z]|Digit[0-9])$/.test(event.code);

	if (/^[a-z]$/.test(key)) {
		return hasCode
			? event.code === `Key${key.toUpperCase()}`
			: event.key.toLowerCase() === key;
	}
	if (/^[0-9]$/.test(key)) {
		return hasCode ? event.code === `Digit${key}` : event.key === key;
	}

	return event.key.toLowerCase() === key;
};

/** Individual key caps for a shortcut, e.g. `['Ctrl', 'Shift', 'Z']`. */
export const shortcutKeys = (shortcut: string): string[] => {
	const { mod, shift, alt, key } = parseShortcut(shortcut);
	const keys: string[] = [];

	if (mod) keys.push(isMac ? '⌘' : 'Ctrl');
	if (alt) keys.push(isMac ? '⌥' : 'Alt');
	if (shift) keys.push(isMac ? '⇧' : 'Shift');
	keys.push(KEY_LABELS[key] ?? key.toUpperCase());

	return keys;
};

/** Compact label for menus and tooltips, e.g. `Ctrl+Shift+Z` or `⇧⌘Z`. */
export const shortcutLabel = (shortcut?: string | string[]): string => {
	const first = Array.isArray(shortcut) ? shortcut[0] : shortcut;
	if (!first) return '';

	const keys = shortcutKeys(first);
	return isMac ? keys.join('') : keys.join('+');
};

/** True when the event comes from somewhere the user is typing. */
export const isEditableTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;

	return (
		target.isContentEditable ||
		['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
		target.closest('.monaco-editor') !== null
	);
};

/** True when a modal surface (dialog, menu, listbox) owns the event. */
export const isOverlayTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;

	return (
		target.closest(
			'[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
		) !== null
	);
};
