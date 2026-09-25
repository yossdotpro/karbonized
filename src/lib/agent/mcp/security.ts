/**
 * Checks for requests to the local MCP server. The server only listens on
 * the loopback interface, but a web page in any browser can still reach it,
 * so every request must carry the token, and requests that look like they
 * come from a page (DNS rebinding, cross-site requests) are refused.
 */

export interface McpRequestInfo {
	method: string;
	host?: string;
	origin?: string;
	authorization?: string;
}

export type McpRequestCheck =
	{ ok: true } | { ok: false; status: 401 | 403 | 405; message: string };

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

/** Compare without leaking the position of the first difference. */
export const safeEqual = (a: string, b: string): boolean => {
	let difference = a.length ^ b.length;
	for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
		difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
	}
	return difference === 0;
};

const isLoopbackOrigin = (origin: string): boolean => {
	try {
		return LOOPBACK_HOSTS.includes(new URL(origin).hostname);
	} catch {
		return false;
	}
};

export const checkMcpRequest = (
	request: McpRequestInfo,
	config: { port: number; token: string },
): McpRequestCheck => {
	const allowedHosts = LOOPBACK_HOSTS.map((host) => `${host}:${config.port}`);
	if (!request.host || !allowedHosts.includes(request.host.toLowerCase())) {
		return { ok: false, status: 403, message: 'Host not allowed.' };
	}

	// MCP clients don't send Origin; browsers always do on cross-origin POSTs.
	if (request.origin && !isLoopbackOrigin(request.origin)) {
		return { ok: false, status: 403, message: 'Origin not allowed.' };
	}

	const [scheme, token] = (request.authorization ?? '').split(' ');
	if (
		scheme?.toLowerCase() !== 'bearer' ||
		!token ||
		!safeEqual(token, config.token)
	) {
		return { ok: false, status: 401, message: 'Missing or invalid token.' };
	}

	// Stateless server: no standalone SSE stream (GET) or sessions (DELETE).
	if (request.method !== 'POST') {
		return { ok: false, status: 405, message: 'Method not allowed.' };
	}

	return { ok: true };
};

/** Random token for the Authorization header. */
export const createToken = (bytes: Uint8Array): string =>
	Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
