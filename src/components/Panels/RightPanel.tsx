import React, { useEffect, useState } from 'react';
import { usePanelRef } from 'react-resizable-panels';
import { useControlsStore, useUIStore } from '../../stores';
import { WorkspacePanel } from './WorkspacePanel';
import { ResizablePanel } from '../ui/resizable';
import { Button } from '../ui/button';
import {
	Braces,
	InspectionPanel,
	Layers,
	PanelRightClose,
	PanelRightOpen,
	SquarePen,
	SwatchBook,
	type LucideIcon,
} from 'lucide-react';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { HierarchyPanel } from './HierarchyPanel';
import { VariablesPanel } from './VariablesPanel';
import { BrandKitPanel } from './BrandKitPanel';
import { ArrangeBar } from './ArrangeBar';
import { Tooltip } from '../CustomControls/Tooltip';
import { useCommands } from '@/lib/commands/registry';
import type { SelectedTab } from '@/types';

type PanelTab = 'hierarchy' | 'control' | 'workspace' | 'variables' | 'brand';

const PANEL_TABS: Array<{
	id: PanelTab;
	label: string;
	command: string;
	icon: LucideIcon;
}> = [
	{ id: 'hierarchy', label: 'Hierarchy', command: 'Show layers', icon: Layers },
	{
		id: 'control',
		label: 'Control',
		command: 'Show control properties',
		icon: SquarePen,
	},
	{
		id: 'workspace',
		label: 'Workspace',
		command: 'Show workspace settings',
		icon: InspectionPanel,
	},
	{
		id: 'variables',
		label: 'Variables',
		command: 'Show project variables',
		icon: Braces,
	},
	{
		id: 'brand',
		label: 'Brand kit',
		command: 'Show brand kit',
		icon: SwatchBook,
	},
];

const isPanelTab = (tab: SelectedTab): tab is PanelTab =>
	PANEL_TABS.some((item) => item.id === tab);

/** A tab of the panel: its title and a scroll area filling the space left. */
const TabPage: React.FC<{
	title: string;
	children: React.ReactNode;
	before?: React.ReactNode;
	className?: string;
}> = ({ title, children, before, className }) => (
	<div
		className={`flex h-full min-h-0 flex-col overflow-hidden ${className ?? ''}`}
	>
		<Label className='flex h-8 shrink-0 select-none items-center px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
			{title}
		</Label>
		{before}
		{/* min-h-0, not h-full: the title and the bar above take part of the
		    height, and a full-height scroll area would hide its end below. */}
		<ScrollArea className='min-h-0 flex-1'>{children}</ScrollArea>
	</div>
);

export const RightPanel: React.FC = () => {
	/* App Store */
	const currentID = useControlsStore((state) => state.currentControlID);
	const workspaceTab = useUIStore((state) => state.selectedTab);
	const setWorkspaceTab = useUIStore((state) => state.setSelectedTab);

	/* Component State */
	const panel = usePanelRef();
	const showMenu = useUIStore((state) => state.propertiesOpen);
	const setShowMenu = useUIStore((state) => state.setPropertiesOpen);
	const [tab, setTab] = useState<PanelTab>('control');

	/* Show a tab, from its button, a command or elsewhere in the app (the
	   store's selected tab, e.g. the Brand kit menu item). */
	const showTab = (id: PanelTab) => {
		setTab(id);
		setShowMenu(true);
		setWorkspaceTab(id);
	};

	useCommands([
		{
			id: 'view.toggle-properties',
			title: showMenu ? 'Hide properties panel' : 'Show properties panel',
			group: 'View',
			icon: showMenu ? PanelRightClose : PanelRightOpen,
			shortcut: 'Mod+B',
			allowInInput: true,
			run: () => setShowMenu(!useUIStore.getState().propertiesOpen),
		},
		...PANEL_TABS.map(({ id, command, icon }) => ({
			id: `view.panel-${id}`,
			title: command,
			group: 'View' as const,
			icon,
			run: () => showTab(id),
		})),
	]);

	useEffect(() => {
		// The panel registers its constraints with the group after mount, so
		// defer the call and ignore it if the group is not ready yet.
		const frame = requestAnimationFrame(() => {
			try {
				if (showMenu) {
					panel.current?.expand();
				} else {
					panel.current?.collapse();
				}
			} catch {
				/* panel not registered yet */
			}
		});

		return () => cancelAnimationFrame(frame);
	}, [showMenu]);

	const [syncedTab, setSyncedTab] = useState(workspaceTab);
	if (workspaceTab !== syncedTab) {
		setSyncedTab(workspaceTab);
		if (isPanelTab(workspaceTab)) setTab(workspaceTab);
	}

	return (
		<ResizablePanel
			className={'min-w-16'}
			collapsible
			collapsedSize={54}
			defaultSize={340}
			maxSize={600}
			minSize={120}
			panelRef={panel}
			// Keep its width when the agent opens and the canvas area narrows.
			groupResizeBehavior='preserve-pixel-size'
		>
			<div
				// Zoom to fit leaves the canvas clear of it.
				data-canvas-overlay
				className={`pointer-events-auto mr-auto flex h-full w-full gap-1.5 overflow-hidden border-l border-border bg-sidebar p-1.5 text-foreground`}
			>
				{/* Selectors */}
				<div className='flex shrink-0 flex-col gap-0.5'>
					<Tooltip
						message={showMenu ? 'Collapse panel' : 'Expand panel'}
						shortcut='Mod+B'
						placement='left'
					>
						<Button
							variant={'ghost'}
							size={'icon'}
							aria-label={showMenu ? 'Collapse panel' : 'Expand panel'}
							onClick={() => {
								setShowMenu(!showMenu);
							}}
							className='mb-1'
						>
							{showMenu ? (
								<PanelRightClose size={16} />
							) : (
								<PanelRightOpen size={16} />
							)}
						</Button>
					</Tooltip>

					{PANEL_TABS.map((item) => {
						const isActive = tab === item.id && showMenu;
						const Icon = item.icon;

						return (
							<Tooltip key={item.id} message={item.label} placement='left'>
								<Button
									variant='ghost'
									size='icon'
									aria-label={item.label}
									aria-pressed={isActive}
									onClick={() => showTab(item.id)}
									className={
										isActive
											? 'bg-accent text-foreground hover:bg-accent'
											: undefined
									}
								>
									<Icon size={16} />
								</Button>
							</Tooltip>
						);
					})}
				</div>

				{/* Tab Panels */}
				<div
					className={`relative flex-auto flex-col min-h-0 overflow-hidden ${!showMenu ? 'hidden' : 'flex'}`}
				>
					{/* Controls: always mounted, the block menus render into #menu */}
					<TabPage
						title='Control'
						before={<ArrangeBar />}
						className={tab === 'control' ? 'flex' : 'hidden'}
					>
						<div className='p-1' id='menu'></div>
						{currentID === '' && (
							<div className='flex h-64 flex-auto items-center justify-center'>
								<p className='select-none text-center text-[13px] text-muted-foreground'>
									Select a control to start editing it
								</p>
							</div>
						)}
					</TabPage>

					{tab === 'workspace' && (
						<TabPage title='Workspace'>
							<div className='p-1'>
								<WorkspacePanel></WorkspacePanel>
							</div>
						</TabPage>
					)}

					{tab === 'variables' && (
						<TabPage title='Variables'>
							<VariablesPanel />
						</TabPage>
					)}

					{tab === 'brand' && (
						<TabPage title='Brand kit'>
							<BrandKitPanel />
						</TabPage>
					)}

					{tab === 'hierarchy' && (
						<TabPage title='Hierarchy'>
							<HierarchyPanel></HierarchyPanel>
						</TabPage>
					)}
				</div>
			</div>
		</ResizablePanel>
	);
};

export default RightPanel;
