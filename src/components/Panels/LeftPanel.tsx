import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	BoxSelect,
	ChevronLeft,
	ChevronRight,
	Crop,
	Ellipsis,
	Hand,
	LayoutTemplate,
	Moon,
	MousePointer2,
	Package,
	PenTool,
	Puzzle,
	Square,
	Sun,
} from 'lucide-react';
import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { AppContext } from '../../AppContext';
import { useScreenDirection } from '../../hooks/useScreenDirection';
import { useUIStore } from '../../stores';
import type { EditorTool } from '../../stores/ui-store';
import { isElectron } from '../../utils/isElectron';
import { Tooltip } from '../CustomControls/Tooltip';
import { Separator } from '../ui/separator';
import { ComponentsGalleryDialog } from '../Modals/ComponentsGalleryDialog';
import { KComponent } from '../../models/KComponent';
import { useCommands } from '@/lib/commands/registry';
import { INSERTABLE_BLOCKS } from '@/lib/blocks/registry';
import { addBlock } from '@/lib/editor/actions';
import { toast } from 'sonner';

export const LeftPanel: React.FC = () => {
	/* App Store */
	const workspaceMode = useUIStore((state) => state.workspaceMode);
	const setWorkspaceMode = useUIStore((state) => state.setWorkspaceMode);
	const setWorkspaceTab = useUIStore((state) => state.setSelectedTab);
	const activeTool = useUIStore((state) => state.activeTool);
	const setActiveTool = useUIStore((state) => state.setActiveTool);

	/* Component Gallery Dialog State */
	const [showComponentsDialog, setShowComponentsDialog] = useState(false);

	/* Component State */
	const isHorizontal = useScreenDirection();
	const { theme, toggleTheme } = useContext(AppContext);

	const [showMenu, setShowMenu] = useState(!isHorizontal);
	const [tab, setTab] = useState('hierarchy');
	const [visibleCount, setVisibleCount] = useState(10);

	const containerRef = useRef<HTMLDivElement>(null);

	/** Put an imported component on the canvas as an HTML block. */
	const handleAddKComponentToCanvas = (component: KComponent) => {
		try {
			addBlock({
				type: 'html',
				name: component.manifest.name,
				properties: {
					html: component.html,
					css: component.css,
					js: component.js,
				},
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'The component was not added',
			);
		}
	};

	const tools = useMemo(() => {
		/* Picking the active tool again goes back to Select, so every tool can
		   be turned off with its own button or shortcut. */
		const pickTool = (tool: EditorTool) => () => {
			setActiveTool(activeTool === tool && tool !== 'select' ? 'select' : tool);
		};

		return [
			{
				id: 'select',
				icon: MousePointer2,
				label: 'Select',
				shortcut: 'V',
				action: pickTool('select'),
				isActive: activeTool === 'select',
			},
			{
				id: 'pan',
				icon: Hand,
				label: 'Pan',
				shortcut: 'H',
				action: pickTool('pan'),
				isActive: activeTool === 'pan',
			},
			{
				id: 'crop',
				icon: Crop,
				label: 'Crop',
				shortcut: 'C',
				action: pickTool('crop'),
				isActive: activeTool === 'crop',
			},
			{
				id: 'warp',
				icon: BoxSelect,
				label: 'Warp',
				shortcut: 'W',
				action: pickTool('warp'),
				isActive: activeTool === 'warp',
			},
			/* Every block type comes from the registry, so a new block only
			   has to be added there */
			...INSERTABLE_BLOCKS.map((block) => ({
				id: block.type,
				icon: block.icon,
				label: block.label,
				shortcut: undefined as string | undefined,
				action: () => {
					try {
						addBlock({ type: block.type });
					} catch (error) {
						toast.error(
							error instanceof Error
								? error.message
								: 'The block was not added',
						);
					}
				},
				isActive: false,
			})),
			{
				id: 'components',
				icon: Package,
				label: 'Components',
				shortcut: undefined as string | undefined,
				action: () => {
					setShowComponentsDialog(true);
				},
				isActive: false,
			},
		];
	}, [activeTool, setActiveTool]);

	// Calculate visible tools based on screen height
	useEffect(() => {
		const updateVisibleCount = () => {
			if (containerRef.current) {
				const containerHeight = containerRef.current.clientHeight;
				const itemHeight = 34; // Button height + gap
				const separatorHeight = 20;
				const availableHeight = containerHeight - separatorHeight;
				const maxVisible = Math.floor(availableHeight / itemHeight);
				setVisibleCount(Math.max(3, maxVisible)); // Minimum 3 visible items
			}
		};

		updateVisibleCount();
		window.addEventListener('resize', updateVisibleCount);
		return () => window.removeEventListener('resize', updateVisibleCount);
	}, []);

	const visibleTools = tools.slice(0, visibleCount);
	const overflowTools = tools.slice(visibleCount);

	/* Tools and inserts are available from shortcuts and the command palette */
	useCommands(
		tools.map((tool, index) => ({
			id: `tools.${tool.id}`,
			title:
				index < 4
					? `${tool.label} tool`
					: tool.id === 'components'
						? 'Open component gallery'
						: `Add ${tool.label.toLowerCase()}`,
			group: index < 4 ? 'Tools' : 'Insert',
			icon: tool.icon,
			shortcut: tool.shortcut,
			keywords: ['insert', 'add', 'block', tool.id],
			run: tool.action,
		})),
	);

	const [syncedMode, setSyncedMode] = useState(workspaceMode);
	if (workspaceMode !== syncedMode) {
		setSyncedMode(workspaceMode);
		if (workspaceMode === 'design') {
			setShowMenu(true);
			setTab('hierarchy');
		} else if (workspaceMode !== 'custom') {
			setShowMenu(false);
		}
	}

	return (
		<div
			className='pointer-events-auto z-30 mr-auto flex h-full w-5/6 grow-0 flex-col justify-center gap-1 overflow-hidden p-2 py-4 text-foreground md:w-fit md:max-w-40'
			ref={containerRef}
		>
			{/* Controls */}
			<div className='flex w-fit flex-col items-center gap-0.5 rounded-[10px] border border-border bg-popover p-1 text-foreground shadow-lg shadow-black/5 dark:shadow-black/30'>
				{visibleTools.map((tool, index) => (
					<React.Fragment key={tool.id}>
						<Tooltip message={tool.label} shortcut={tool.shortcut}>
							<Button
								onClick={tool.action}
								variant='ghost'
								size='icon'
								aria-label={tool.label}
								aria-pressed={tool.isActive}
								className={
									tool.isActive
										? 'bg-accent text-foreground hover:bg-accent'
										: undefined
								}
							>
								<tool.icon size={16} strokeWidth={1.75} />
							</Button>
						</Tooltip>
						{index === 3 && (
							<Separator
								orientation='horizontal'
								className='my-1 h-px w-5 bg-border'
							/>
						)}
					</React.Fragment>
				))}

				{overflowTools.length > 0 && (
					<>
						<Separator
							orientation='horizontal'
							className='my-1 h-px w-5 bg-border'
						/>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									size={'icon'}
									variant={'ghost'}
									aria-label='More controls'
								>
									<Ellipsis size={16}></Ellipsis>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent side='right'>
								<DropdownMenuLabel>More Controls</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{overflowTools.map((tool) => (
									<DropdownMenuItem key={tool.id} onClick={tool.action}>
										<tool.icon className='size-4 shrink-0' />
										{tool.label}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				)}
			</div>

			{/* Tabs */}
			<div className='hidden flex-auto overflow-y-auto'>
				{/* Selectors */}
				<div className='flex flex-auto flex-col gap-2 text-foreground'>
					{/* Theme Button */}
					{!isHorizontal && (
						<Button
							className='mx-auto mb-2 rounded-xl'
							size='icon'
							variant='ghost'
							onClick={() => {
								toggleTheme();
							}}
						>
							{theme === 'light' ? (
								<Moon className='size-4 text-foreground'></Moon>
							) : (
								<Sun className='size-4 text-foreground'></Sun>
							)}
						</Button>
					)}

					{/* Hierarchy */}
					<Tooltip message='Hierarchy'>
						<Button
							variant={tab === 'hierarchy' && showMenu ? 'default' : 'ghost'}
							size='icon'
							onClick={() => {
								setWorkspaceMode('custom');
								setTab('hierarchy');
								setShowMenu(true);
							}}
							className='rounded-xl'
						>
							<Square className='mx-auto size-4'></Square>
						</Button>
					</Tooltip>

					{/* Extensions */}
					{isElectron() && (
						<Tooltip message='Extensions'>
							<Button
								variant={tab === 'extensions' && showMenu ? 'default' : 'ghost'}
								size='icon'
								onClick={() => {
									setWorkspaceMode('custom');
									setTab('extensions');

									/* Load Extension and App Data */
									(window as any).electron.ipcRenderer.sendMessage(
										'getAppData',
										'',
									);

									setShowMenu(true);
								}}
								className='rounded-xl'
							>
								<Puzzle className='mx-auto size-4'></Puzzle>
							</Button>
						</Tooltip>
					)}

					{/* Show/Close Menu */}
					{isHorizontal && (
						<Tooltip message='Show/Close Menu'>
							<Button
								variant='ghost'
								size='icon'
								onClick={() => {
									setWorkspaceMode('custom');
									setTab('hierarchy');
									setShowMenu(!showMenu);
								}}
								className='rounded-xl'
							>
								{showMenu ? (
									<ChevronLeft className='size-4'></ChevronLeft>
								) : (
									<ChevronRight className='mx-auto size-4'></ChevronRight>
								)}
							</Button>
						</Tooltip>
					)}

					{/* Edit */}
					{!isHorizontal && (
						<Tooltip message='Edit'>
							<Button
								variant={tab === 'control' && showMenu ? 'default' : 'ghost'}
								size='icon'
								onClick={() => {
									setTab('control');
									setWorkspaceMode('custom');
									setShowMenu(true);
								}}
								className='rounded-xl'
							>
								<PenTool className='mx-auto size-4'></PenTool>
							</Button>
						</Tooltip>
					)}

					{/* Workspace */}
					{!isHorizontal && (
						<Tooltip message='Workspace'>
							<Button
								variant={tab === 'workspace' && showMenu ? 'default' : 'ghost'}
								size='icon'
								onClick={() => {
									setTab('workspace');
									setWorkspaceMode('custom');
									setWorkspaceTab('workspace');
									setShowMenu(true);
								}}
								className='rounded-xl'
							>
								<LayoutTemplate className='mx-auto size-4'></LayoutTemplate>
							</Button>
						</Tooltip>
					)}
				</div>
			</div>

			{/* Components Gallery Dialog */}
			<ComponentsGalleryDialog
				open={showComponentsDialog}
				onOpenChange={setShowComponentsDialog}
				onAddToCanvas={handleAddKComponentToCanvas}
			/>
		</div>
	);
};

export default LeftPanel;
