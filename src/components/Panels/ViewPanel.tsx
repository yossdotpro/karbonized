import { AppContext } from '@/AppContext';
import { isElectron } from '@/utils/isElectron';
import React, { useContext } from 'react';
import { Button } from '../ui/button';
import { useUIStore } from '@/stores';
import { Lock, Magnet, Moon, Sun, ZoomIn, ZoomOut } from 'lucide-react';
import { Separator } from '../ui/separator';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip } from '../CustomControls/Tooltip';
import { runCommand, useCommandShortcut } from '@/lib/commands/registry';
import { shortcutLabel } from '@/lib/commands/shortcuts';
import {
	ZOOM_PRESETS,
	formatZoom,
	setViewerZoom,
	useViewStore,
} from '@/lib/viewer';
import { cn } from '../lib/utils';

const StatusIconButton: React.FC<{
	label: string;
	shortcut?: string | string[];
	active?: boolean;
	onClick: () => void;
	children: React.ReactNode;
}> = ({ label, shortcut, active, onClick, children }) => (
	<Tooltip message={label} shortcut={shortcut} placement='top'>
		<Button
			size='icon'
			variant='ghost'
			aria-label={label}
			aria-pressed={active}
			className={cn(
				'size-5 rounded-[4px] [&_svg]:size-3',
				active && 'bg-accent text-foreground',
			)}
			onClick={onClick}
		>
			{children}
		</Button>
	</Tooltip>
);

export const ViewPanel: React.FC = () => {
	const { viewerRef, theme, toggleTheme } = useContext(AppContext);
	const aspectRatio = useUIStore((state) => state.lockAspect);
	const zoom = useViewStore((state) => state.zoom);
	const snapping = useViewStore((state) => state.snapping);

	const fitShortcut = useCommandShortcut('view.fit');
	const actualSizeShortcut = useCommandShortcut('view.zoom-reset');
	const zoomInShortcut = useCommandShortcut('view.zoom-in');
	const zoomOutShortcut = useCommandShortcut('view.zoom-out');
	const snappingShortcut = useCommandShortcut('view.toggle-snapping');
	const lockShortcut = useCommandShortcut('view.lock-aspect');

	return (
		<div className='ml-auto flex items-center gap-0.5'>
			{!isElectron() && (
				<>
					<StatusIconButton
						label={theme === 'light' ? 'Dark theme' : 'Light theme'}
						onClick={toggleTheme}
					>
						{theme === 'light' ? <Moon /> : <Sun />}
					</StatusIconButton>

					<Separator orientation='vertical' className='mx-1 h-3' />
				</>
			)}

			<StatusIconButton
				label='Snap to guides'
				shortcut={snappingShortcut}
				active={snapping}
				onClick={() => runCommand('view.toggle-snapping')}
			>
				<Magnet />
			</StatusIconButton>

			<StatusIconButton
				label='Lock aspect ratio'
				shortcut={lockShortcut}
				active={aspectRatio}
				onClick={() => runCommand('view.lock-aspect')}
			>
				<Lock />
			</StatusIconButton>

			<Separator orientation='vertical' className='mx-1 h-3' />

			<StatusIconButton
				label='Zoom out'
				shortcut={zoomOutShortcut}
				onClick={() => runCommand('view.zoom-out')}
			>
				<ZoomOut />
			</StatusIconButton>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type='button'
						className='h-5 w-11 rounded-[4px] text-center font-mono text-[11px] tabular-nums hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground'
						aria-label='Zoom level'
					>
						{formatZoom(zoom)}
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side='top' align='end' className='min-w-44'>
					<DropdownMenuItem onSelect={() => runCommand('view.zoom-in')}>
						Zoom in
						<DropdownMenuShortcut>
							{shortcutLabel(zoomInShortcut)}
						</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => runCommand('view.zoom-out')}>
						Zoom out
						<DropdownMenuShortcut>
							{shortcutLabel(zoomOutShortcut)}
						</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => runCommand('view.fit')}>
						Zoom to fit
						<DropdownMenuShortcut>
							{shortcutLabel(fitShortcut)}
						</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => runCommand('view.zoom-reset')}>
						Zoom to 100%
						<DropdownMenuShortcut>
							{shortcutLabel(actualSizeShortcut)}
						</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					{ZOOM_PRESETS.map((preset) => (
						<DropdownMenuItem
							key={preset}
							onSelect={() => setViewerZoom(viewerRef, preset)}
							className='font-mono tabular-nums'
						>
							{formatZoom(preset)}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<StatusIconButton
				label='Zoom in'
				shortcut={zoomInShortcut}
				onClick={() => runCommand('view.zoom-in')}
			>
				<ZoomIn />
			</StatusIconButton>
		</div>
	);
};
