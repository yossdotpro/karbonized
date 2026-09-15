// Deep imports from monaco-editor's ESM build (see src/lib/monaco/setup.ts).
// Only some of them ship type declarations, so type them loosely here.
declare module 'monaco-editor/esm/vs/editor/edcore.main.js';
declare module 'monaco-editor/esm/vs/basic-languages/*';
declare module 'monaco-editor/esm/vs/language/*/monaco.contribution.js';
