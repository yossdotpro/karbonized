import { describe, expect, it } from 'vitest';
import {
	isEditableTarget,
	isOverlayTarget,
	matchesShortcut,
	parseShortcut,
	shortcutKeys,
	shortcutLabel,
} from './shortcuts';

// jsdom reports a non-Mac platform, so `Mod` is Ctrl in these tests.
const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

describe('parseShortcut', () => {
	it('splits modifiers and key', () => {
		expect(parseShortcut('Mod+Shift+Z')).toEqual({
			mod: true,
			shift: true,
			alt: false,
			key: 'z',
		});
		expect(parseShortcut('Alt+1')).toEqual({
			mod: false,
			shift: false,
			alt: true,
			key: '1',
		});
	});
});

describe('matchesShortcut', () => {
	it('matches letters by physical key', () => {
		expect(
			matchesShortcut(key({ key: 'k', code: 'KeyK', ctrlKey: true }), 'Mod+K'),
		).toBe(true);
		// A layout where the key under "K" produces another character.
		expect(
			matchesShortcut(key({ key: 'x', code: 'KeyK', ctrlKey: true }), 'Mod+K'),
		).toBe(true);
	});

	it('falls back to event.key when the code is missing', () => {
		expect(matchesShortcut(key({ key: 'k', ctrlKey: true }), 'Mod+K')).toBe(
			true,
		);
	});

	it('requires the exact modifier set', () => {
		expect(matchesShortcut(key({ key: 'k', code: 'KeyK' }), 'Mod+K')).toBe(
			false,
		);
		expect(
			matchesShortcut(
				key({ key: 'K', code: 'KeyK', ctrlKey: true, shiftKey: true }),
				'Mod+K',
			),
		).toBe(false);
		expect(
			matchesShortcut(
				key({ key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }),
				'Mod+Shift+Z',
			),
		).toBe(true);
	});

	it('does not treat AltGr (Ctrl+Alt) as Mod', () => {
		expect(
			matchesShortcut(
				key({ key: '@', code: 'Digit2', ctrlKey: true, altKey: true }),
				'Mod+2',
			),
		).toBe(false);
	});

	it('matches digits with Shift on any layout', () => {
		expect(
			matchesShortcut(
				key({ key: '!', code: 'Digit1', shiftKey: true }),
				'Shift+1',
			),
		).toBe(true);
	});

	it('matches symbol tokens by character and ignores Shift', () => {
		expect(
			matchesShortcut(
				key({ key: '+', ctrlKey: true, shiftKey: true }),
				'Mod+Plus',
			),
		).toBe(true);
		expect(matchesShortcut(key({ key: '=', ctrlKey: true }), 'Mod+Plus')).toBe(
			true,
		);
		expect(matchesShortcut(key({ key: '-', ctrlKey: true }), 'Mod+Minus')).toBe(
			true,
		);
		expect(matchesShortcut(key({ key: 'Escape' }), 'Escape')).toBe(true);
		expect(
			matchesShortcut(key({ key: 'Enter', ctrlKey: true }), 'Mod+Enter'),
		).toBe(true);
	});
});

describe('shortcut labels', () => {
	it('renders key caps and a compact label', () => {
		expect(shortcutKeys('Mod+Shift+Z')).toEqual(['Ctrl', 'Shift', 'Z']);
		expect(shortcutKeys('Mod+Plus')).toEqual(['Ctrl', '+']);
		expect(shortcutLabel('Mod+Shift+E')).toBe('Ctrl+Shift+E');
		expect(shortcutLabel(['Mod+Shift+Z', 'Mod+Y'])).toBe('Ctrl+Shift+Z');
		expect(shortcutLabel(undefined)).toBe('');
	});
});

describe('target helpers', () => {
	it('detects typing targets', () => {
		const input = document.createElement('input');
		const div = document.createElement('div');
		const monaco = document.createElement('div');
		monaco.className = 'monaco-editor';
		const inner = document.createElement('span');
		monaco.appendChild(inner);

		expect(isEditableTarget(input)).toBe(true);
		expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
		expect(isEditableTarget(inner)).toBe(true);
		expect(isEditableTarget(div)).toBe(false);
		expect(isEditableTarget(null)).toBe(false);
	});

	it('detects open overlays', () => {
		const dialog = document.createElement('div');
		dialog.setAttribute('role', 'dialog');
		const button = document.createElement('button');
		dialog.appendChild(button);

		expect(isOverlayTarget(button)).toBe(true);
		expect(isOverlayTarget(document.createElement('button'))).toBe(false);
	});
});
