import React, { useContext, useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { Command as CommandIcon, Moon, Sun } from 'lucide-react';
import { AppContext } from '@/AppContext';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import {
	type Command as AppCommand,
	type CommandGroup as AppCommandGroup,
	commandRegistry,
	handleShortcutEvent,
	useCommandRegistryVersion,
	useCommands,
} from '@/lib/commands/registry';
import { shortcutLabel } from '@/lib/commands/shortcuts';

interface CommandPaletteState {
	open: boolean;
	setOpen: (open: boolean) => void;
	toggle: () => void;
}

export const useCommandPalette = create<CommandPaletteState>((set) => ({
	open: false,
	setOpen: (open) => set({ open }),
	toggle: () => set((state) => ({ open: !state.open })),
}));

const GROUP_ORDER: AppCommandGroup[] = [
	'Block Editor',
	'General',
	'File',
	'Edit',
	'Tools',
	'Insert',
	'View',
	'Workspaces',
	'Help',
];

/**
 * Global keyboard handling plus commands that exist on every screen.
 * Mount once, near the root of the app.
 */
export const ShortcutManager: React.FC = () => {
	const { theme, toggleTheme } = useContext(AppContext);
	const toggle = useCommandPalette((state) => state.toggle);

	useEffect(() => {
		window.addEventListener('keydown', handleShortcutEvent, { capture: true });
		return () =>
			window.removeEventListener('keydown', handleShortcutEvent, {
				capture: true,
			});
	}, []);

	useCommands([
		{
			id: 'general.command-palette',
			title: 'Command palette',
			group: 'General',
			icon: CommandIcon,
			shortcut: 'Mod+K',
			allowInInput: true,
			hidden: true,
			run: toggle,
		},
		{
			id: 'general.toggle-theme',
			title:
				theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
			group: 'General',
			icon: theme === 'dark' ? Sun : Moon,
			keywords: ['theme', 'appearance', 'dark', 'light', 'tema'],
			run: toggleTheme,
		},
	]);

	return null;
};

export const CommandPalette: React.FC = () => {
	const open = useCommandPalette((state) => state.open);
	const setOpen = useCommandPalette((state) => state.setOpen);
	const registryVersion = useCommandRegistryVersion();
	const [search, setSearch] = useState('');
	const [wasOpen, setWasOpen] = useState(open);

	// Start with an empty search every time the palette opens.
	if (open !== wasOpen) {
		setWasOpen(open);
		if (!open) setSearch('');
	}

	const groups = useMemo(() => {
		if (!open) return [];

		const byGroup = new Map<AppCommandGroup, AppCommand[]>();
		const seen = new Set<string>();

		commandRegistry.getAvailable().forEach((command) => {
			if (command.hidden || seen.has(command.id)) return;
			seen.add(command.id);

			const list = byGroup.get(command.group) ?? [];
			list.push(command);
			byGroup.set(command.group, list);
		});

		return GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
			group,
			commands: byGroup.get(group) ?? [],
		}));
	}, [open, registryVersion]);

	const runAndClose = (command: AppCommand) => {
		setOpen(false);
		// Let the dialog close and restore focus before the command runs, so
		// commands that open other dialogs or move focus behave predictably.
		setTimeout(() => command.run(), 0);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent
				showCloseButton={false}
				className='top-[18%] max-w-[calc(100%-2rem)] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl'
			>
				<DialogTitle className='sr-only'>Command palette</DialogTitle>
				<DialogDescription className='sr-only'>
					Search for a command to run
				</DialogDescription>

				<Command loop>
					<CommandInput
						autoFocus
						value={search}
						onValueChange={setSearch}
						placeholder='Type a command or search…'
					/>
					<CommandList>
						<CommandEmpty>No commands found.</CommandEmpty>

						{groups.map(({ group, commands }) => (
							<CommandGroup key={group} heading={group}>
								{commands.map((command) => {
									const Icon = command.icon;

									return (
										<CommandItem
											key={command.id}
											value={`${command.title} ${command.id}`}
											keywords={[
												group,
												...(command.keywords ?? []),
												shortcutLabel(command.shortcut),
											]}
											onSelect={() => runAndClose(command)}
										>
											{Icon ? <Icon /> : <span className='size-4' />}
											<span className='truncate'>{command.title}</span>
											<Kbd shortcut={command.shortcut} className='ml-auto' />
										</CommandItem>
									);
								})}
							</CommandGroup>
						))}
					</CommandList>

					<div className='flex h-9 items-center gap-4 border-t border-border px-3 text-[11px] text-muted-foreground'>
						<span className='flex items-center gap-1.5'>
							<kbd className='kbd'>↑</kbd>
							<kbd className='kbd'>↓</kbd>
							Navigate
						</span>
						<span className='flex items-center gap-1.5'>
							<kbd className='kbd'>↵</kbd>
							Run
						</span>
						<span className='flex items-center gap-1.5'>
							<kbd className='kbd'>Esc</kbd>
							Close
						</span>
					</div>
				</Command>
			</DialogContent>
		</Dialog>
	);
};

/** Search-style button that opens the palette, for the title bar. */
export const CommandPaletteTrigger: React.FC<{ className?: string }> = ({
	className,
}) => {
	const setOpen = useCommandPalette((state) => state.setOpen);

	return (
		<button
			type='button'
			onClick={() => setOpen(true)}
			className={`flex h-7 w-56 items-center gap-2 rounded-control border border-border bg-background/60 pl-2 pr-1 text-xs text-muted-foreground transition-colors hover:border-ring/40 hover:text-foreground ${className ?? ''}`}
		>
			<CommandIcon className='size-3.5' />
			<span className='truncate'>Search commands…</span>
			<Kbd shortcut='Mod+K' className='ml-auto' />
		</button>
	);
};

export default CommandPalette;
