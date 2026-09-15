import { describe, expect, it } from 'vitest';
import { chunksOf, collect, splitEvery } from '../test-utils';
import { withAuthHeader } from '../transport/browser';
import { REDACTED, redactSecrets } from './redact';
import { parseSSE } from './sse';

describe('parseSSE', () => {
	it('parses events split across chunks and line endings', async () => {
		const body =
			': comment\r\nevent: message_start\r\ndata: {"a":1}\r\n\r\ndata: first\ndata: second\n\ndata: tail';

		for (const size of [1, 3, 7, body.length]) {
			expect(
				await collect(parseSSE(chunksOf(...splitEvery(body, size)))),
			).toEqual([
				{ event: 'message_start', data: '{"a":1}' },
				{ event: undefined, data: 'first\nsecond' },
				{ event: undefined, data: 'tail' },
			]);
		}
	});

	it('handles a CR split from its LF', async () => {
		expect(
			await collect(parseSSE(chunksOf('data: x\r', '\n\r', '\ndata: y\n\n'))),
		).toEqual([
			{ event: undefined, data: 'x' },
			{ event: undefined, data: 'y' },
		]);
	});
});

describe('redactSecrets', () => {
	it('removes known key formats and given secrets', () => {
		const text = [
			'key sk-ant-api03-abcdefghijklmnop',
			'Authorization: Bearer abcdefghijklmnop',
			'x-goog-api-key: AIzaSyA1234567890abcdefghijk',
			'https://x.test/models?key=supersecretvalue&a=1',
			'{"api_key": "my-private-token-123"}',
			'custom hunter2hunter2',
		].join('\n');

		const redacted = redactSecrets(text, ['hunter2hunter2']);
		expect(redacted).not.toMatch(
			/abcdefghijklmnop|AIzaSy|supersecret|private-token|hunter2/,
		);
		expect(redacted).toContain(`Bearer ${REDACTED}`);
		expect(redacted).toContain(`?key=${REDACTED}&a=1`);
		expect(redacted).toContain('Authorization: Bearer');
	});

	it('leaves normal text alone', () => {
		const text = 'Model gpt-5 not found (HTTP 404)';
		expect(redactSecrets(text)).toBe(text);
	});
});

describe('withAuthHeader', () => {
	it('adds the key with its scheme', () => {
		const request = {
			url: 'https://x.test',
			method: 'GET' as const,
			headers: { accept: 'json' },
			auth: { header: 'authorization', scheme: 'Bearer' },
		};
		expect(withAuthHeader(request, 'k-123')).toEqual({
			accept: 'json',
			authorization: 'Bearer k-123',
		});
		expect(withAuthHeader(request, undefined)).toEqual({ accept: 'json' });
		expect(
			withAuthHeader({ ...request, auth: { header: 'x-api-key' } }, 'k'),
		).toMatchObject({ 'x-api-key': 'k' });
	});
});
