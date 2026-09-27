import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	type Command,
	commandRegistry,
	handleShortcutEvent,
	runCommand,
} from './registry';

const cleanups: Array<() => void> = [];

const register = (commands: Command[]) => {
	const unregister = commandRegistry.register(() => commands);
	cleanups.push(unregister);
	return unregister;
};

const command = (overrides: Partial<Command> = {}): Command => ({
	id: 'test.command',
	title: 'Test command',
	group: 'General',
	run: vi.fn(),
	...overrides,
});

const press = (
	init: KeyboardEventInit,
	target: EventTarget = document.body,
) => {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		...init,
	});
	Object.defineProperty(event, 'target', { value: target });
	handleShortcutEvent(event);
	return event;
};

afterEach(() => {
	cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe('commandRegistry', () => {
	it('registers and unregisters command sources', () => {
		const unregister = register([command({ id: 'a' }), command({ id: 'b' })]);

		expect(commandRegistry.get('a')).toBeDefined();
		expect(commandRegistry.getAll().map((item) => item.id)).toEqual(['a', 'b']);

		unregister();
		expect(commandRegistry.get('a')).toBeUndefined();
	});

	it('reads commands lazily so they see the latest state', () => {
		let title = 'Before';
		const unregister = commandRegistry.register(() => [
			command({ id: 'lazy', title }),
		]);
		cleanups.push(unregister);

		title = 'After';
		expect(commandRegistry.get('lazy')?.title).toBe('After');
	});

	it('gives priority to the most recently registered source', () => {
		const first = vi.fn();
		const second = vi.fn();
		register([command({ id: 'shared', shortcut: 'Mod+S', run: first })]);
		register([command({ id: 'shared', shortcut: 'Mod+S', run: second })]);

		press({ key: 's', code: 'KeyS', ctrlKey: true });

		expect(second).toHaveBeenCalledOnce();
		expect(first).not.toHaveBeenCalled();
	});

	it('filters unavailable commands and notifies subscribers', () => {
		const listener = vi.fn();
		const unsubscribe = commandRegistry.subscribe(listener);

		register([
			command({ id: 'on', when: () => true }),
			command({ id: 'off', when: () => false }),
		]);

		expect(commandRegistry.getAvailable().map((item) => item.id)).toEqual([
			'on',
		]);
		expect(listener).toHaveBeenCalled();
		unsubscribe();
	});
});

describe('runCommand', () => {
	it('runs available commands only', () => {
		const run = vi.fn();
		register([
			command({ id: 'enabled', run }),
			command({ id: 'disabled', run, when: () => false }),
		]);

		expect(runCommand('enabled')).toBe(true);
		expect(runCommand('disabled')).toBe(false);
		expect(runCommand('missing')).toBe(false);
		expect(run).toHaveBeenCalledOnce();
	});
});

describe('handleShortcutEvent', () => {
	it('runs the matching command and prevents the browser default', () => {
		const run = vi.fn();
		register([command({ shortcut: 'Mod+K', run })]);

		const event = press({ key: 'k', code: 'KeyK', ctrlKey: true });

		expect(run).toHaveBeenCalledOnce();
		expect(event.defaultPrevented).toBe(true);
	});

	it('supports shortcut aliases', () => {
		const run = vi.fn();
		register([command({ shortcut: ['Mod+Shift+Z', 'Mod+Y'], run })]);

		press({ key: 'y', code: 'KeyY', ctrlKey: true });
		press({ key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true });

		expect(run).toHaveBeenCalledTimes(2);
	});

	it('ignores shortcuts while typing unless allowed', () => {
		const deleteRun = vi.fn();
		const saveRun = vi.fn();
		register([
			command({ id: 'delete', shortcut: 'Delete', run: deleteRun }),
			command({
				id: 'save',
				shortcut: 'Mod+S',
				run: saveRun,
				allowInInput: true,
			}),
		]);

		const input = document.createElement('input');
		const deleteEvent = press({ key: 'Delete' }, input);
		press({ key: 's', code: 'KeyS', ctrlKey: true }, input);

		expect(deleteRun).not.toHaveBeenCalled();
		expect(deleteEvent.defaultPrevented).toBe(false);
		expect(saveRun).toHaveBeenCalledOnce();
	});

	it('ignores shortcuts inside open overlays', () => {
		const run = vi.fn();
		register([command({ shortcut: 'Escape', run })]);

		const dialog = document.createElement('div');
		dialog.setAttribute('role', 'dialog');
		const button = document.createElement('button');
		dialog.appendChild(button);

		press({ key: 'Escape' }, button);
		expect(run).not.toHaveBeenCalled();
	});

	it('skips commands that are not available', () => {
		const run = vi.fn();
		register([command({ shortcut: 'Delete', run, when: () => false })]);

		const event = press({ key: 'Delete' });

		expect(run).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});

	it('ignores key repeats', () => {
		const run = vi.fn();
		register([command({ shortcut: 'Mod+D', run })]);

		press({ key: 'd', code: 'KeyD', ctrlKey: true, repeat: true });
		expect(run).not.toHaveBeenCalled();
	});
});
