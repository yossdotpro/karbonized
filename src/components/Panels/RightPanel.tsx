import React, { useEffect, useState } from 'react';
import { usePanelRef } from 'react-resizable-panels';
import { useControlsStore, useUIStore } from '../../stores';
import { WorkspacePanel } from './WorkspacePanel';
import { ResizablePanel } from '../ui/resizable';
import { Button } from '../ui/button';
import {
	InspectionPanel,
	Layers,
	PanelRightClose,
	PanelRightOpen,
	SquarePen,
} from 'lucide-react';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { HierarchyPanel } from './HierarchyPanel';
import { ArrangeBar } from './ArrangeBar';
import { Tooltip } from '../CustomControls/Tooltip';
import { useCommands } from '@/lib/commands/registry';

export const RightPanel: React.FC = () => {
	/* App Store */
	const currentID = useControlsStore((state) => state.currentControlID);
	const workspaceTab = useUIStore((state) => state.selectedTab);
	const setWorkspaceTab = useUIStore((state) => state.setSelectedTab);

	/* Component State */
	const panel = usePanelRef();
	const [showMenu, setShowMenu] = useState(true);
	const [tab, setTab] = useState<'workspace' | 'control' | 'hierarchy'>(
		'control',
	);

	const workspaceMode = useUIStore((state) => state.workspaceMode);
	const setWorkspaceMode = useUIStore((state) => state.setWorkspaceMode);

	useCommands([
		{
			id: 'view.toggle-properties',
			title: showMenu ? 'Hide properties panel' : 'Show properties panel',
			group: 'View',
			icon: showMenu ? PanelRightClose : PanelRightOpen,
			shortcut: 'Mod+B',
			allowInInput: true,
			run: () => {
				setShowMenu((current) => !current);
				setWorkspaceMode('custom');
			},
		},
		...(
			[
				['hierarchy', 'Show layers', Layers],
				['control', 'Show control properties', SquarePen],
				['workspace', 'Show workspace settings', InspectionPanel],
			] as const
		).map(([id, title, icon]) => ({
			id: `view.panel-${id}`,
			title,
			group: 'View' as const,
			icon,
			run: () => {
				setTab(id);
				setWorkspaceMode('custom');
				setShowMenu(true);
				if (id === 'workspace') setWorkspaceTab('workspace');
			},
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

	const [syncedMode, setSyncedMode] = useState(workspaceMode);
	if (workspaceMode !== syncedMode) {
		setSyncedMode(workspaceMode);
		if (workspaceMode === 'edit') {
			setShowMenu(true);
		} else if (workspaceMode !== 'custom') {
			setShowMenu(false);
		}
	}

	const [syncedTab, setSyncedTab] = useState(workspaceTab);
	if (workspaceTab !== syncedTab) {
		setSyncedTab(workspaceTab);
		if (workspaceTab === 'control') setTab('control');
	}

	return (
		<ResizablePanel
			className={'min-w-16'}
			collapsible
			collapsedSize={54}
			defaultSize={500}
			maxSize={600}
			minSize={120}
			panelRef={panel}
		>
			<div
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
								setWorkspaceMode('custom');
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

					{[
						{ id: 'hierarchy', icon: <Layers size={16} />, label: 'Hierarchy' },
						{ id: 'control', icon: <SquarePen size={16} />, label: 'Control' },
						{
							id: 'workspace',
							icon: <InspectionPanel size={16} />,
							label: 'Workspace',
						},
					].map((item) => {
						const isActive = tab === item.id && showMenu;

						return (
							<Tooltip
								key={item.id}
								message={`${item.label} Settings`}
								placement='left'
							>
								<Button
									variant='ghost'
									size='icon'
									aria-label={item.label}
									aria-pressed={isActive}
									onClick={() => {
										setTab(item.id as any);
										setWorkspaceMode('custom');
										setShowMenu(true);
										if (item.id === 'workspace') setWorkspaceTab('workspace');
									}}
									className={
										isActive
											? 'bg-accent text-foreground hover:bg-accent'
											: undefined
									}
								>
									{item.icon}
								</Button>
							</Tooltip>
						);
					})}
				</div>

				{/* Tab Panels */}
				<div
					className={`relative flex-auto flex-col min-h-0 overflow-hidden ${!showMenu ? 'hidden' : 'flex'}`}
				>
					{/* Controls */}
					<div
						className={`flex h-full min-h-0 flex-col overflow-hidden ${tab === 'control' ? 'flex' : 'hidden'}`}
					>
						<Label className='flex h-8 shrink-0 select-none items-center px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
							Control
						</Label>
						<ArrangeBar />
						<ScrollArea className='flex-1 h-full'>
							{/* Menu Portal Container - always in DOM when control tab is active */}
							<div className='p-1' id='menu'></div>
							{currentID === '' && (
								<div className='flex h-64 flex-auto items-center justify-center'>
									<p className='select-none text-center text-[13px] text-muted-foreground'>
										Select a control to start editing it
									</p>
								</div>
							)}
						</ScrollArea>
					</div>

					{/* Workspace */}
					{tab === 'workspace' && (
						<div className='flex h-full min-h-0 flex-col overflow-hidden'>
							<Label className='flex h-8 shrink-0 select-none items-center px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
								Workspace
							</Label>
							<ScrollArea className='flex-1 p-1 h-full'>
								<WorkspacePanel></WorkspacePanel>
							</ScrollArea>
						</div>
					)}

					{/* Hierarchy */}
					{tab === 'hierarchy' && (
						<div className='flex h-full min-h-0 flex-col overflow-hidden'>
							<Label className='flex h-8 shrink-0 select-none items-center px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
								Hierarchy
							</Label>
							<ScrollArea className='flex-1 h-full'>
								<HierarchyPanel></HierarchyPanel>
							</ScrollArea>
						</div>
					)}
				</div>
			</div>
		</ResizablePanel>
	);
};

export default RightPanel;
