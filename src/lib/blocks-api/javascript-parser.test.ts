import { describe, expect, it } from 'vitest';
import {
	generateActionRegistrations,
	generateCompiledSource,
	getActionScopes,
	parseJavaScript,
	updateJSVariable,
} from './javascript-parser';

const compile = (js: string) => {
	const parsed = parseJavaScript(js);
	return generateCompiledSource(
		parsed,
		generateActionRegistrations(parsed.actions),
	);
};

/** Runs compiled block code against a minimal htmlBlockAPI. */
const run = (js: string) => {
	const actions = new Map<string, () => unknown>();
	const logs: unknown[][] = [];
	const window = {
		htmlBlockAPI: {
			registerAction: (id: string, handler: () => unknown) =>
				actions.set(id, handler),
			log: (...args: unknown[]) => logs.push(args),
		},
	};
	const console = { log: () => {} };

	new Function('window', 'console', compile(js))(window, console);
	return { actions, logs };
};

describe('parseJavaScript', () => {
	it('extracts typed variables with defaults', () => {
		const { variables } = parseJavaScript(
			[
				'// @var title:string = "Hello"',
				'// @var count:number = 3',
				'// @var enabled:boolean = true',
				'// @var tags:array = ["a", "b"]',
				'// @var accent:color',
			].join('\n'),
		);

		expect(
			variables.map(({ name, type, value }) => ({ name, type, value })),
		).toEqual([
			{ name: 'title', type: 'string', value: 'Hello' },
			{ name: 'count', type: 'number', value: 3 },
			{ name: 'enabled', type: 'boolean', value: true },
			{ name: 'tags', type: 'array', value: ['a', 'b'] },
			{ name: 'accent', type: 'color', value: '#000000' },
		]);
	});

	it('falls back to the type default for invalid JSON', () => {
		const { variables } = parseJavaScript('// @var data:object = {broken');
		expect(variables[0].value).toEqual({});
	});

	it('splits setup code from actions', () => {
		const parsed = parseJavaScript(
			[
				'const greet = () => "hi";',
				'// @action:Say hello',
				'log(greet());',
				'// @action:Reset',
				'log("reset");',
			].join('\n'),
		);

		expect(parsed.setupCode).toBe('const greet = () => "hi";');
		expect(parsed.actions.map((action) => action.label)).toEqual([
			'Say hello',
			'Reset',
		]);
		expect(parsed.actions[0].id).toBe('action_0_say-hello');
		expect(parsed.actions[1].code).toBe('log("reset");');
		expect(parsed.functions).toContain('greet');
	});

	it('treats code after the last action marker as part of that action', () => {
		const parsed = parseJavaScript('// @action:Only\nlog(1);\nlog(2);');
		expect(parsed.setupCode).toBe('');
		expect(parsed.actions[0].code).toBe('log(1);\nlog(2);');
	});
});

describe('generated source', () => {
	it('registers actions that run their code', () => {
		const { actions, logs } = run('// @action:Ping\nlog("pong");');

		actions.get('action_0_ping')?.();
		expect(logs).toEqual([['pong']]);
	});

	it('invokes a function declared as the action body', () => {
		const { actions, logs } = run(
			'// @action:Declared\nfunction handle() { log("called"); }',
		);

		actions.get('action_0_declared')?.();
		expect(logs).toEqual([['called']]);
	});

	it('exposes variables with their values', () => {
		const { logs } = run(
			'// @var count:number = 2\n// @var label:string = "two"\nlog(count, label);',
		);
		expect(logs).toEqual([[2, 'two']]);
	});

	it('keeps working with quotes in labels and string values', () => {
		const js = [
			'// @var quote:string = "She said \\"hi\\""',
			'log(quote);',
			"// @action:Don't panic",
			'log("ok");',
		].join('\n');

		const { actions, logs } = run(js);
		actions.get('action_0_don-t-panic')?.();

		expect(logs).toEqual([['She said "hi"'], ['ok']]);
	});
});

describe('updateJSVariable', () => {
	it('rewrites the annotated default and round-trips through the parser', () => {
		const js = '// @var title:string = "Hello"\nlog(title);';
		const { variables } = parseJavaScript(js);

		const next = updateJSVariable(js, 'title', 'Say "hi"\nthere', variables);

		expect(next.split('\n')).toHaveLength(2);
		expect(parseJavaScript(next).variables[0].value).toBe('Say "hi"\nthere');
	});

	it('writes numbers, booleans and arrays', () => {
		const js =
			'// @var n:number = 1\n// @var b:boolean = false\n// @var list:array = []';
		const { variables } = parseJavaScript(js);

		let next = updateJSVariable(js, 'n', 42, variables);
		next = updateJSVariable(next, 'b', true, variables);
		next = updateJSVariable(next, 'list', ['x'], variables);

		expect(
			parseJavaScript(next).variables.map((variable) => variable.value),
		).toEqual([42, true, ['x']]);
	});

	it('leaves the code untouched for unknown variables', () => {
		const js = '// @var n:number = 1';
		expect(
			updateJSVariable(js, 'missing', 2, parseJavaScript(js).variables),
		).toBe(js);
	});
});

describe('getActionScopes', () => {
	it('assigns every line after a marker to that action', () => {
		const code = [
			'const shared = 1;', // 1
			'', // 2
			'// @action: First', // 3
			'first();', // 4
			'', // 5
			'// @action: Second', // 6
			'second();', // 7
			'more();', // 8
			'', // 9
			'', // 10
		].join('\n');

		expect(getActionScopes(code)).toEqual([
			{ label: 'First', markerLine: 3, startLine: 4, endLine: 4 },
			{ label: 'Second', markerLine: 6, startLine: 7, endLine: 8 },
		]);
	});

	it('reports empty actions and files without actions', () => {
		expect(getActionScopes('// @action: Empty\n\n')).toEqual([
			{ label: 'Empty', markerLine: 1, startLine: 0, endLine: 0 },
		]);
		expect(getActionScopes('run();')).toEqual([]);
	});
});
