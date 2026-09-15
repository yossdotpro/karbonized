import { ipcMain, type WebContents } from 'electron';
import { redactSecrets } from '../../src/lib/beedly/core/redact';
import type { HttpBridgeEvent } from '../../src/lib/beedly/bridge';
import type { HttpRequest } from '../../src/lib/beedly/core/types';
import { getKeyFor, hasKey, removeKey, setKey } from './keys';

/**
 * Model provider requests for Beedly, made from the main process: no CORS
 * restrictions, and the API key is added here so the page never sees it.
 */

/** `Omit` applied to each member of a union. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
	? Omit<T, K>
	: never;

type EventWithoutId = DistributiveOmit<HttpBridgeEvent, 'requestId'>;

const isHttpRequest = (value: unknown): value is HttpRequest => {
	const request = value as HttpRequest;
	return (
		typeof request === 'object' &&
		request !== null &&
		typeof request.url === 'string' &&
		/^https?:\/\//i.test(request.url) &&
		(request.method === 'GET' || request.method === 'POST') &&
		typeof request.headers === 'object' &&
		Object.values(request.headers).every(
			(value) => typeof value === 'string',
		) &&
		(request.body === undefined || typeof request.body === 'string') &&
		(request.auth === undefined || typeof request.auth.header === 'string')
	);
};

const describeFetchError = (error: unknown): string => {
	if (!(error instanceof Error)) return String(error);
	// undici hides the reason (ECONNREFUSED, ENOTFOUND…) in `cause`.
	const cause = (
		error as Error & { cause?: { code?: string; message?: string } }
	).cause;
	return [error.message, cause?.code ?? cause?.message]
		.filter(Boolean)
		.join(': ');
};

export const registerBeedlyHttp = () => {
	const controllers = new Map<string, AbortController>();

	ipcMain.handle('beedly:keys:set', (_event, profileId, key, baseUrl) =>
		setKey(profileId, key, baseUrl),
	);
	ipcMain.handle('beedly:keys:remove', (_event, profileId) =>
		removeKey(profileId),
	);
	ipcMain.handle('beedly:keys:has', (_event, profileId, baseUrl) =>
		hasKey(profileId, baseUrl),
	);

	ipcMain.on(
		'beedly:http:request',
		async (event, requestId: unknown, profileId: unknown, request: unknown) => {
			const sender: WebContents = event.sender;
			if (typeof requestId !== 'string') return;

			const send = (message: EventWithoutId) => {
				if (!sender.isDestroyed()) {
					sender.send('beedly:http:event', { requestId, ...message });
				}
			};

			if (!isHttpRequest(request)) {
				send({ type: 'error', message: 'Invalid request.' });
				return;
			}

			const controller = new AbortController();
			controllers.set(requestId, controller);
			let key: string | undefined;

			try {
				const headers = { ...request.headers };
				if (request.auth) {
					key = await getKeyFor(profileId, request.url);
					if (key) {
						headers[request.auth.header] = request.auth.scheme
							? `${request.auth.scheme} ${key}`
							: key;
					}
				}

				const response = await fetch(request.url, {
					method: request.method,
					headers,
					body: request.body,
					signal: controller.signal,
				});
				send({ type: 'response', status: response.status, ok: response.ok });

				if (response.body) {
					const decoder = new TextDecoder();
					for await (const bytes of response.body as unknown as AsyncIterable<Uint8Array>) {
						const chunk = decoder.decode(bytes, { stream: true });
						if (chunk !== '') send({ type: 'chunk', chunk });
					}
					const rest = decoder.decode();
					if (rest !== '') send({ type: 'chunk', chunk: rest });
				}
				send({ type: 'end' });
			} catch (error) {
				send({
					type: 'error',
					aborted: controller.signal.aborted,
					message: redactSecrets(describeFetchError(error), key ? [key] : []),
				});
			} finally {
				controllers.delete(requestId);
			}
		},
	);

	ipcMain.on('beedly:http:abort', (_event, requestId: unknown) => {
		if (typeof requestId === 'string') controllers.get(requestId)?.abort();
	});
};
