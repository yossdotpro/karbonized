import type { StreamEvent } from './core/types';

/** Async iterable over text chunks, as a transport would produce. */
export async function* chunksOf(...chunks: string[]): AsyncGenerator<string> {
	for (const chunk of chunks) yield chunk;
}

/** SSE body with one `data:` event per payload. */
export const sseBody = (...payloads: Array<unknown>): string =>
	payloads
		.map(
			(payload) =>
				`data: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n\n`,
		)
		.join('');

/** Split text into chunks of `size` characters to exercise partial lines. */
export const splitEvery = (text: string, size: number): string[] => {
	const chunks: string[] = [];
	for (let index = 0; index < text.length; index += size) {
		chunks.push(text.slice(index, index + size));
	}
	return chunks;
};

export const collect = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
	const items: T[] = [];
	for await (const item of iterable) items.push(item);
	return items;
};

export const doneEvent = (events: StreamEvent[]) => {
	const done = events.find((event) => event.type === 'done');
	if (!done || done.type !== 'done') throw new Error('No done event');
	return done;
};
