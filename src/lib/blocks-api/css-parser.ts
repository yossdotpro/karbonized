/**
 * CSS parser for HTML Block
 * Extracts CSS variables from :root selector and determines their types
 */

export interface CSSVariable {
	name: string;
	type: 'color' | 'number' | 'boolean' | 'string' | 'shadow';
	value: string | number | boolean;
	min?: number;
	max?: number;
	step?: number;
	description?: string;
	unit?: string; // CSS unit like 'px', 'em', 'rem', '%', etc.
}

// Helper function to parse shadow values
const isShadowValue = (value: string): boolean => {
	// Check if value looks like a CSS shadow
	const shadowPattern =
		/^(inset\s+)?([a-f0-9#]+|rgba?\([^)]+\)|\w+)\s+(-?\d+px)\s+(-?\d+px)\s+(\d+px)\s+(\d+px)$/i;
	return shadowPattern.test(value) || value === 'none';
};

// Helper function to parse numeric values with units
const parseNumericValue = (value: string) => {
	const numericRegex =
		/^(-?\d*\.?\d+)(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|in|cm|mm|pt|pc)?$/;
	const match = value.match(numericRegex);

	if (match) {
		const number = parseFloat(match[1]);
		const unit = match[2] || 'px'; // Default to px if no unit specified
		return { number, unit, originalValue: value };
	}

	return null;
};

// Parse type annotation from comment
const parseTypeAnnotation = (comment: string): Partial<CSSVariable> | null => {
	const typeMatch = comment.match(/@type:(\w+)/);
	if (!typeMatch) return null;

	const type = typeMatch[1] as CSSVariable['type'];
	const result: Partial<CSSVariable> = { type };

	// Parse additional parameters
	const minMatch = comment.match(/min:(\s*[\d.]+)/);
	if (minMatch) result.min = parseFloat(minMatch[1]);

	const maxMatch = comment.match(/max:(\s*[\d.]+)/);
	if (maxMatch) result.max = parseFloat(maxMatch[1]);

	const stepMatch = comment.match(/step:(\s*[\d.]+)/);
	if (stepMatch) result.step = parseFloat(stepMatch[1]);

	const unitMatch = comment.match(/unit:(\s*\w+)/);
	if (unitMatch) result.unit = unitMatch[1].trim();

	return result;
};

export const parseCSSVariables = (css: string): CSSVariable[] => {
	const variables: CSSVariable[] = [];
	const rootRegex = /:root\s*{([^}]*)}/g;
	const match = rootRegex.exec(css);

	if (match) {
		const varsContent = match[1];
		// Match variables with optional preceding comment
		const varRegex =
			/(?:\/\*\s*([^*]+)\*\/\s*)?--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
		let varMatch;

		while ((varMatch = varRegex.exec(varsContent)) !== null) {
			const comment = varMatch[1]?.trim() || '';
			const name = varMatch[2];
			const value = varMatch[3].trim();

			// Check for explicit type annotation in comment first
			const annotation = parseTypeAnnotation(comment);
			let type: CSSVariable['type'] = 'string';
			let parsedValue: string | number | boolean = value;
			let min, max, step, unit;

			if (annotation) {
				// Use explicit annotation
				type = annotation.type!;
				min = annotation.min;
				max = annotation.max;
				step = annotation.step;
				unit = annotation.unit;

				// Parse value based on annotated type
				switch (type) {
					case 'color':
						parsedValue = value.startsWith('#') ? value : `#${value}`;
						break;
					case 'number': {
						const numericParse = parseNumericValue(value);
						if (numericParse) {
							parsedValue = numericParse.number;
							unit = unit || numericParse.unit;
						}
						break;
					}
					case 'boolean':
						parsedValue = value === 'true';
						break;
					case 'shadow':
						parsedValue = value;
						break;
					default:
						parsedValue = value;
				}
			} else {
				// Fallback to automatic detection based on naming conventions.
				// (Assigns the outer variables; redeclaring them here used to shadow
				// them, so every unannotated variable ended up as a string.)
				if (
					name.includes('color') ||
					/^#[0-9a-fA-F]{6}$/.test(value) ||
					/^#[0-9a-fA-F]{3}$/.test(value)
				) {
					type = 'color';
					parsedValue = value.startsWith('#') ? value : `#${value}`;
				} else if (
					name.includes('size') ||
					name.includes('width') ||
					name.includes('height') ||
					name.includes('spacing') ||
					name.includes('padding') ||
					name.includes('margin') ||
					name.includes('radius')
				) {
					const numericParse = parseNumericValue(value);
					if (numericParse) {
						type = 'number';
						parsedValue = numericParse.number;
						min = 0;
						max =
							numericParse.unit === '%'
								? 100
								: numericParse.unit === 'em' || numericParse.unit === 'rem'
									? 10
									: 200;
						step =
							numericParse.unit === '%'
								? 1
								: numericParse.unit === 'em' || numericParse.unit === 'rem'
									? 0.1
									: 1;
						unit = numericParse.unit;
					}
				} else if (
					name.includes('show') ||
					name.includes('enable') ||
					name.includes('visible')
				) {
					type = 'boolean';
					parsedValue = value === 'true';
				} else if (
					name.includes('shadow') ||
					name.includes('drop-shadow') ||
					name.includes('box-shadow') ||
					name.includes('text-shadow')
				) {
					type = 'shadow';
					parsedValue = value;
				} else {
					// Try to parse as numeric with units for any remaining numeric values
					const numericParse = parseNumericValue(value);
					if (numericParse) {
						type = 'number';
						parsedValue = numericParse.number;
						min = 0;
						max =
							numericParse.unit === '%'
								? 100
								: numericParse.unit === 'em' || numericParse.unit === 'rem'
									? 10
									: 1000;
						step =
							numericParse.unit === '%'
								? 1
								: numericParse.unit === 'em' || numericParse.unit === 'rem'
									? 0.1
									: 1;
						unit = numericParse.unit;
					}
				}
			}

			// Add unit information for numeric variables if not already set
			if (type === 'number' && !unit) {
				const numericParse = parseNumericValue(value);
				unit = numericParse ? numericParse.unit : 'px';
			}

			variables.push({
				name,
				type,
				value: parsedValue,
				min,
				max,
				step,
				unit,
				description: `CSS variable --${name}`,
			});
		}
	}

	return variables;
};

export const updateCSSVariable = (
	cssContent: string,
	varName: string,
	newValue: string | number | boolean,
	variables: CSSVariable[],
): string => {
	// Find the variable to get its unit information
	const variable = variables.find((v) => v.name === varName);
	let valueWithUnit = newValue;

	// Add unit back for numeric variables
	if (
		variable &&
		variable.type === 'number' &&
		variable.unit &&
		typeof newValue === 'number'
	) {
		valueWithUnit = `${newValue}${variable.unit}`;
	}

	const varRegex = new RegExp(`(--${varName}\\s*:\\s*)([^;]+);`);
	const newCSS = cssContent.replace(varRegex, `$1${valueWithUnit};`);
	return newCSS;
};

export const scopeCSS = (css: string, scopeSelector: string): string => {
	return css
		.replace(/([^\r\n,{}]+)(?=[^{}]*{)/g, (match) => {
			const trimmed = match.trim();
			if (trimmed.startsWith('@') || trimmed.startsWith(':root')) return match;
			return `${scopeSelector} ${trimmed}`;
		})
		.replace(/:root/g, scopeSelector);
};
