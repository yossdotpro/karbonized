/**
 * HTML Block API - Main export file
 * Provides all the necessary utilities for HTML Block functionality
 */

// Export types and interfaces
export type { CSSVariable } from './css-parser';
export type {
	JavaScriptAction,
	ParsedJavaScript,
	JSVariable,
} from './javascript-parser';
export type { SafeDOMAPI } from './safe-dom';
export type {
	FileInfo,
	FileUploadOptions,
	FileHandlerAPI,
	ImageOptimizationOptions,
} from './file-handler';

// Define CustomAction interface since it's used in HTMLBlock
export interface CustomAction {
	id: string;
	label: string;
	icon?: string;
}

// Export CSS utilities
export { parseCSSVariables, updateCSSVariable, scopeCSS } from './css-parser';

// Export JavaScript utilities
export {
	parseJavaScript,
	generateActionRegistrations,
	generateCompiledSource,
	escapeJavaScriptString,
	updateJSVariable,
} from './javascript-parser';

// Export Safe DOM utilities
export { createSafeDOM } from './safe-dom';

// Export File Handler utilities
export { createFileHandler, fileHandler, fileUtils } from './file-handler';

// Re-export for convenience
export * from './css-parser';
export * from './javascript-parser';
export * from './safe-dom';
export * from './file-handler';
