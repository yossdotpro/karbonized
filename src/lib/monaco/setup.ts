/**
 * Bundled Monaco setup.
 *
 * `@monaco-editor/react` loads Monaco from a CDN by default, which breaks the
 * block editor offline (e.g. in the desktop app). Instead we bundle the editor
 * core plus only the languages the block editor needs (HTML, CSS, JavaScript)
 * together with their workers, and hand that instance to the React loader.
 *
 * Import this module once before rendering any `<Editor />`.
 */
import { loader } from '@monaco-editor/react';
import type * as MonacoApi from 'monaco-editor';

import * as monacoCore from 'monaco-editor/esm/vs/editor/edcore.main.js';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js';
import * as cssLanguage from 'monaco-editor/esm/vs/language/css/monaco.contribution.js';
import * as htmlLanguage from 'monaco-editor/esm/vs/language/html/monaco.contribution.js';
import * as typescriptLanguage from 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js';

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker.js?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker.js?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker';

const monaco = monacoCore as unknown as typeof MonacoApi;

// Expose the language namespaces the same way the full `editor.main` does.
Object.assign(monaco.languages, {
	css: cssLanguage,
	html: htmlLanguage,
	typescript: typescriptLanguage,
});

self.MonacoEnvironment = {
	getWorker(_workerId: string, label: string) {
		switch (label) {
			case 'css':
			case 'scss':
			case 'less':
				return new CssWorker();
			case 'html':
			case 'handlebars':
			case 'razor':
				return new HtmlWorker();
			case 'typescript':
			case 'javascript':
				return new TsWorker();
			default:
				return new EditorWorker();
		}
	},
};

loader.config({ monaco });

export { monaco };
