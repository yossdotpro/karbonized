import { Button } from '@/components/ui/button';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
	ArrowDown,
	ArrowUp,
	Boxes,
	ChevronDown,
	ChevronRight,
	Circle,
	Code2,
	EllipsisVertical,
	Eye,
	EyeOff,
	Folder,
	FolderInput,
	Image,
	Lock,
	LockOpen,
	Monitor,
	Copy,
	PenLine,
	QrCode,
	SendToBack,
	Shapes,
	SquareCode,
	Sticker,
	TextCursorInput,
	Trash2,
	Users,
} from 'lucide-react';
import React from 'react';
import type { Item } from '../../types';

type LayerDropPosition = 'before' | 'after' | 'inside';

interface MenuItemProps {
	item: Item;
	depth: number;
	isSelected: boolean;
	isFocused: boolean;
	isRenaming: boolean;
	dropPosition?: LayerDropPosition | null;
	childCount: number;
	onSelect: (item: Item, event: React.MouseEvent<HTMLDivElement>) => void;
	onRenameStart: (item: Item) => void;
	onRenameCommit: (value: string) => void;
	onRenameCancel: () => void;
	onToggleVisibility: (id: string) => void;
	onToggleLock: (id: string) => void;
	onDelete: (id: string) => void;
	onDuplicate: (id: string) => void;
	onGroup: (id: string) => void;
	onUngroup: (id: string) => void;
	onMoveStep: (id: string, direction: 'backward' | 'forward') => void;
	onMoveEdge: (id: string, position: 'back' | 'front') => void;
	onToggleCollapsed: (id: string) => void;
	onDragStart: (id: string) => void;
	onDragOver: (event: React.DragEvent<HTMLDivElement>, item: Item) => void;
	onDrop: (event: React.DragEvent<HTMLDivElement>, item: Item) => void;
	onDragEnd: () => void;
	renameValue: string;
	setRenameValue: (value: string) => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({
	item,
	depth,
	isSelected,
	isFocused,
	isRenaming,
	dropPosition,
	childCount,
	onSelect,
	onRenameStart,
	onRenameCommit,
	onRenameCancel,
	onToggleVisibility,
	onToggleLock,
	onDelete,
	onDuplicate,
	onGroup,
	onUngroup,
	onMoveStep,
	onMoveEdge,
	onToggleCollapsed,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
	renameValue,
	setRenameValue,
}) => {
	const isGroup = item.type === 'group';

	const renderActions = (mode: 'dropdown' | 'context') => {
		const ItemComponent =
			mode === 'dropdown' ? DropdownMenuItem : ContextMenuItem;
		const SeparatorComponent =
			mode === 'dropdown' ? DropdownMenuSeparator : ContextMenuSeparator;

		return (
			<>
				<ItemComponent
					onClick={(event: any) => {
						event.stopPropagation();
						onRenameStart(item);
					}}
				>
					<PenLine className='mr-2 size-4' />
					Rename layer
				</ItemComponent>
				{!isGroup && (
					<ItemComponent onClick={() => onGroup(item.id)}>
						<FolderInput className='mr-2 size-4' />
						Create group from layer
					</ItemComponent>
				)}
				{isGroup && (
					<ItemComponent onClick={() => onUngroup(item.id)}>
						<Users className='mr-2 size-4' />
						Ungroup
					</ItemComponent>
				)}
				<ItemComponent onClick={() => onDuplicate(item.id)}>
					<Copy className='mr-2 size-4' />
					Duplicate
				</ItemComponent>
				<SeparatorComponent />
				<ItemComponent onClick={() => onMoveStep(item.id, 'backward')}>
					<ChevronUpIcon />
					Move backward
				</ItemComponent>
				<ItemComponent onClick={() => onMoveStep(item.id, 'forward')}>
					<ChevronDownIcon />
					Move forward
				</ItemComponent>
				<ItemComponent onClick={() => onMoveEdge(item.id, 'front')}>
					<BringToFrontIcon />
					Bring to front
				</ItemComponent>
				<ItemComponent onClick={() => onMoveEdge(item.id, 'back')}>
					<SendToBack className='mr-2 size-4' />
					Send to back
				</ItemComponent>
				<SeparatorComponent />
				<ItemComponent
					onClick={() => onDelete(item.id)}
					className='text-destructive focus:text-destructive'
				>
					<Trash2 className='mr-2 size-4' />
					Delete
				</ItemComponent>
			</>
		);
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div className='relative'>
					{dropPosition === 'before' && (
						<div className='absolute -top-1 left-3 right-3 h-0.5 rounded-full bg-primary/80' />
					)}

					<div
						draggable
						onDragStart={() => onDragStart(item.id)}
						onDragOver={(event) => onDragOver(event, item)}
						onDrop={(event) => onDrop(event, item)}
						onDragEnd={onDragEnd}
						onClick={(event) => onSelect(item, event)}
						onDoubleClick={() => onRenameStart(item)}
						className={`group relative flex items-center gap-1.5 rounded-control border px-1 py-1 transition-colors ${
							isSelected
								? 'border-transparent bg-accent text-foreground'
								: isFocused
									? 'border-border bg-muted/60 text-foreground'
									: 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
						}`}
						style={{ marginLeft: depth * 14 }}
					>
						{dropPosition === 'inside' && (
							<div className='absolute inset-0 rounded-control border border-dashed border-ring bg-accent/40' />
						)}

						{isGroup ? (
							<Button
								type='button'
								variant='ghost'
								size='icon-xs'
								className='relative z-10'
								onClick={(event) => {
									event.stopPropagation();
									onToggleCollapsed(item.id);
								}}
							>
								{item.collapsed ? <ChevronRight /> : <ChevronDown />}
							</Button>
						) : (
							<div className='w-0 shrink-0' />
						)}

						<div
							className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-[5px] border [&_svg]:size-3.5 ${
								isGroup
									? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
									: 'border-border bg-card text-muted-foreground'
							}`}
						>
							<MenuIcon type={item.type} />
						</div>

						<div className='relative z-10 min-w-0 flex-1'>
							{isRenaming ? (
								<Input
									autoFocus
									value={renameValue}
									onChange={(event) => setRenameValue(event.target.value)}
									onClick={(event) => event.stopPropagation()}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											onRenameCommit(renameValue);
										} else if (event.key === 'Escape') {
											onRenameCancel();
										}
									}}
									onBlur={() => onRenameCommit(renameValue)}
									className='h-7 bg-background'
								/>
							) : (
								<>
									<p className='truncate text-[13px] text-foreground'>
										{item.name}
									</p>
									<div className='flex items-center gap-2 text-[11px] capitalize text-muted-foreground'>
										<span>
											{isGroup ? 'Group' : item.type.replace('_', ' ')}
										</span>
										{isGroup && <span>{childCount} items</span>}
										{item.locked && <span>Locked</span>}
										{!item.isVisible && <span>Hidden</span>}
									</div>
								</>
							)}
						</div>

						<div className='relative z-10 flex items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100'>
							<Button
								type='button'
								variant='ghost'
								size='icon-xs'
								onClick={(event) => {
									event.stopPropagation();
									onToggleVisibility(item.id);
								}}
							>
								{item.isVisible ? <Eye /> : <EyeOff />}
							</Button>

							<Button
								type='button'
								variant='ghost'
								size='icon-xs'
								onClick={(event) => {
									event.stopPropagation();
									onToggleLock(item.id);
								}}
							>
								{item.locked ? <Lock /> : <LockOpen />}
							</Button>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										type='button'
										variant='ghost'
										size='icon-xs'
										onClick={(event) => event.stopPropagation()}
									>
										<EllipsisVertical />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end' className='w-52'>
									{renderActions('dropdown')}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{dropPosition === 'after' && (
						<div className='absolute -bottom-1 left-3 right-3 h-0.5 rounded-full bg-primary/80' />
					)}
				</div>
			</ContextMenuTrigger>

			<ContextMenuContent className='w-52'>
				{renderActions('context')}
			</ContextMenuContent>
		</ContextMenu>
	);
};

const ChevronUpIcon = () => <ArrowUp className='mr-2 size-4' />;
const ChevronDownIcon = () => <ArrowDown className='mr-2 size-4' />;
const BringToFrontIcon = () => <Boxes className='mr-2 size-4' />;

export const MenuIcon: React.FC<{ type: string }> = ({ type }) => {
	switch (type) {
		case 'code':
			return <Code2 className='size-4' />;
		case 'text':
			return <TextCursorInput className='size-4' />;
		case 'qr':
			return <QrCode className='size-4' />;
		case 'image':
			return <Image className='size-4' />;
		case 'window':
			return <SquareCode className='size-4' />;
		case 'avatar':
			return <Users className='size-4' />;
		case 'shape':
			return <Circle className='size-4' />;
		case 'phone_mockup':
			return <Monitor className='size-4' />;
		case 'icon':
			return <Sticker className='size-4' />;
		case 'tweet':
			return <TextCursorInput className='size-4' />;
		case 'badge':
			return <Shapes className='size-4' />;
		case 'custom':
			return <PuzzleLikeIcon />;
		case 'group':
			return <Folder className='size-4' />;
		default:
			return <Boxes className='size-4' />;
	}
};

const PuzzleLikeIcon = () => <Sticker className='size-4' />;
