import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getRandomNumber } from '@/utils/getRandom';
import {
	AppWindow,
	Badge,
	Circle,
	CodeSquare,
	Crop,
	Ellipsis,
	Hand,
	Image,
	MousePointer2,
	QrCode,
	Smartphone,
	Sticker,
	Type,
	ChevronLeft,
	ChevronRight,
	Square,
	PenTool,
	Puzzle,
	Moon,
	Sun,
	LayoutTemplate,
	BoxSelect,
	X,
	Globe,
} from 'lucide-react';
import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { AppContext } from '../../AppContext';
import { useScreenDirection } from '../../hooks/useScreenDirection';
import { useWorkspaceStore, useControlsStore, useUIStore } from '../../stores';
import { isElectron } from '../../utils/isElectron';
import { Tooltip } from '../CustomControls/Tooltip';
import { Separator } from '../ui/separator';
import { IconBrandHtml5, IconBrandX, IconHtml } from '@tabler/icons-react';
import { ComponentsGalleryDialog } from '../Modals/ComponentsGalleryDialog';
import { useKComponentStore } from '../../stores/kcomponent-store';
import { KComponent } from '../../models/KComponent';
import { Package } from 'lucide-react';
import { useCommands } from '@/lib/commands/registry';

export const LeftPanel: React.FC = () => {
	/* App Store */
	const addControl = useControlsStore((state) => state.addControl);
	const addInitialProperty = useControlsStore(
		(state) => state.addInitialProperty,
	);
	const workspaceMode = useUIStore((state) => state.workspaceMode);
	const setWorkspaceMode = useUIStore((state) => state.setWorkspaceMode);
	const setWorkspaceTab = useUIStore((state) => state.setSelectedTab);
	const setEditing = useUIStore((state) => state.setEditing);
	const editing = useUIStore((state) => state.editing);
	const drag = useUIStore((state) => state.drag);
	const setDrag = useUIStore((state) => state.setDrag);
	const crop = useUIStore((state) => state.crop);
	const setCrop = useUIStore((state) => state.setCrop);
	const warp = useUIStore((state) => state.warp);
	const setWarp = useUIStore((state) => state.setWarp);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const currentWorkspaceID = useWorkspaceStore(
		(state) => state.currentWorkspaceID,
	);

	/* KComponent Store */
	const { importedComponents } = useKComponentStore();

	/* Component Gallery Dialog State */
	const [showComponentsDialog, setShowComponentsDialog] = useState(false);

	/* Component State */
	const isHorizontal = useScreenDirection();
	const { theme, toggleTheme } = useContext(AppContext);

	const [showMenu, setShowMenu] = useState(!isHorizontal);
	const [tab, setTab] = useState('hierarchy');
	const [visibleCount, setVisibleCount] = useState(10);

	const containerRef = useRef<HTMLDivElement>(null);

	// Handler to add imported component to canvas
	const handleAddKComponentToCanvas = (component: KComponent) => {
		const getElementsByType = (type: string) => {
			if (currentWorkspace !== undefined)
				return (
					currentWorkspace?.controls.filter((item) => item.type === type)
						?.length + 1
				);
		};

		// Create an HTML block with the imported component's content
		const controlId = `html-${getRandomNumber()}`;
		addControl(
			{
				type: 'html',
				id: controlId,
				isSelectable: true,
				isDeleted: false,
				name: component.manifest.name || `html ${getElementsByType('html')}`,
				isVisible: true,
			},
			currentWorkspaceID,
		);

		// Set the HTML, CSS, and JS content from the imported component
		// using the store's initialProperties mechanism
		addInitialProperty(
			{ id: `${controlId}-html`, value: component.html },
			currentWorkspaceID,
		);
		addInitialProperty(
			{ id: `${controlId}-css`, value: component.css },
			currentWorkspaceID,
		);
		addInitialProperty(
			{ id: `${controlId}-js`, value: component.js },
			currentWorkspaceID,
		);
	};

	// Tool configuration
	const tools = useMemo(() => {
		const getElementsByType = (type: string) => {
			if (currentWorkspace !== undefined)
				return (
					currentWorkspace?.controls.filter((item) => item.type === type)
						?.length + 1
				);
		};

		return [
			{
				id: 'select',
				icon: MousePointer2,
				label: 'Select',
				shortcut: 'V',
				action: () => {
					setEditing(true);
					setDrag(false);
					setCrop(false);
					setWarp(false);
				},
				isActive: editing && !crop && !warp,
			},
			{
				id: 'pan',
				icon: Hand,
				label: 'Pan',
				shortcut: 'H',
				action: () => {
					setEditing(false);
					setCrop(false);
					setWarp(false);
					setDrag(true);
				},
				isActive: drag,
			},
			{
				id: 'crop',
				icon: Crop,
				label: 'Crop',
				shortcut: 'C',
				action: () => {
					setDrag(false);
					setWarp(false);
					setCrop(true);
				},
				isActive: crop,
			},
			{
				id: 'warp',
				icon: BoxSelect,
				label: 'Warp',
				shortcut: 'W',
				action: () => {
					setDrag(false);
					setCrop(false);
					setWarp(!warp);
				},
				isActive: warp,
			},
			{
				id: 'code',
				icon: CodeSquare,
				label: 'Code',
				action: () => {
					addControl(
						{
							type: 'code',
							id: `code-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `code ${getElementsByType('code')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'image',
				icon: Image,
				label: 'Image',
				action: () => {
					addControl(
						{
							type: 'image',
							id: `image-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `image ${getElementsByType('image')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'icon',
				icon: Sticker,
				label: 'Icon',
				action: () => {
					addControl(
						{
							type: 'icon',
							id: `icon-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `icon ${getElementsByType('icon')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'text',
				icon: Type,
				label: 'Text',
				action: () => {
					const id = `text-${getRandomNumber()}`;
					// New text blocks fit their text.
					addInitialProperty(
						{ id: `${id}-sizing`, value: 'auto' },
						currentWorkspaceID,
					);
					addControl(
						{
							type: 'text',
							id,
							isSelectable: true,
							isDeleted: false,
							name: `text ${getElementsByType('text')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'shape',
				icon: Circle,
				label: 'Shape',
				action: () => {
					addControl(
						{
							type: 'shape',
							id: `shape-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `shape ${getElementsByType('shape')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'phone',
				icon: Smartphone,
				label: 'Phone',
				action: () => {
					addControl(
						{
							type: 'phone_mockup',
							id: `phone_mockup-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `phone mockup ${getElementsByType('phone_mockup')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'qr',
				icon: QrCode,
				label: 'QR Code',
				action: () => {
					addControl(
						{
							type: 'qr',
							id: `qr-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `qr ${getElementsByType('qr')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'badge',
				icon: Badge,
				label: 'Badge',
				action: () => {
					addControl(
						{
							type: 'badge',
							id: `badge-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `badge ${getElementsByType('badge')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'tweet',
				icon: IconBrandX,
				label: 'Tweet',
				action: () => {
					addControl(
						{
							type: 'tweet',
							id: `tweet-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `tweet ${getElementsByType('tweet')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'window',
				icon: AppWindow,
				label: 'Window',
				action: () => {
					addControl(
						{
							type: 'window',
							id: `window-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `window ${getElementsByType('window')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'html',
				icon: IconBrandHtml5,
				label: 'HTML',
				action: () => {
					addControl(
						{
							type: 'html',
							id: `html-${getRandomNumber()}`,
							isSelectable: true,
							isDeleted: false,
							name: `html ${getElementsByType('html')}`,
							isVisible: true,
						},
						currentWorkspaceID,
					);
				},
				isActive: false,
			},
			{
				id: 'components',
				icon: Package,
				label: 'Components',
				action: () => {
					setShowComponentsDialog(true);
				},
				isActive: false,
			},
		];
	}, [
		editing,
		crop,
		warp,
		drag,
		setEditing,
		setDrag,
		setCrop,
		setWarp,
		addControl,
		addInitialProperty,
		currentWorkspace,
		currentWorkspaceID,
	]);

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
