/**
 * Correlates requests sent to another process (the renderer) with their
 * responses, with a timeout. Used by the Electron main process to run tools
 * in the editor window.
 */

type WithRequestId = { requestId: string };

export class BrokerError extends Error {}

export interface RequestBroker<Request, Response> {
	request: (payload: Request) => Promise<Response>;
	/** Deliver a response; unknown or late responses are ignored. */
	resolve: (response: Response & WithRequestId) => void;
	/** Fail every pending request (e.g. the window closed). */
	rejectAll: (message: string) => void;
	pendingCount: () => number;
}

export const createRequestBroker = <Request, Response>(options: {
	/** Deliver the request; return false when nobody can receive it. */
	send: (request: Request & WithRequestId) => boolean;
	timeoutMs: number;
	unavailableMessage: string;
	timeoutMessage: string;
}): RequestBroker<Request, Response> => {
	const pending = new Map<
		string,
		{
			resolve: (response: Response) => void;
			reject: (error: Error) => void;
			timer: ReturnType<typeof setTimeout>;
		}
	>();
	let sequence = 0;

	return {
		request: (payload) =>
			new Promise<Response>((resolve, reject) => {
				sequence += 1;
				const requestId = `mcp-${sequence}`;

				const timer = setTimeout(() => {
					pending.delete(requestId);
					reject(new BrokerError(options.timeoutMessage));
				}, options.timeoutMs);
				pending.set(requestId, { resolve, reject, timer });

				if (!options.send({ ...payload, requestId })) {
					clearTimeout(timer);
					pending.delete(requestId);
					reject(new BrokerError(options.unavailableMessage));
				}
			}),

		resolve: (response) => {
			const entry = pending.get(response.requestId);
			if (!entry) return;
			clearTimeout(entry.timer);
			pending.delete(response.requestId);
			entry.resolve(response);
		},

		rejectAll: (message) => {
			pending.forEach((entry) => {
				clearTimeout(entry.timer);
				entry.reject(new BrokerError(message));
			});
			pending.clear();
		},

		pendingCount: () => pending.size,
	};
};
