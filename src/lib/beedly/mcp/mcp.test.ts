import { afterEach, describe, expect, it, vi } from 'vitest';
import type { McpStatus } from '../bridge';
import { BrokerError, createRequestBroker } from './broker';
import { mcpClientSnippets } from './client-config';
import { checkMcpRequest, createToken, safeEqual } from './security';

const config = { port: 7824, token: 'a'.repeat(48) };
const valid = {
	method: 'POST',
	host: '127.0.0.1:7824',
	authorization: `Bearer ${config.token}`,
};

describe('checkMcpRequest', () => {
	it('accepts authorized loopback requests', () => {
		expect(checkMcpRequest(valid, config)).toEqual({ ok: true });
		expect(
			checkMcpRequest(
				{ ...valid, host: 'localhost:7824', origin: 'http://localhost:3000' },
				config,
			),
		).toEqual({ ok: true });
	});

	it('refuses other hosts and origins (DNS rebinding, web pages)', () => {
		expect(
			checkMcpRequest({ ...valid, host: 'evil.test:7824' }, config),
		).toMatchObject({ ok: false, status: 403 });
		expect(
			checkMcpRequest({ ...valid, host: undefined }, config),
		).toMatchObject({ status: 403 });
		expect(
			checkMcpRequest({ ...valid, origin: 'https://evil.test' }, config),
		).toMatchObject({ ok: false, status: 403 });
	});

	it('requires the bearer token', () => {
		expect(
			checkMcpRequest({ ...valid, authorization: undefined }, config),
		).toMatchObject({ status: 401 });
		expect(
			checkMcpRequest({ ...valid, authorization: 'Bearer wrong' }, config),
		).toMatchObject({ status: 401 });
		expect(
			checkMcpRequest(
				{ ...valid, authorization: `Basic ${config.token}` },
				config,
			),
		).toMatchObject({ status: 401 });
	});

	it('only serves POST', () => {
		expect(checkMcpRequest({ ...valid, method: 'GET' }, config)).toMatchObject({
			status: 405,
		});
	});

	it('compares and creates tokens', () => {
		expect(safeEqual('abc', 'abc')).toBe(true);
		expect(safeEqual('abc', 'abd')).toBe(false);
		expect(safeEqual('abc', 'abcd')).toBe(false);
		expect(createToken(new Uint8Array([0, 15, 255]))).toBe('000fff');
	});
});

describe('request broker', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	const setup = (deliver = true) => {
		const sent: Array<{ requestId: string; type: string }> = [];
		const broker = createRequestBroker<
			{ type: string },
			{ requestId: string; value: number }
		>({
			send: (request) => {
				sent.push(request);
				return deliver;
			},
			timeoutMs: 1000,
			unavailableMessage: 'No window',
			timeoutMessage: 'Too slow',
		});
		return { broker, sent };
	};

	it('matches responses to requests', async () => {
		const { broker, sent } = setup();
		const first = broker.request({ type: 'a' });
		const second = broker.request({ type: 'b' });

		broker.resolve({ requestId: sent[1].requestId, value: 2 });
		broker.resolve({ requestId: 'unknown', value: 0 });
		broker.resolve({ requestId: sent[0].requestId, value: 1 });

		expect(await first).toMatchObject({ value: 1 });
		expect(await second).toMatchObject({ value: 2 });
		expect(sent[0].requestId).not.toBe(sent[1].requestId);
		expect(broker.pendingCount()).toBe(0);
	});

	it('fails when nobody receives it, on timeout and when rejected', async () => {
		vi.useFakeTimers();

		await expect(setup(false).broker.request({ type: 'a' })).rejects.toThrow(
			'No window',
		);

		const { broker } = setup();
		const slow = broker.request({ type: 'a' });
		vi.advanceTimersByTime(1001);
		await expect(slow).rejects.toBeInstanceOf(BrokerError);

		const pending = broker.request({ type: 'b' });
		broker.rejectAll('Closing');
		await expect(pending).rejects.toThrow('Closing');
	});
});

describe('client snippets', () => {
	const status: McpStatus = {
		enabled: true,
		running: true,
		port: 7824,
		url: 'http://127.0.0.1:7824/mcp',
		token: 'tok123',
		stdioProxyPath: 'C:\\Program Files\\Karbonized\\resources\\mcp-stdio.cjs',
		executablePath: 'C:\\Program Files\\Karbonized\\Karbonized.exe',
		lastClientAt: null,
		error: null,
	};

	it('configures each client with the URL and token', () => {
		const [desktop, code, cursor] = mcpClientSnippets(status);

		expect(JSON.parse(desktop.code)).toEqual({
			mcpServers: {
				karbonized: {
					command: status.executablePath,
					args: [status.stdioProxyPath],
					env: {
						ELECTRON_RUN_AS_NODE: '1',
						KARBONIZED_MCP_URL: status.url,
						KARBONIZED_MCP_TOKEN: 'tok123',
					},
				},
			},
		});
		expect(code.code).toBe(
			'claude mcp add --transport http karbonized http://127.0.0.1:7824/mcp --header "Authorization: Bearer tok123"',
		);
		expect(JSON.parse(cursor.code).mcpServers.karbonized).toEqual({
			url: status.url,
			headers: { Authorization: 'Bearer tok123' },
		});
	});
});
