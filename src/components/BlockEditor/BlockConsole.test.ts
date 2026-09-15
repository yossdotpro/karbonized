import { describe, expect, it, vi } from 'vitest';
import {
	type ConsoleEntry,
	appendConsoleEntry,
	createConsoleEntry,
	createScriptConsole,
} from './BlockConsole';

describe('createConsoleEntry', () => {
	it('formats values like a console', () => {
		const element = document.createElement('section');
		function namedHandler() {}

		const entry = createConsoleEntry('log', [
			'count',
			2,
			{ ok: true },
			new TypeError('boom'),
			element,
			namedHandler,
		]);

		expect(entry.level).toBe('log');
		expect(entry.text).toBe(
			'count 2 {\n  "ok": true\n} TypeError: boom <section> ƒ namedHandler()',
		);
	});

	it('survives circular structures', () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;

		expect(createConsoleEntry('warn', [circular]).text).toBe('[object Object]');
	});
});

describe('appendConsoleEntry', () => {
	it('keeps at most 500 entries', () => {
		let entries: ConsoleEntry[] = [];
		for (let index = 0; index < 510; index++) {
			entries = appendConsoleEntry(entries, createConsoleEntry('log', [index]));
		}

		expect(entries).toHaveLength(500);
		expect(entries[0].text).toBe('10');
		expect(entries.at(-1)?.text).toBe('509');
	});
});

describe('createScriptConsole', () => {
	it('reports console calls and still forwards them', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const reported: ConsoleEntry[] = [];

		const scriptConsole = createScriptConsole((entry) => reported.push(entry));
		scriptConsole.log('hello', 1);
		scriptConsole.debug('debugging');
		scriptConsole.warn('careful');

		expect(reported.map(({ level, text }) => [level, text])).toEqual([
			['log', 'hello 1'],
			['log', 'debugging'],
			['warn', 'careful'],
		]);
		expect(log).toHaveBeenCalledWith('[block]', 'hello', 1);
		expect(warn).toHaveBeenCalledWith('[block]', 'careful');
	});

	it('passes through methods it does not capture', () => {
		const scriptConsole = createScriptConsole(() => {});
		expect(scriptConsole.table).toBe(console.table);
	});
});
