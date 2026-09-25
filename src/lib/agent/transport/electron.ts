import type { AgentBridge } from '../bridge';
import { AsyncQueue } from '../core/async-queue';
import { networkError } from '../core/errors';
import type { HttpResponse, Transport } from '../core/types';

let sequence = 0;

const abortError = () =>
	new DOMException('The request was aborted.', 'AbortError');

/**
 * Requests made by the Electron main process: no CORS, and the API key is
 * added there, so it never reaches the page.
 */
export const createElectronTransport =
	(bridge: AgentBridge): Transport =>
	(request, { profileId, signal }) =>
		new Promise<HttpResponse>((resolve, reject) => {
			if (signal?.aborted) {
				reject(abortError());
				return;
			}

			sequence += 1;
			const requestId = `http-${Date.now().toString(36)}-${sequence}`;
			const chunks = new AsyncQueue<string>();
			let responded = false;

			const cleanup = () => {
				unsubscribe();
				signal?.removeEventListener('abort', onAbort);
			};

			const fail = (error: unknown) => {
				cleanup();
				if (responded) chunks.fail(error);
				else reject(error);
			};

			const onAbort = () => {
				bridge.http.abort(requestId);
				fail(abortError());
			};

			const unsubscribe = bridge.http.onEvent((event) => {
				if (event.requestId !== requestId) return;

				switch (event.type) {
					case 'response':
						responded = true;
						resolve({ status: event.status, ok: event.ok, chunks });
						break;
					case 'chunk':
						chunks.push(event.chunk);
						break;
					case 'end':
						cleanup();
						chunks.end();
						break;
					case 'error':
						fail(event.aborted ? abortError() : networkError(event.message));
						break;
				}
			});

			signal?.addEventListener('abort', onAbort, { once: true });
			bridge.http.request(requestId, profileId, request);
		});
