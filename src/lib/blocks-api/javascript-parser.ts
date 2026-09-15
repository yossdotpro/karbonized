/**
 * JavaScript parser for HTML Block custom actions
 * Extracts setup code and action definitions from JavaScript content
 */

export interface JavaScriptAction {
	id: string;
	label: string;
	code: string;
}

export interface JSVariable {
	id: string;
	name: string;
	type:
		| 'string'
		| 'number'
		| 'boolean'
		| 'color'
		| 'gradient'
		| 'url'
		| 'object'
		| 'array'
		| 'image'
		| 'file';
	value: string | number | boolean | object;
	defaultValue?: string | number | boolean | object;
	description?: string;
	min?: number;
	max?: number;
	step?: number;
	options?: string[]; // for select-like variables
	accept?: string[]; // for file types: e.g., ['image/*', '.pdf', '.txt']
	multiple?: boolean; // for multiple file selection
	maxSize?: number; // max file size in bytes
}

export interface ParsedJavaScript {
	setupCode: string;
	actions: JavaScriptAction[];
	variables: JSVariable[];
	functions: string[]; // function names that can be called
}

// Regex patterns for JS variable detection
const jsVariableRegex =
	/\/\/\s*@var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(string|number|boolean|color|gradient|url|object|array|image|file)(?:\s*=\s*([^\n]+))?/g;
const jsFunctionRegex =
	/(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:function\s*)?\([^)]*\)\s*=>|function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;

export const parseJavaScript = (js: string): ParsedJavaScript => {
	const lines = js.split(/\r?\n/);
	const setupLines: string[] = [];
	const actions: JavaScriptAction[] = [];
	const variables: JSVariable[] = [];
	const functions: string[] = [];
	const actionMarkerRegex = /^\s*\/\/\s*@action:(.+?)\s*$/;

	let currentAction: JavaScriptAction | null = null;
	let actionIndex = 0;

	// First pass: extract variables and functions
	for (const line of lines) {
		// Extract JS variables
		jsVariableRegex.lastIndex = 0;
		const varMatch = jsVariableRegex.exec(line);
		if (varMatch) {
			const name = varMatch[1];
			const type = varMatch[2] as JSVariable['type'];
			const defaultValue = varMatch[3]?.trim();

			let parsedValue: any = defaultValue || getDefaultValueForType(type);

			// Parse the default value based on type
			if (defaultValue) {
				parsedValue = parseJSValue(defaultValue, type);
			}

			variables.push({
				id: `jsvar_${name}`,
				name,
				type,
				value: parsedValue,
				defaultValue: parsedValue,
				description: `JavaScript variable ${name}`,
			});
		}

		// Extract function names
		jsFunctionRegex.lastIndex = 0;
		const funcMatch = jsFunctionRegex.exec(line);
		if (funcMatch) {
			const funcName = funcMatch[1] || funcMatch[2];
			if (funcName && !functions.includes(funcName)) {
				functions.push(funcName);
			}
		}
	}

	// Second pass: extract actions (existing logic)
	for (const line of lines) {
		const actionMatch = line.match(actionMarkerRegex);

		if (actionMatch) {
			if (currentAction) {
				currentAction.code = currentAction.code.trim();
				actions.push(currentAction);
			}

			const label = actionMatch[1].trim();
			currentAction = {
				id: `action_${actionIndex}_${
					label
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/(^-|-$)/g, '') || 'custom'
				}`,
				label,
				code: '',
			};
			actionIndex += 1;
			continue;
		}

		if (currentAction) {
			currentAction.code += `${line}\n`;
		} else {
			setupLines.push(line);
		}
	}

	if (currentAction) {
		currentAction.code = currentAction.code.trim();
		actions.push(currentAction);
	}

	return {
		setupCode: setupLines.join('\n').trim(),
		actions,
		variables,
		functions,
	};
};

export interface ActionScope {
	label: string;
	/** 1-based line of the `// @action:` marker. */
	markerLine: number;
	/** First and last line of code that runs with the action (0 when empty). */
	startLine: number;
	endLine: number;
}

/**
 * Where each action's code lives: every line after its `// @action:` marker
 * up to the next marker or the end of the file, ignoring trailing blank lines.
 */
export const getActionScopes = (code: string): ActionScope[] => {
	const lines = code.split(/\r?\n/);
	const scopes: ActionScope[] = [];

	lines.forEach((line, index) => {
		const match = line.match(/^\s*\/\/\s*@action:(.+?)\s*$/);
		if (match) {
			scopes.push({
				label: match[1].trim(),
				markerLine: index + 1,
				startLine: 0,
				endLine: 0,
			});
			return;
		}

		const current = scopes.at(-1);
		if (!current || line.trim() === '') return;

		if (current.startLine === 0) current.startLine = index + 1;
		current.endLine = index + 1;
	});

	return scopes;
};

export const generateActionRegistrations = (
	actions: JavaScriptAction[],
): string => {
	return actions
		.map(
			(action) => `
registerAction("${escapeJavaScriptString(action.id)}", () => {
${action.code}
${generateActionInvocation(action.code)}
});`,
		)
		.join('\n');
};

const generateActionInvocation = (code: string): string => {
	const trimmedCode = code.trim();

	const functionDeclarationMatch = trimmedCode.match(
		/^(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
	);
	if (functionDeclarationMatch) {
		return `\nreturn ${functionDeclarationMatch[1]}();`;
	}

	const assignedFunctionMatch = trimmedCode.match(
		/^(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?(?:function\s*\(|\([^)]*\)\s*=>|[a-zA-Z_$][a-zA-Z0-9_$]*\s*=>)/,
	);
	if (assignedFunctionMatch) {
		return `\nreturn ${assignedFunctionMatch[1]}();`;
	}

	return '';
};

// Helper function to get default value for a type
const getDefaultValueForType = (type: JSVariable['type']) => {
	switch (type) {
		case 'string':
			return '';
		case 'number':
			return 0;
		case 'boolean':
			return false;
		case 'color':
			return '#000000';
		case 'gradient':
			return 'linear-gradient(45deg, #000, #fff)';
		case 'url':
			return '';
		case 'object':
			return {};
		case 'array':
			return [];
		case 'image':
			return '';
		case 'file':
			return '';
		default:
			return null;
	}
};

// Helper function to parse JavaScript values based on type
const parseJSValue = (value: string, type: JSVariable['type']) => {
	try {
		switch (type) {
			case 'number': {
				const num = parseFloat(value);
				return isNaN(num) ? 0 : num;
			}
			case 'boolean':
				return value.toLowerCase() === 'true';
			case 'object':
			case 'array':
				return JSON.parse(value);
			case 'color':
			case 'gradient':
			case 'url':
			case 'string':
			default:
				// Values written by the editor are JSON strings (escaped quotes and
				// newlines); hand-written ones may use plain or single quotes.
				if (/^".*"$/.test(value)) {
					try {
						return JSON.parse(value);
					} catch {
						/* fall through to stripping the quotes */
					}
				}
				return value.replace(/^['"]|['"]$/g, '');
		}
	} catch {
		return getDefaultValueForType(type);
	}
};

// Helper function to escape JavaScript strings
export const escapeJavaScriptString = (value: string): string =>
	JSON.stringify(value).slice(1, -1);

/**
 * Name given to compiled block scripts in stack traces, so errors thrown later
 * (timers, event listeners, promises) can be traced back to the block.
 */
export const BLOCK_SCRIPT_URL = 'karbonized-block.js';

export const generateCompiledSource = (
	parsedJavaScript: ParsedJavaScript,
	actionRegistrations: string,
): string => {
	// Generate variable declarations
	const variableDeclarations = parsedJavaScript.variables
		.map((variable) => {
			const value = formatJSValue(variable.value, variable.type);
			return `let ${variable.name} = ${value};`;
		})
		.join('\n');

	return `
const htmlBlockAPI = window.htmlBlockAPI;
const registerAction = htmlBlockAPI.registerAction;
const document = htmlBlockAPI.document;
const globalDocument = htmlBlockAPI.globalDocument;
const root = htmlBlockAPI.root;
const host = htmlBlockAPI.host;
const shadowRoot = htmlBlockAPI.shadowRoot;
const safeQuerySelector = window.safeQuerySelector;

// Enhanced logging functions
const log = htmlBlockAPI.log;
const warn = htmlBlockAPI.warn;
const error = htmlBlockAPI.error;

// JavaScript Variables
${variableDeclarations}

${parsedJavaScript.setupCode}

${actionRegistrations}
//# sourceURL=${BLOCK_SCRIPT_URL}
`;
};

// Helper function to format JavaScript values
const formatJSValue = (value: any, type: JSVariable['type']): string => {
	switch (type) {
		case 'string':
		case 'color':
		case 'gradient':
		case 'url':
		case 'image':
		case 'file':
			// JSON keeps quotes and newlines valid both in code and on the
			// single-line `// @var` annotation.
			return JSON.stringify(String(value ?? ''));
		case 'number':
			return String(value);
		case 'boolean':
			return String(value);
		case 'object':
		case 'array':
			return JSON.stringify(value);
		default:
			return JSON.stringify(String(value ?? ''));
	}
};

// Function to update JS variable in the code
export const updateJSVariable = (
	jsContent: string,
	varName: string,
	newValue: any,
	variables: JSVariable[],
): string => {
	const variable = variables.find((v) => v.name === varName);
	if (!variable) return jsContent;

	const formattedValue = formatJSValue(newValue, variable.type);
	const varRegex = new RegExp(
		`(\\/\\/\\s*@var\\s+${varName}\\s*:\\s*${variable.type})(?:\\s*=\\s*[^\\n]+)?`,
		'g',
	);

	return jsContent.replace(varRegex, `$1 = ${formattedValue}`);
};
