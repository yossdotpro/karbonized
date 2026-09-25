import { GitBranch, Layers, MousePointer2, Square, Tag } from 'lucide-react';
import React from 'react';
import { useCommands, useCommandShortcut } from '@/lib/commands/registry';
import { shortcutLabel } from '@/lib/commands/shortcuts';
import {
	PANEL_LAYOUTS,
	applyLayout,
	nextLayout,
	usePanelLayout,
	type PanelLayout,
} from '@/lib/editor/layout';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip } from '../CustomControls/Tooltip';
import { useWorkspaceStore, useControlsStore } from '../../stores';
import { Button } from '../ui/button';
import { ViewPanel } from '../Panels/ViewPanel';
import useMousePosition from '@/hooks/useMousePosition';
import { Separator } from '../ui/separator';
import { useAutosaveStatus } from '@/lib/persistence/autosave';
import {
	AgentStatusButton,
	McpStatusIndicator,
} from '../Agent/AgentStatusBarItems';

const AutosaveIndicator: React.FC = () => {
	const status = useAutosaveStatus((state) => state.status);
	const savedAt = useAutosaveStatus((state) => state.savedAt);

	if (status === 'idle') return null;

	const label = {
		saving: 'Saving…',
		saved: 'Saved',
		error: 'Autosave failed',
	}[status];

	return (
		<span
			className='flex items-center gap-1.5'
			title={
				savedAt
					? `Last saved ${new Date(savedAt).toLocaleTimeString()}`
					: undefined
			}
		>
			<span
				className={`size-1.5 rounded-full ${
					status === 'error'
						? 'bg-destructive'
						: status === 'saving'
							? 'animate-pulse bg-muted-foreground'
							: 'bg-emerald-500'
				}`}
			/>
			{label}
		</span>
	);
};

export const StatusBar: React.FC = () => {
	/* Component State */
	const mousePosition = useMousePosition();

	/* App Store */
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const controlPosition = useControlsStore((state) => state.controlPosition);
	const layout = usePanelLayout();
	const cycleShortcut = useCommandShortcut('view.cycle-layout');

	useCommands([
		{
			id: 'view.cycle-layout',
			title: 'Next panel layout',
			group: 'View',
			icon: layout.icon,
			shortcut: 'Mod+Period',
			keywords: ['layout', 'panels', 'agent', 'properties', 'zen'],
			run: () => applyLayout(nextLayout()),
		},
		...PANEL_LAYOUTS.map((item) => ({
			id: `view.layout-${item.id}`,
			title: `Layout: ${item.label}`,
			group: 'View' as const,
			icon: item.icon,
			keywords: ['layout', 'panels'],
			run: () => applyLayout(item.id),
		})),
	]);

	return (
		<div className='flex h-7 w-full shrink-0 items-center gap-2 border-t border-border bg-sidebar px-2 text-[11px] text-muted-foreground'>
			{/* Panel layout */}
			<DropdownMenu>
				<Tooltip message='Panel layout' shortcut='Mod+Period' placement='top'>
					<DropdownMenuTrigger asChild>
						<Button
							className='h-5 gap-1 rounded-[4px] px-1.5 text-[11px] font-normal'
							variant={'ghost'}
							aria-label={`Panel layout: ${layout.label}`}
						>
							<layout.icon className='size-3' />
							<span>{layout.label}</span>
						</Button>
					</DropdownMenuTrigger>
				</Tooltip>
				<DropdownMenuContent side='top' align='start' className='w-52'>
					<DropdownMenuLabel>Panel layout</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={layout.id}
						onValueChange={(value) => applyLayout(value as PanelLayout)}
					>
						{PANEL_LAYOUTS.map((item) => (
							<DropdownMenuRadioItem key={item.id} value={item.id}>
								<item.icon className='size-4 shrink-0' />
								{item.label}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
					<DropdownMenuSeparator />
					<DropdownMenuLabel className='flex items-center font-normal text-muted-foreground'>
						Next layout
						<DropdownMenuShortcut>
							{shortcutLabel(cycleShortcut)}
						</DropdownMenuShortcut>
					</DropdownMenuLabel>
				</DropdownMenuContent>
			</DropdownMenu>

			<Separator orientation='vertical' className='h-3' />

			{/* Mouse Position */}
			<div className='flex items-center gap-1.5'>
				<MousePointer2 className='size-3' />
				<span className='font-mono tabular-nums'>
					x: {Math.round(mousePosition.x)} y: {Math.round(mousePosition.y)}
				</span>
			</div>

			{/* Control Position */}
			<div className='flex items-center gap-1.5'>
				<Layers className='size-3' />
				<span className='font-mono tabular-nums'>
					x: {Math.round(controlPosition?.x as any)} y:{' '}
					{Math.round(controlPosition?.y as any)}
				</span>
			</div>

			<Separator orientation='vertical' className='h-3' />

			{/* Workspace Name */}
			<div className='flex items-center gap-1.5'>
				<Tag className='size-3' />
				<span className='text-foreground/80'>
					{currentWorkspace?.workspaceName}
				</span>
			</div>

			{/* Workspace Settings Size */}
			<div className='flex items-center gap-1.5'>
				<Square className='size-3' />
				<span className='font-mono tabular-nums'>
					{currentWorkspace?.workspaceWidth}
					{' × '}
					{currentWorkspace?.workspaceHeight}
				</span>
			</div>

			<div className='flex-auto' />

			<McpStatusIndicator />

			<AgentStatusButton />

			<Separator orientation='vertical' className='h-3' />

			<AutosaveIndicator />

			<Separator orientation='vertical' className='h-3' />

			<ViewPanel />

			<Separator orientation='vertical' className='h-3' />

			{/* Source Code */}
			<Button
				variant={'ghost'}
				size={'sm'}
				className='h-5 gap-1 rounded-[4px] px-1.5 text-[11px] font-normal'
				asChild
			>
				<a
					href='https://github.com/yossthedev/karbonized/'
					target={'_blank'}
					rel='noreferrer'
				>
					<GitBranch className='size-3' />
					<span>Source</span>
				</a>
			</Button>
		</div>
	);
};

export default StatusBar;
