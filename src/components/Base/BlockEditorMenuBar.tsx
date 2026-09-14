import React from 'react';
import {
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarShortcut,
	MenubarTrigger,
} from '@/components/ui/menubar';
import {
	commandRegistry,
	runCommand,
	useCommandRegistryVersion,
} from '@/lib/commands/registry';
import { shortcutLabel } from '@/lib/commands/shortcuts';

/** Menu entry backed by a registered block editor command. */
const CommandMenuItem: React.FC<{ id: string; label?: string }> = ({
	id,
	label,
}) => {
	useCommandRegistryVersion();
	const command = commandRegistry.get(id);

	return (
		<MenubarItem onSelect={() => runCommand(id)} disabled={!command}>
			{label ?? command?.title ?? id}
			{command?.shortcut && (
				<MenubarShortcut>{shortcutLabel(command.shortcut)}</MenubarShortcut>
			)}
		</MenubarItem>
	);
};

export const BlockEditorMenuBar: React.FC = () => (
	<Menubar className='border-0 bg-transparent p-0 shadow-none'>
		<MenubarMenu>
			<MenubarTrigger>File</MenubarTrigger>
			<MenubarContent>
				<CommandMenuItem id='block.save' label='Save Block' />
				<CommandMenuItem id='block.export-component' />
				<MenubarSeparator />
				<CommandMenuItem id='block.back' />
			</MenubarContent>
		</MenubarMenu>

		<MenubarMenu>
			<MenubarTrigger>View</MenubarTrigger>
			<MenubarContent>
				<CommandMenuItem id='block.toggle-explorer' />
				<CommandMenuItem id='block.toggle-panel' />
				<MenubarSeparator />
				<CommandMenuItem id='block.open-html' label='Open HTML' />
				<CommandMenuItem id='block.open-css' label='Open CSS' />
				<CommandMenuItem id='block.open-js' label='Open JavaScript' />
			</MenubarContent>
		</MenubarMenu>

		<MenubarMenu>
			<MenubarTrigger>Preview</MenubarTrigger>
			<MenubarContent>
				<CommandMenuItem id='block.panel-preview' label='Render Surface' />
				<CommandMenuItem id='block.panel-css' label='CSS Variables' />
				<CommandMenuItem id='block.panel-js' label='JS Variables' />
				<CommandMenuItem id='block.panel-actions' label='Actions' />
			</MenubarContent>
		</MenubarMenu>

		<MenubarMenu>
			<MenubarTrigger>Run</MenubarTrigger>
			<MenubarContent>
				<CommandMenuItem id='block.refresh' />
				<CommandMenuItem id='block.toggle-runtime' />
			</MenubarContent>
		</MenubarMenu>
	</Menubar>
);

export default BlockEditorMenuBar;
