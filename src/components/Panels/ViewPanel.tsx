import { AppContext } from '@/AppContext';
import { isElectron } from '@/utils/isElectron';
import React, { useContext } from 'react';
import { Button } from '../ui/button';
import { useWorkspaceStore, useUIStore } from '@/stores';
import {
	Focus,
	Lock,
	Moon,
	Sun,
	ZoomIn,
	ZoomOut,
	RotateCcw,
} from 'lucide-react';
import { Separator } from '../ui/separator';

export const ViewPanel: React.FC = () => {
	const { viewerRef, theme, toggleTheme } = useContext(AppContext);
	const aspectRatio = useUIStore((state) => state.lockAspect);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const setAspectRatio = useUIStore((state) => state.setLockAspect);

	const centerView = (): void => {
		const width = parseFloat(currentWorkspace?.workspaceWidth || '0');

		if (width < 1280) {
			viewerRef.current?.setZoom(0.9);
		} else if (width >= 1280 && width < 1920) {
			viewerRef.current?.setZoom(0.6);
		} else if (width >= 1920 && width < 2560) {
			viewerRef.current?.setZoom(0.4);
		} else if (width >= 2560 && width < 3840) {
			viewerRef.current?.setZoom(0.3);
		} else if (width >= 3840) {
			viewerRef.current?.setZoom(0.2);
		}

		viewerRef.current?.scrollCenter();
	};

	return (
		<>
			<div className='ml-auto flex items-center gap-0.5'>
				{/* Change Theme */}
				{!isElectron() && (
					<>
						<Button
							size='icon'
							variant={'ghost'}
							className='size-5 rounded-[4px]'
							onClick={() => {
								toggleTheme();
							}}
						>
							{theme === 'light' ? (
								<Moon className='size-3' />
							) : (
								<Sun className='size-3' />
							)}
						</Button>

						<Separator orientation='vertical' className='mx-1 h-3' />
					</>
				)}

				{/* Lock Aspect Ratio */}
				<Button
					size='icon'
					className={`size-5 rounded-[4px] ${aspectRatio ? 'bg-accent text-foreground' : ''}`}
					onClick={() => {
						setAspectRatio(!aspectRatio);
					}}
					variant='ghost'
				>
					<Lock className='size-3' />
				</Button>

				<Separator orientation='vertical' className='mx-1 h-3' />

				{/* Zoom Out */}
				<Button
					size='icon'
					variant={'ghost'}
					className='size-5 rounded-[4px]'
					onClick={() =>
						viewerRef.current?.setZoom(viewerRef.current?.getZoom() - 0.2)
					}
				>
					<ZoomOut className='size-3' />
				</Button>

				{/* Zoom In */}
				<Button
					size='icon'
					variant={'ghost'}
					className='size-5 rounded-[4px]'
					onClick={() =>
						viewerRef.current?.setZoom(viewerRef.current?.getZoom() + 0.2)
					}
				>
					<ZoomIn className='size-3' />
				</Button>

				{/* Zoom Reset */}
				<Button
					size='icon'
					variant={'ghost'}
					className='size-5 rounded-[4px]'
					onClick={() => viewerRef.current?.setZoom(0.7)}
				>
					<RotateCcw className='size-3' />
				</Button>

				{/* Center View */}
				<Button
					size='icon'
					variant={'ghost'}
					className='size-5 rounded-[4px]'
					onClick={() => {
						centerView();
					}}
				>
					<Focus className='size-3' />
				</Button>
			</div>
		</>
	);
};
