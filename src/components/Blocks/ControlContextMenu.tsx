import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { Slider } from '@/components/ui/slider';
import {
	ArrowDown,
	ArrowDownToLine,
	ArrowUp,
	ArrowUpToLine,
	Copy,
	EyeOff,
	ImageDown,
	Lock,
	Sparkles,
	Trash2,
} from 'lucide-react';
import React, { type ReactNode } from 'react';
import { shortcutLabel } from '@/lib/commands/shortcuts';

interface ControlContextMenuProps {
	opacity: number;
	setOpacity: (value: number) => void;
	exportAsPng: () => Promise<void>;
	exportAsJpeg: () => Promise<void>;
	exportAsSvg: () => Promise<void>;
	onCreateDynamicBackground?: () => Promise<void> | void;
	contextMenu?: ReactNode;
	setID: (value: string) => void;
	removeControl: () => void;
	onDuplicate?: () => void;
	onMoveStep?: (direction: 'forward' | 'backward') => void;
	onMoveEdge?: (position: 'front' | 'back') => void;
	onHide?: () => void;
	onToggleLock?: () => void;
	locked?: boolean;
	children: ReactNode;
}

export const ControlContextMenu: React.FC<ControlContextMenuProps> = ({
	opacity,
	setOpacity,
	exportAsPng,
	exportAsJpeg,
	exportAsSvg,
	onCreateDynamicBackground,
	contextMenu,
	setID,
	removeControl,
	onDuplicate,
	onMoveStep,
	onMoveEdge,
	onHide,
	onToggleLock,
	locked = false,
	children,
}) => {
	const hasLayerActions = onMoveStep !== undefined || onMoveEdge !== undefined;

	return (
		<ContextMenu>
			{children}
			<ContextMenuContent className='w-56'>
				{/* Opacity */}
				<div className='flex items-center gap-3 px-2 pb-2 pt-1.5'>
					<span className='text-xs text-muted-foreground'>Opacity</span>
					<Slider
						className='flex-1'
						min={0}
						max={100}
						onValueChange={(value) => {
							setOpacity(value[0]);
						}}
						value={[opacity]}
					/>
					<span className='w-8 text-right font-mono text-[11px] tabular-nums text-muted-foreground'>
						{Math.round(opacity)}%
					</span>
				</div>

				<ContextMenuSeparator />

				{onDuplicate && (
					<ContextMenuItem onSelect={onDuplicate}>
						<Copy />
						Duplicate
						<ContextMenuShortcut>{shortcutLabel('Mod+D')}</ContextMenuShortcut>
					</ContextMenuItem>
				)}

				{hasLayerActions && (
					<ContextMenuSub>
						<ContextMenuSubTrigger>
							<ArrowUpToLine />
							Arrange
						</ContextMenuSubTrigger>
						<ContextMenuSubContent className='w-48'>
							{onMoveEdge && (
								<ContextMenuItem onSelect={() => onMoveEdge('front')}>
									<ArrowUpToLine />
									Bring to front
								</ContextMenuItem>
							)}
							{onMoveStep && (
								<>
									<ContextMenuItem onSelect={() => onMoveStep('forward')}>
										<ArrowUp />
										Bring forward
									</ContextMenuItem>
									<ContextMenuItem onSelect={() => onMoveStep('backward')}>
										<ArrowDown />
										Send backward
									</ContextMenuItem>
								</>
							)}
							{onMoveEdge && (
								<ContextMenuItem onSelect={() => onMoveEdge('back')}>
									<ArrowDownToLine />
									Send to back
								</ContextMenuItem>
							)}
						</ContextMenuSubContent>
					</ContextMenuSub>
				)}

				{(onHide || onToggleLock) && (
					<>
						{onHide && (
							<ContextMenuItem onSelect={onHide}>
								<EyeOff />
								Hide
							</ContextMenuItem>
						)}
						{onToggleLock && (
							<ContextMenuItem onSelect={onToggleLock}>
								<Lock />
								{locked ? 'Unlock' : 'Lock'}
							</ContextMenuItem>
						)}
					</>
				)}

				<ContextMenuSeparator />

				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<ImageDown />
						Export layer
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className='w-40'>
						<ContextMenuItem onSelect={() => void exportAsPng()}>
							PNG
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => void exportAsJpeg()}>
							JPEG
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => void exportAsSvg()}>
							SVG
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>

				{onCreateDynamicBackground !== undefined && (
					<ContextMenuItem onSelect={() => void onCreateDynamicBackground()}>
						<Sparkles />
						Create dynamic background
					</ContextMenuItem>
				)}

				{contextMenu !== undefined && (
					<>
						<ContextMenuSeparator />
						{contextMenu}
					</>
				)}

				<ContextMenuSeparator />

				<ContextMenuItem
					variant='destructive'
					onSelect={() => {
						setID('');
						removeControl();
					}}
				>
					<Trash2 />
					Delete
					<ContextMenuShortcut>{shortcutLabel('Delete')}</ContextMenuShortcut>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
};
