import { isAbortError, networkError } from '../core/errors';
import type { HttpRequest, Transport } from '../core/types';

/** Decode a fetch body into text chunks. */
export async function* decodeBody(
	body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<string> {
	if (!body) return;

	const reader = body.getReader();
	const decoder = new TextDecoder();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			const text = decoder.decode(value, { stream: true });
			if (text !== '') yield text;
		}
		const rest = decoder.decode();
		if (rest !== '') yield rest;
	} finally {
		reader.releaseLock();
	}
}

export const withAuthHeader = (
	request: HttpRequest,
	key: string | undefined,
): Record<string, string> => {
	if (!request.auth || !key) return { ...request.headers };
	return {
		...request.headers,
		[request.auth.header]: request.auth.scheme
			? `${request.auth.scheme} ${key}`
			: key,
	};
};

/**
 * Requests straight from the page. Used on the web, Android and Tauri; the
 * provider must allow browser requests (CORS).
 */
export const createBrowserTransport =
	(getKey: (profileId: string) => Promise<string | undefined>): Transport =>
	async (request, { profileId, signal }) => {
		const key = request.auth ? await getKey(profileId) : undefined;

		let response: Response;
		try {
			response = await fetch(request.url, {
				method: request.method,
				headers: withAuthHeader(request, key),
				body: request.body,
				signal,
			});
		} catch (error) {
			if (isAbortError(error)) throw error;
			throw networkError();
		}

		return {
			status: response.status,
			ok: response.ok,
			chunks: decodeBody(response.body),
		};
	};
