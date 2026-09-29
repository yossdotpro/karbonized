/**
 * What every HTML block Agent or an MCP client writes must have: its look in
 * annotated CSS variables and its content in JS variables, so the user can
 * change both from the properties panel. `add_block`, `update_block` and
 * `update_html_block` refuse code that breaks it, and the error says how to
 * fix it; the model retries in the same turn.
 */

/** A `/* @type:… *\/` annotation on a CSS variable. */
export const CSS_ANNOTATION =
	/\/\*\s*@type:\s*(color|number|shadow|boolean|icon|string)\b/g;

/** A `// @var name:type = value` line, with its raw value. */
const JS_VARIABLE =
	/^\s*\/\/\s*@var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(string|number|boolean|color|gradient|url|object|array|image|file)(?:\s*=\s*(.+))?$/;

interface DeclaredVariable {
	name: string;
	type: string;
	value?: string;
}

const declaredVariables = (js: string): DeclaredVariable[] =>
	js.split(/\r?\n/).flatMap((line) => {
		const match = line.match(JS_VARIABLE);
		return match
			? [{ name: match[1], type: match[2], value: match[3]?.trim() }]
			: [];
	});

/** The variable is declared again by the script, which then fails to run. */
const redeclares = (js: string, name: string): boolean =>
	new RegExp(
		`(?:^|[^.\\w$])(?:const|let|var|function)\\s+${name.replace(/\$/g, '\\$')}\\b`,
		'm',
	).test(
		// Only the code: the `// @var` lines themselves are comments.
		js
			.split(/\r?\n/)
			.filter((line) => !JS_VARIABLE.test(line))
			.join('\n'),
	);

const isJson = (value: string): boolean => {
	try {
		JSON.parse(value);
		return true;
	} catch {
		return false;
	}
};

const isListOfStrings = (value: unknown): boolean =>
	Array.isArray(value) && value.every((item) => typeof item === 'string');

export const htmlBlockContractErrors = ({
	html,
	css,
	js,
}: {
	html?: string;
	css?: string;
	js?: string;
}): string[] => {
	const errors: string[] = [];

	if (!html?.trim()) {
		errors.push(
			'html is missing. Give the markup of the component, with empty containers the script fills from its // @var variables.',
		);
	}

	if (!css?.trim()) {
		errors.push(
			'css is missing. Every HTML block needs css that starts with a :root { } block of annotated variables (/* @type:color */ --accent: #f43f5e; …) and uses them with var(--…).',
		);
	} else if ((css.match(CSS_ANNOTATION)?.length ?? 0) === 0) {
		errors.push(
			'The css declares no annotated :root variables. Start it with :root { } listing the colors, sizes, radius, shadow and icon of the component, each with its annotation on the line above (/* @type:color */ --accent: #f43f5e;), and use them with var(--…).',
		);
	}

	const variables = declaredVariables(js ?? '');
	if (!js?.trim()) {
		errors.push(
			'js is missing. Every HTML block needs js that declares its content as // @var lines (// @var title:string = "Weekly signups", // @var items:array = ["A", "B"]) and renders them into the HTML, so the user edits the content from the panel.',
		);
	} else if (variables.length === 0) {
		errors.push(
			'The js declares no // @var variables. Declare the content of the component (labels, values, lists) as // @var name:type = value lines and render them into the HTML with textContent.',
		);
	}

	variables.forEach(({ name, type, value }) => {
		if (redeclares(js ?? '', name)) {
			errors.push(
				`The js declares ${name} again: the // @var line already defines it for the script (let ${name} = …), and declaring it twice stops the script. Use ${name} directly, or give the derived value another name.`,
			);
		}
		if ((type === 'array' || type === 'object') && value !== undefined) {
			const example =
				type === 'array' ? '["Mon: 42", "Tue: 68"]' : '{"label": "Users"}';
			if (!isJson(value)) {
				errors.push(
					`The value of ${name} is not valid JSON: write it on one line with double quotes and nothing after it, e.g. // @var ${name}:${type} = ${example}`,
				);
			} else if (type === 'array' && !isListOfStrings(JSON.parse(value))) {
				errors.push(
					`${name} must be a list of strings (the panel edits each item as text): encode pairs as "Mon: 42" and split them in the script, e.g. // @var ${name}:array = ${example}`,
				);
			}
		}
	});

	return errors;
};
