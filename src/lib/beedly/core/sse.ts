export interface ServerSentEvent {
	event?: string;
	data: string;
}

/**
 * Parse a Server-Sent Events stream. Chunks may split lines, and lines may end
 * with `\n`, `\r\n` or `\r`.
 */
export async function* parseSSE(
	chunks: AsyncIterable<string>,
): AsyncGenerator<ServerSentEvent> {
	let buffer = '';
	let event: string | undefined;
	let data: string[] = [];

	const dispatch = (): ServerSentEvent | undefined => {
		if (data.length === 0) {
			event = undefined;
			return undefined;
		}
		const message = { event, data: data.join('\n') };
		event = undefined;
		data = [];
		return message;
	};

	const handleLine = (line: string): ServerSentEvent | undefined => {
		if (line === '') return dispatch();
		if (line.startsWith(':')) return undefined;

		const colon = line.indexOf(':');
		const field = colon === -1 ? line : line.slice(0, colon);
		let value = colon === -1 ? '' : line.slice(colon + 1);
		if (value.startsWith(' ')) value = value.slice(1);

		if (field === 'data') data.push(value);
		else if (field === 'event') event = value;
		return undefined;
	};

	for await (const chunk of chunks) {
		buffer += chunk;

		let match: RegExpExecArray | null;
		const newline = /\r\n|\n|\r/g;
		let start = 0;
		while ((match = newline.exec(buffer)) !== null) {
			// A lone `\r` at the end may be the first half of `\r\n`.
			if (match[0] === '\r' && match.index === buffer.length - 1) break;

			const message = handleLine(buffer.slice(start, match.index));
			if (message) yield message;
			start = match.index + match[0].length;
		}
		buffer = buffer.slice(start);
	}

	if (buffer !== '') {
		const message = handleLine(buffer.replace(/\r$/, ''));
		if (message) yield message;
	}
	const last = dispatch();
	if (last) yield last;
}

/** Parse JSON, or undefined when the text is not JSON. */
export const tryParseJson = (text: string): unknown => {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
};
