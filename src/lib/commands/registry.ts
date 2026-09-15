import {
	type ComponentType,
	useEffect,
	useRef,
	useSyncExternalStore,
} from 'react';
import {
	isEditableTarget,
	isOverlayTarget,
	matchesShortcut,
} from './shortcuts';

export type CommandGroup =
	| 'General'
	| 'File'
	| 'Edit'
	| 'Tools'
	| 'Insert'
	| 'View'
	| 'Workspaces'
	| 'Block Editor'
	| 'Help';

export interface Command {
	/** Stable, unique id, e.g. `edit.undo`. */
	id: string;
	title: string;
	group: CommandGroup;
	/** One shortcut or several aliases; the first one is displayed. */
	shortcut?: string | string[];
	icon?: ComponentType<{ className?: string }>;
	/** Extra words that should match in the command palette. */
	keywords?: string[];
	/** Command is available (runs, shows in the palette) only when true. */
	when?: () => boolean;
	/** Run the shortcut even while typing in an input or the code editor. */
	allowInInput?: boolean;
	/** Keep the command out of the command palette. */
	hidden?: boolean;
	run: () => void;
}

type CommandSource = () => Command[];

const sources = new Map<symbol, CommandSource>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
	version += 1;
	listeners.forEach((listener) => listener());
};

export const commandRegistry = {
	register(source: CommandSource): () => void {
		const token = Symbol('commands');
		sources.set(token, source);
		emit();

		return () => {
			sources.delete(token);
			emit();
		};
	},

	/** Registered commands, most recently registered sources first. */
	getAll(): Command[] {
		return Array.from(sources.values())
			.reverse()
			.flatMap((source) => source());
	},

	getAvailable(): Command[] {
		return commandRegistry
			.getAll()
			.filter((command) => command.when?.() ?? true);
	},

	get(id: string): Command | undefined {
		return commandRegistry.getAll().find((command) => command.id === id);
	},

	subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
};

/** Run a registered command by id. Returns false if it is not available. */
export const runCommand = (id: string): boolean => {
	const command = commandRegistry.get(id);
	if (!command || !(command.when?.() ?? true)) return false;

	command.run();
	return true;
};

/**
 * Register commands for the lifetime of the calling component.
 *
 * The list is read lazily, so closures always see the latest props and state
 * without re-registering on every render.
 */
export const useCommands = (commands: Command[]): void => {
	const latest = useRef(commands);
	latest.current = commands;

	useEffect(() => commandRegistry.register(() => latest.current), []);
};

/** Re-render when commands are registered or removed. */
export const useCommandRegistryVersion = (): number =>
	useSyncExternalStore(commandRegistry.subscribe, () => version);

/** Shortcut of a registered command, for menus and tooltips. */
export const useCommandShortcut = (
	id: string,
): string | string[] | undefined => {
	useCommandRegistryVersion();
	return commandRegistry.get(id)?.shortcut;
};

/**
 * Single keyboard entry point for the whole app. Listens in the capture phase
 * so app shortcuts win over focused widgets (e.g. Ctrl+Enter in Monaco), but
 * never steals plain typing from inputs, the code editor or open menus.
 */
export const handleShortcutEvent = (event: KeyboardEvent): void => {
	if (event.repeat && !event.key.startsWith('Arrow')) return;

	const typing = isEditableTarget(event.target);
	const inOverlay = isOverlayTarget(event.target);

	for (const command of commandRegistry.getAll()) {
		if (!command.shortcut) continue;

		const shortcuts = Array.isArray(command.shortcut)
			? command.shortcut
			: [command.shortcut];

		if (!shortcuts.some((shortcut) => matchesShortcut(event, shortcut))) {
			continue;
		}

		if ((typing || inOverlay) && !command.allowInInput) continue;
		if (!(command.when?.() ?? true)) continue;

		event.preventDefault();
		event.stopPropagation();
		command.run();
		return;
	}
};
