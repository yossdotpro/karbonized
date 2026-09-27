import { redactSecrets } from './redact';
import type { HttpResponse } from './types';

export type ProviderErrorKind =
	| 'auth'
	| 'not-found'
	| 'rate-limit'
	| 'overloaded'
	| 'bad-request'
	| 'network'
	| 'server'
	| 'stream';

/** A failed provider request, with a message safe to show to the user. */
export class ProviderError extends Error {
	constructor(
		readonly kind: ProviderErrorKind,
		message: string,
		readonly status?: number,
	) {
		super(redactSecrets(message));
		this.name = 'ProviderError';
	}
}

export const isAbortError = (error: unknown): boolean =>
	(error instanceof DOMException || error instanceof Error) &&
	error.name === 'AbortError';

export const readBody = async (response: HttpResponse): Promise<string> => {
	let body = '';
	for await (const chunk of response.chunks) body += chunk;
	return body;
};

const kindForStatus = (status: number): ProviderErrorKind => {
	if (status === 401 || status === 403) return 'auth';
	if (status === 404) return 'not-found';
	if (status === 429) return 'rate-limit';
	if (status === 529 || status === 503) return 'overloaded';
	if (status >= 400 && status < 500) return 'bad-request';
	return 'server';
};

const FALLBACK_MESSAGES: Record<ProviderErrorKind, string> = {
	auth: 'The API key was rejected. Check it in Agent settings.',
	'not-found':
		'The endpoint or model was not found. Check the base URL and model.',
	'rate-limit': 'Rate limit reached. Wait a moment and try again.',
	overloaded: 'The provider is overloaded. Try again in a moment.',
	'bad-request': 'The provider rejected the request.',
	network: 'Could not reach the provider.',
	server: 'The provider had an error. Try again.',
	stream: 'The response stream was interrupted.',
};

export const errorFromResponse = (
	status: number,
	body: string,
	parse: (body: string) => string | undefined,
): ProviderError => {
	const kind = kindForStatus(status);
	const detail = parse(body)?.trim();
	return new ProviderError(
		kind,
		detail
			? `${detail} (HTTP ${status})`
			: `${FALLBACK_MESSAGES[kind]} (HTTP ${status})`,
		status,
	);
};

/** `fetch` rejects with a bare TypeError on CORS, DNS or offline failures. */
export const networkError = (hint?: string): ProviderError =>
	new ProviderError(
		'network',
		[FALLBACK_MESSAGES.network, hint].filter(Boolean).join(' '),
	);
