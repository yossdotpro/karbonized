import {
	GitBranch,
	Layers,
	MousePointer2,
	PencilRuler,
	Square,
	Tag,
	Box,
	CircleDashed,
} from 'lucide-react';
import React from 'react';
import { useCommands } from '@/lib/commands/registry';
import { useWorkspaceStore, useControlsStore, useUIStore } from '../../stores';
import { Button } from '../ui/button';
import { ViewPanel } from '../Panels/ViewPanel';
import useMousePosition from '@/hooks/useMousePosition';
import { Separator } from '../ui/separator';

export const StatusBar: React.FC = () => {
	/* Component State */
	const mousePosition = useMousePosition();

	/* App Store */
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const controlPosition = useControlsStore((state) => state.controlPosition);
	const workspaceMode = useUIStore((state) => state.workspaceMode);
	const setWorkspaceMode = useUIStore((state) => state.setWorkspaceMode);

	const handleChangeMode = (): void => {
		const modes = ['design', 'edit', 'zen'];

		let i = modes.findIndex((mode) => mode === workspaceMode);

		if (i < modes.length - 1) {
			i += 1;
		} else {
			i = 0;
		}

		setWorkspaceMode(modes[i] as any);
	};

	useCommands([
		{
			id: 'view.cycle-mode',
			title: 'Cycle workspace mode',
			group: 'View',
			icon: Box,
			shortcut: 'Mod+Period',
			keywords: ['design', 'edit', 'zen', 'mode'],
			run: handleChangeMode,
		},
	]);

	return (
		<div className='flex h-7 w-full shrink-0 items-center gap-2 border-t border-border bg-sidebar px-2 text-[11px] text-muted-foreground'>
			{/* Layout Mode */}
			<Button
				className='h-5 gap-1 rounded-[4px] px-1.5 text-[11px] font-normal'
				onClick={handleChangeMode}
				variant={'ghost'}
			>
				{workspaceMode === 'design' && (
					<>
						<Box className='size-3' />
						<span>Design</span>
					</>
				)}

				{workspaceMode === 'zen' && (
					<>
						<CircleDashed className='size-3' />
						<span>Zen</span>
					</>
				)}

				{workspaceMode === 'edit' && (
					<>
						<PencilRuler className='size-3' />
						<span>Edit</span>
					</>
				)}

				{workspaceMode === 'custom' && (
					<>
						<PencilRuler className='size-3' />
						<span>Custom</span>
					</>
				)}
			</Button>

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
