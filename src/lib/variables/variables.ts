/**
 * Project variables: the slots of a template.
 *
 * A workspace holds a list of named values (a title, a code sample, a
 * date…). Blocks write `{{name}}` in their text and show the value instead,
 * so the content changes without touching the design. The stored text keeps
 * the placeholder; only what the block shows (and exports) is resolved.
 */

export type VariableKind = 'text' | 'multiline' | 'date';
export type DateFormat = 'long' | 'medium' | 'short' | 'iso';

export interface ProjectVariable {
	/** Written as `{{name}}` in blocks. */
	name: string;
	kind: VariableKind;
	/** Dates: `YYYY-MM-DD`, or `today` for the day the image is made. */
	value: string;
	/** Shown in the panel instead of the name. */
	label?: string;
	/** Dates only (default `long`). */
	format?: DateFormat;
}

export const VARIABLE_KINDS: VariableKind[] = ['text', 'multiline', 'date'];
export const DATE_FORMATS: DateFormat[] = ['long', 'medium', 'short', 'iso'];
export const TODAY = 'today';
export const MAX_VARIABLES = 50;
export const MAX_VARIABLE_VALUE = 20_000;

export const VARIABLE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/;
const REFERENCE_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_-]{0,39})\s*\}\}/g;

/** Block properties that may hold `{{name}}` references. */
export const VARIABLE_PROPERTY_KEYS = [
	'text',
	'code',
	'wintitle',
	'title',
	'url',
	'html',
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const localDate = (value: string, now: Date): Date | null => {
	if (value.trim().toLowerCase() === TODAY) return now;
	const match = ISO_DATE.exec(value.trim());
	if (!match) return null;
	const date = new Date(
		Number(match[1]),
		Number(match[2]) - 1,
		Number(match[3]),
	);
	return Number.isNaN(date.getTime()) ? null : date;
};

const pad = (number: number) => String(number).padStart(2, '0');

export const formatDate = (
	value: string,
	format: DateFormat = 'long',
	{ locale, now = new Date() }: { locale?: string; now?: Date } = {},
): string => {
	const date = localDate(value, now);
	if (!date) return value;
	if (format === 'iso') {
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	}
	try {
		return new Intl.DateTimeFormat(locale, { dateStyle: format }).format(date);
	} catch {
		return new Intl.DateTimeFormat(undefined, { dateStyle: format }).format(
			date,
		);
	}
};

/** What a variable shows. */
export const variableText = (
	variable: ProjectVariable,
	options: { locale?: string; now?: Date } = {},
): string =>
	variable.kind === 'date'
		? formatDate(variable.value, variable.format, options)
		: variable.value;

export const escapeHtml = (text: string): string =>
	text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

/**
 * Replace `{{name}}` with the value of each variable. Unknown names stay as
 * they are, so a missing variable is visible instead of silently empty.
 */
export const resolveVariables = (
	text: string,
	variables: readonly ProjectVariable[] | undefined,
	options: {
		/** Applied to each value, e.g. `escapeHtml` for markup. */
		escape?: (value: string) => string;
		locale?: string;
		now?: Date;
	} = {},
): string => {
	if (!variables?.length || !text.includes('{{')) return text;
	const byName = new Map(variables.map((item) => [item.name, item]));
	return text.replace(REFERENCE_PATTERN, (match, name: string) => {
		const variable = byName.get(name);
		if (!variable) return match;
		const value = variableText(variable, options);
		return options.escape ? options.escape(value) : value;
	});
};

/** The variable names a text refers to, in order, without repeats. */
export const variableReferences = (text: string): string[] => [
	...new Set(Array.from(text.matchAll(REFERENCE_PATTERN), (match) => match[1])),
];

/** Keep only well-formed variables with unique names (from files and tools). */
export const normalizeVariables = (value: unknown): ProjectVariable[] => {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const result: ProjectVariable[] = [];

	for (const item of value) {
		if (typeof item !== 'object' || item === null) continue;
		const raw = item as Partial<ProjectVariable>;
		if (
			typeof raw.name !== 'string' ||
			!VARIABLE_NAME_PATTERN.test(raw.name) ||
			seen.has(raw.name)
		) {
			continue;
		}
		seen.add(raw.name);
		const kind = VARIABLE_KINDS.includes(raw.kind as VariableKind)
			? (raw.kind as VariableKind)
			: 'text';
		result.push({
			name: raw.name,
			kind,
			value:
				typeof raw.value === 'string'
					? raw.value.slice(0, MAX_VARIABLE_VALUE)
					: '',
			...(typeof raw.label === 'string' &&
				raw.label.trim() && { label: raw.label.trim().slice(0, 60) }),
			...(kind === 'date' &&
				DATE_FORMATS.includes(raw.format as DateFormat) && {
					format: raw.format,
				}),
		});
		if (result.length === MAX_VARIABLES) break;
	}
	return result;
};

/** A readable default name for a new variable (`title`, `title-2`…). */
export const nextVariableName = (
	variables: readonly ProjectVariable[],
	base = 'text',
): string => {
	const taken = new Set(variables.map((item) => item.name));
	if (!taken.has(base)) return base;
	for (let index = 2; ; index++) {
		if (!taken.has(`${base}-${index}`)) return `${base}-${index}`;
	}
};
