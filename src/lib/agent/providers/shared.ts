import { tryParseJson } from '../core/sse';

/** Join a base URL (with or without a trailing slash) and a path. */
export const joinUrl = (baseUrl: string, path: string): string =>
	`${baseUrl.trim().replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

/**
 * Parse streamed tool arguments. Models occasionally send nothing for tools
 * without arguments; invalid JSON is kept as text so validation can report it.
 */
export const parseToolArgs = (json: string): unknown => {
	if (json.trim() === '') return {};
	const parsed = tryParseJson(json);
	return parsed === undefined ? json : parsed;
};

let counter = 0;

/** Tool call id for providers and servers that don't send one. */
export const createCallId = (): string => {
	counter += 1;
	return `call_${Date.now().toString(36)}_${counter}`;
};
