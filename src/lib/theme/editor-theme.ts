import type { Monaco } from '@monaco-editor/react';

/**
 * Monaco themes that match the app design tokens defined in `src/input.css`.
 *
 * Monaco only accepts hex colors, so the surface colors are mirrored here.
 * If you change a token in `input.css`, update the matching value below so the
 * code editor stays visually part of the app.
 */
export const EDITOR_THEME_DARK = 'karbonized-dark';
export const EDITOR_THEME_LIGHT = 'karbonized-light';

export const editorPalette = {
	dark: {
		background: '#0f0f11',
		foreground: '#e6e6e9',
		sidebar: '#131316',
		popover: '#18181b',
		muted: '#1c1c20',
		accent: '#222226',
		border: '#242428',
		mutedForeground: '#8b8b94',
	},
	light: {
		background: '#fbfbfc',
		foreground: '#1b1b1f',
		sidebar: '#f5f5f7',
		popover: '#ffffff',
		muted: '#f0f0f2',
		accent: '#ebebee',
		border: '#e4e4e8',
		mutedForeground: '#6e6e78',
	},
} as const;

const syntax = {
	dark: {
		comment: '5f5f69',
		keyword: 'c4a7e7',
		string: 'a6d4a0',
		number: 'f0b27a',
		type: 'e9c46a',
		function: '8fb8f2',
		tag: '8fb8f2',
		attribute: 'c4a7e7',
		property: '9ccfd8',
		delimiter: '7a7a84',
		variable: 'e6e6e9',
		regexp: 'e8918f',
	},
	light: {
		comment: '9a9aa3',
		keyword: '7c3fb5',
		string: '2e7d3a',
		number: 'b35b12',
		type: '8a6200',
		function: '1f5fbf',
		tag: '1f5fbf',
		attribute: '7c3fb5',
		property: '0e7490',
		delimiter: '7a7a84',
		variable: '1b1b1f',
		regexp: 'b42f2f',
	},
} as const;

const buildRules = (c: (typeof syntax)['dark' | 'light']) => [
	{ token: '', foreground: c.variable },
	{ token: 'comment', foreground: c.comment, fontStyle: 'italic' },
	{ token: 'keyword', foreground: c.keyword },
	{ token: 'keyword.control', foreground: c.keyword },
	{ token: 'storage', foreground: c.keyword },
	{ token: 'string', foreground: c.string },
	{ token: 'string.escape', foreground: c.number },
	{ token: 'number', foreground: c.number },
	{ token: 'regexp', foreground: c.regexp },
	{ token: 'type', foreground: c.type },
	{ token: 'type.identifier', foreground: c.type },
	{ token: 'identifier', foreground: c.variable },
	{ token: 'variable', foreground: c.property },
	{ token: 'variable.predefined', foreground: c.function },
	{ token: 'predefined', foreground: c.function },
	{ token: 'delimiter', foreground: c.delimiter },
	{ token: 'delimiter.bracket', foreground: c.delimiter },
	{ token: 'operator', foreground: c.delimiter },
	// HTML
	{ token: 'tag', foreground: c.tag },
	{ token: 'metatag', foreground: c.keyword },
	{ token: 'attribute.name', foreground: c.attribute },
	{ token: 'attribute.value', foreground: c.string },
	{ token: 'delimiter.html', foreground: c.delimiter },
	// CSS
	{ token: 'attribute.name.css', foreground: c.property },
	{ token: 'attribute.value.css', foreground: c.string },
	{ token: 'attribute.value.number.css', foreground: c.number },
	{ token: 'attribute.value.unit.css', foreground: c.number },
	{ token: 'attribute.value.hex.css', foreground: c.number },
	{ token: 'tag.css', foreground: c.tag },
	{ token: 'keyword.css', foreground: c.keyword },
	{ token: 'variable.css', foreground: c.property },
];

let registered = false;

export const registerEditorThemes = (monaco: Monaco): void => {
	if (registered) return;
	registered = true;

	const d = editorPalette.dark;
	monaco.editor.defineTheme(EDITOR_THEME_DARK, {
		base: 'vs-dark',
		inherit: true,
		rules: buildRules(syntax.dark),
		colors: {
			'editor.background': d.background,
			'editor.foreground': d.foreground,
			'editorGutter.background': d.background,
			'editor.lineHighlightBackground': '#16161a',
			'editor.lineHighlightBorder': '#00000000',
			'editor.selectionBackground': '#3b3f52',
			'editor.inactiveSelectionBackground': '#2a2c36',
			'editor.selectionHighlightBackground': '#ffffff12',
			'editor.wordHighlightBackground': '#ffffff10',
			'editor.findMatchBackground': '#6b5a2a',
			'editor.findMatchHighlightBackground': '#6b5a2a66',
			'editorCursor.foreground': d.foreground,
			'editorLineNumber.foreground': '#45454d',
			'editorLineNumber.activeForeground': '#a1a1aa',
			'editorIndentGuide.background1': '#1f1f24',
			'editorIndentGuide.activeBackground1': '#34343b',
			'editorWhitespace.foreground': '#2c2c32',
			'editorBracketMatch.background': '#ffffff0d',
			'editorBracketMatch.border': '#ffffff33',
			'editorRuler.foreground': d.border,
			'editorOverviewRuler.border': '#00000000',
			'editorWidget.background': d.popover,
			'editorWidget.border': d.border,
			'editorSuggestWidget.background': d.popover,
			'editorSuggestWidget.border': d.border,
			'editorSuggestWidget.selectedBackground': d.accent,
			'editorHoverWidget.background': d.popover,
			'editorHoverWidget.border': d.border,
			'input.background': d.muted,
			'input.border': d.border,
			focusBorder: '#00000000',
			'list.hoverBackground': d.muted,
			'list.activeSelectionBackground': d.accent,
			'list.focusBackground': d.accent,
			'scrollbar.shadow': '#00000000',
			'scrollbarSlider.background': '#ffffff14',
			'scrollbarSlider.hoverBackground': '#ffffff22',
			'scrollbarSlider.activeBackground': '#ffffff30',
			'widget.shadow': '#00000066',
		},
	});

	const l = editorPalette.light;
	monaco.editor.defineTheme(EDITOR_THEME_LIGHT, {
		base: 'vs',
		inherit: true,
		rules: buildRules(syntax.light),
		colors: {
			'editor.background': l.background,
			'editor.foreground': l.foreground,
			'editorGutter.background': l.background,
			'editor.lineHighlightBackground': '#f3f3f5',
			'editor.lineHighlightBorder': '#00000000',
			'editor.selectionBackground': '#d6dbeb',
			'editor.inactiveSelectionBackground': '#e6e8f0',
			'editor.selectionHighlightBackground': '#0000000d',
			'editor.wordHighlightBackground': '#0000000a',
			'editorCursor.foreground': l.foreground,
			'editorLineNumber.foreground': '#b4b4bc',
			'editorLineNumber.activeForeground': '#52525b',
			'editorIndentGuide.background1': '#ececef',
			'editorIndentGuide.activeBackground1': '#d4d4d8',
			'editorWhitespace.foreground': '#dcdce0',
			'editorBracketMatch.background': '#0000000a',
			'editorBracketMatch.border': '#00000030',
			'editorRuler.foreground': l.border,
			'editorOverviewRuler.border': '#00000000',
			'editorWidget.background': l.popover,
			'editorWidget.border': l.border,
			'editorSuggestWidget.background': l.popover,
			'editorSuggestWidget.border': l.border,
			'editorSuggestWidget.selectedBackground': l.accent,
			'editorHoverWidget.background': l.popover,
			'editorHoverWidget.border': l.border,
			'input.background': l.popover,
			'input.border': l.border,
			focusBorder: '#00000000',
			'list.hoverBackground': l.muted,
			'list.activeSelectionBackground': l.accent,
			'list.focusBackground': l.accent,
			'scrollbar.shadow': '#00000000',
			'scrollbarSlider.background': '#0000001a',
			'scrollbarSlider.hoverBackground': '#00000029',
			'scrollbarSlider.activeBackground': '#00000038',
			'widget.shadow': '#0000001f',
		},
	});
};
