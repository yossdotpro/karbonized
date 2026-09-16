import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import React, { Suspense, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import { useWorkspaceStore, useControlsStore, useUIStore } from '../stores';
import Selecto from 'react-selecto';
import { useCommands } from '@/lib/commands/registry';
import { ShapeBar } from '@/components/Panels/ShapeBar';
import { Rulers } from '@/components/Base/Rulers';
import { BrushBar } from '@/components/Panels/BrushBar';
import { isEditableTarget } from '@/lib/commands/shortcuts';
import { redo, undo } from '@/lib/editor/history';
import { useBeedlyUI } from '@/lib/beedly/ui-store';
import {
	alignSelection,
	distributeSelection,
	getMovableSelection,
	nudgeSelection,
	selectAllControls,
} from '@/lib/canvas/selection';
import {
	fitViewer,
	setViewerZoom,
	useViewStore,
	zoomViewerBy,
} from '@/lib/viewer';
import {
	AlignCenterHorizontal,
	AlignCenterVertical,
	AlignEndHorizontal,
	AlignEndVertical,
	AlignHorizontalSpaceAround,
	AlignStartHorizontal,
	AlignStartVertical,
	AlignVerticalSpaceAround,
	BoxSelect,
	Brush,
	Copy,
	Magnet,
	Ruler,
	Trash2,
	Focus,
	Lock,
	Redo2,
	RotateCcw,
	Undo2,
	ZoomIn,
	ZoomOut,
} from 'lucide-react';

const Workspace = React.lazy(
	async () => await import('../components/Workspace'),
);
const StatusBar = React.lazy(
	async () => await import('../components/Base/StatusBar'),
);
const ColorPicker = React.lazy(
	async () => await import('../components/CustomControls/ColorPicker'),
);
const LeftPanel = React.lazy(
	async () => await import('../components/Panels/LeftPanel'),
);
const RightPanel = React.lazy(
	async () => await import('../components/Panels/RightPanel'),
);
const InfiniteViewer = React.lazy(
	async () => await import('react-infinite-viewer'),
);
const BeedlyPanel = React.lazy(
	async () => await import('../components/Beedly/BeedlyPanel'),
);
const BeedlyCommands = React.lazy(
	async () => await import('../components/Beedly/BeedlyCommands'),
);

export const Editor: React.FC = () => {
	const { viewerRef } = useContext(AppContext);
	const navigate = useNavigate();
	const workspaces = useWorkspaceStore((state) => state.workspaces);

	/* App Store */
	const duplicateControl = useControlsStore((state) => state.duplicateControl);
	const deleteControl = useControlsStore((state) => state.deleteControl);
	const activeTool = useUIStore((state) => state.activeTool);
	const drag = activeTool === 'pan';
	const crop = activeTool === 'crop';
	const aspectRatio = useUIStore((state) => state.lockAspect);
	const setAspectRatio = useUIStore((state) => state.setLockAspect);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const beedlyOpen = useBeedlyUI((state) => state.panelOpen);

	/* Copy/Paste System */
	const controlID = useControlsStore((state) => state.currentControlID);

	/* Component Store and Actions */

	const ref = useRef<HTMLDivElement>(null);
	const selectoRef = useRef<Selecto>(null);
	const selectedControlIDs = useControlsStore(
		(state) => state.selectedControlIDs,
	);

	/* Holding Space pans the canvas and releasing it goes back to the tool
	   that was active, the way every canvas editor does it. */
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code !== 'Space' || isEditableTarget(event.target)) return;
			// Space also scrolls the page.
			event.preventDefault();
			useUIStore.getState().holdTool('pan');
		};

		const onKeyUp = (event: KeyboardEvent) => {
			if (event.code !== 'Space') return;
			useUIStore.getState().releaseTool();
		};

		// The pointer may leave the window while Space is held.
		const onBlur = () => {
			useUIStore.getState().releaseTool();
		};

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
		};
	}, []);

	/* Keep the marquee's own selection in sync (Shift+drag continues it) */
	useEffect(() => {
		selectoRef.current?.setSelectedTargets(
			selectedControlIDs
				.map((id) => document.getElementById(id))
				.filter((element): element is HTMLElement => element !== null),
		);
	}, [selectedControlIDs]);

	const centerView = (): void => {
		if (currentWorkspace === undefined) return;

		fitViewer(
			viewerRef,
			{
				width: parseFloat(currentWorkspace.workspaceWidth),
				height: parseFloat(currentWorkspace.workspaceHeight),
			},
			document.querySelector<HTMLElement>('.viewer'),
		);
	};

	const hasSelection = () =>
		useControlsStore.getState().selectedControlIDs.length > 0;
	const selectionSize = () => getMovableSelection().length;

	/* Run a structural action on every selected control, in order */
	const forEachSelected = (
		action: (id: string, workspace: typeof currentWorkspace) => void,
	) => {
		useControlsStore.getState().selectedControlIDs.forEach((id) => {
			action(id, useWorkspaceStore.getState().currentWorkspace);
		});
	};

	const nudgeCommands = (
		[
			['left', 'ArrowLeft', -1, 0],
			['right', 'ArrowRight', 1, 0],
			['up', 'ArrowUp', 0, -1],
			['down', 'ArrowDown', 0, 1],
		] as const
	).flatMap(([direction, key, dx, dy]) => [
		{
			id: `edit.nudge-${direction}`,
			title: `Nudge ${direction}`,
			group: 'Edit' as const,
			shortcut: key,
			hidden: true,
			when: hasSelection,
			run: () => nudgeSelection(dx, dy),
		},
		{
			id: `edit.nudge-${direction}-large`,
			title: `Nudge ${direction} 10px`,
			group: 'Edit' as const,
			shortcut: `Shift+${key}`,
			hidden: true,
			when: hasSelection,
			run: () => nudgeSelection(dx * 10, dy * 10),
		},
	]);

	useCommands([
		...nudgeCommands,
		{
			id: 'edit.undo',
			title: 'Undo',
			group: 'Edit',
			icon: Undo2,
			shortcut: 'Mod+Z',
			run: () => void undo(),
		},
		{
			id: 'edit.redo',
			title: 'Redo',
			group: 'Edit',
			icon: Redo2,
			shortcut: ['Mod+Shift+Z', 'Mod+Y'],
			run: () => void redo(),
		},
		{
			id: 'edit.duplicate',
			title: 'Duplicate selection',
			group: 'Edit',
			icon: Copy,
			shortcut: 'Mod+D',
			when: hasSelection,
			run: () =>
				forEachSelected((id, workspace) =>
					duplicateControl(id, workspace, workspace?.id || ''),
				),
		},
		{
			id: 'edit.delete',
			title: 'Delete selection',
			group: 'Edit',
			icon: Trash2,
			shortcut: ['Delete', 'Backspace'],
			when: hasSelection,
			run: () =>
				forEachSelected((id, workspace) => deleteControl(id, workspace)),
		},
		{
			id: 'edit.select-all',
			title: 'Select all',
			group: 'Edit',
			icon: BoxSelect,
			shortcut: 'Mod+A',
			run: selectAllControls,
		},
		{
			id: 'edit.deselect',
			title: 'Deselect',
			group: 'Edit',
			shortcut: 'Escape',
			hidden: true,
			when: () =>
				hasSelection() || useUIStore.getState().activeTool !== 'select',
			run: () => {
				// Escape leaves the current tool first, then clears the selection.
				const { activeTool, setActiveTool } = useUIStore.getState();
				if (activeTool !== 'select') {
					setActiveTool('select');
					return;
				}
				useControlsStore.getState().setSelection([]);
			},
		},
		...(
			[
				['left', 'Align left', 'Alt+A', AlignStartVertical],
				['center', 'Align horizontal centers', 'Alt+H', AlignCenterVertical],
				['right', 'Align right', 'Alt+D', AlignEndVertical],
				['top', 'Align top', 'Alt+W', AlignStartHorizontal],
				['middle', 'Align vertical centers', 'Alt+V', AlignCenterHorizontal],
				['bottom', 'Align bottom', 'Alt+S', AlignEndHorizontal],
			] as const
		).map(([alignment, title, shortcut, icon]) => ({
			id: `arrange.align-${alignment}`,
			title,
			group: 'Edit' as const,
			icon,
			shortcut,
			keywords: ['align', 'arrange', 'canvas'],
			when: () => selectionSize() > 0,
			run: () => alignSelection(alignment),
		})),
		{
			id: 'arrange.distribute-horizontal',
			title: 'Distribute horizontal spacing',
			group: 'Edit',
			icon: AlignHorizontalSpaceAround,
			shortcut: 'Alt+Shift+H',
			keywords: ['distribute', 'spacing', 'arrange'],
			when: () => selectionSize() >= 3,
			run: () => distributeSelection('horizontal'),
		},
		{
			id: 'arrange.distribute-vertical',
			title: 'Distribute vertical spacing',
			group: 'Edit',
			icon: AlignVerticalSpaceAround,
			shortcut: 'Alt+Shift+V',
			keywords: ['distribute', 'spacing', 'arrange'],
			when: () => selectionSize() >= 3,
			run: () => distributeSelection('vertical'),
		},
		{
			id: 'view.toggle-rulers',
			title: useViewStore.getState().showRulers ? 'Hide rulers' : 'Show rulers',
			group: 'View',
			icon: Ruler,
			shortcut: 'Shift+R',
			keywords: ['ruler', 'guides', 'grid'],
			run: () => {
				const { showRulers, setShowRulers } = useViewStore.getState();
				setShowRulers(!showRulers);
			},
		},
		{
			id: 'view.clear-guides',
			title: 'Clear guides',
			group: 'View',
			icon: Ruler,
			keywords: ['ruler', 'guides'],
			when: () => {
				const { guides } = useViewStore.getState();
				return guides.vertical.length + guides.horizontal.length > 0;
			},
			run: () => {
				useViewStore.getState().clearGuides();
			},
		},
		{
			id: 'view.toggle-snapping',
			title: useViewStore.getState().snapping
				? 'Disable snapping'
				: 'Enable snapping',
			group: 'View',
			icon: Magnet,
			shortcut: 'Shift+S',
			keywords: ['guides', 'align', 'snap'],
			run: () => {
				const { snapping, setSnapping } = useViewStore.getState();
				setSnapping(!snapping);
			},
		},
		{
			id: 'view.lock-aspect',
			title: aspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio',
			group: 'Edit',
			icon: Lock,
			shortcut: 'Mod+Shift+L',
			keywords: ['proportion', 'ratio'],
			run: () => setAspectRatio(!aspectRatio),
		},
		{
			id: 'view.fit',
			title: 'Zoom to fit',
			group: 'View',
			icon: Focus,
			shortcut: 'Shift+1',
			keywords: ['center', 'fit', 'centrar'],
			run: centerView,
		},
		{
			id: 'view.zoom-in',
			title: 'Zoom in',
			group: 'View',
			icon: ZoomIn,
			shortcut: 'Mod+Plus',
			run: () => zoomViewerBy(viewerRef, 1),
		},
		{
			id: 'view.zoom-out',
			title: 'Zoom out',
			group: 'View',
			icon: ZoomOut,
			shortcut: 'Mod+Minus',
			run: () => zoomViewerBy(viewerRef, -1),
		},
		{
			id: 'view.zoom-reset',
			title: 'Zoom to 100%',
			group: 'View',
			icon: RotateCcw,
			shortcut: 'Shift+0',
			keywords: ['reset', 'actual size'],
			run: () => {
				setViewerZoom(viewerRef, 1);
				requestAnimationFrame(() => viewerRef.current?.scrollCenter());
			},
		},
	]);

	/* Redirect to /new if no workspaces exist */
	useEffect(() => {
		if (workspaces.length === 0) {
			navigate('/new');
		}
	}, [workspaces, navigate]);

	/* Fit the view when switching workspaces or changing the canvas size */
	useEffect(() => {
		centerView();
	}, [
		currentWorkspace?.id,
		currentWorkspace?.workspaceWidth,
		currentWorkspace?.workspaceHeight,
	]);

	return (
		<div className='flex h-full w-full flex-col overflow-hidden'>
			<div
				onContextMenu={(e) => {
					e.preventDefault();
				}}
				className='relative flex flex-auto flex-row overflow-hidden'
			>
				{/* Content */}
				<div className='relative flex flex-auto flex-col overflow-hidden md:flex-row'>
					{/* Settings of the tool that draws on the canvas */}
					{(activeTool === 'draw' ||
						activeTool === 'brush' ||
						activeTool === 'nodes') && (
						<div className='pointer-events-none absolute flex h-full w-full'>
							<div className='pointer-events-auto flex h-full w-full'>
								{activeTool === 'draw' ? (
									<ShapeBar></ShapeBar>
								) : activeTool === 'brush' ? (
									<BrushBar></BrushBar>
								) : (
									<div className='z-50 mb-12 ml-auto mr-auto mt-auto flex flex-row items-center gap-2 rounded-[10px] border border-border bg-popover px-3 py-1.5 text-[11px] text-muted-foreground shadow-lg shadow-black/20'>
										Pick a stroke, then drag a node to move it · click the
										stroke to add one · Alt+click to take one out
									</div>
								)}
							</div>
						</div>
					)}

					{/* Workspace */}
					<div
						className={`canvas-grid relative flex flex-auto flex-col ${drag && 'cursor-move'}`}
					>
						{/* Rulers and the guides dragged out of them */}
						<Rulers></Rulers>

						<InfiniteViewer
							ref={viewerRef}
							className='viewer flex flex-auto'
							useAutoZoom
							useMouseDrag={drag}
							useGesture
							usePinch={!drag}
							threshold={0}
							useResizeObserver
							useWheelScroll
							useWheelPinch
							useTransform
							wheelScale={0.002}
							maxPinchWheel={50}
							onPinch={({ zoom }: { zoom: number }) =>
								useViewStore.getState().setZoomValue(zoom)
							}
						>
							<div
								style={{
									width: currentWorkspace?.workspaceWidth + 'px',
									height: currentWorkspace?.workspaceHeight + 'px',
								}}
								className='viewport'
							>
								<Suspense
									fallback={
										<div className='flex items-center justify-center'>
											<Spinner className='size-5 text-muted-foreground' />
										</div>
									}
								>
									<Workspace reference={ref}></Workspace>
								</Suspense>
							</div>
						</InfiniteViewer>

						{/* Marquee selection: drag on an empty part of the canvas */}
						{!drag &&
							!crop &&
							activeTool !== 'draw' &&
							activeTool !== 'brush' &&
							activeTool !== 'nodes' && (
								<Selecto
									ref={selectoRef}
									dragContainer='.viewer'
									selectableTargets={['#workspace [data-block-id]']}
									hitRate={0}
									selectByClick
									selectFromInside={false}
									toggleContinueSelect='shift'
									ratio={0}
									dragCondition={(event) => {
										const target = event.inputEvent?.target as Element | null;
										// Blocks, selection handles and panels handle their own drags.
										return !target?.closest(
											'[data-block-id], .moveable-control-box, [data-radix-popper-content-wrapper]',
										);
									}}
									onSelectEnd={({ selected, isClick, inputEvent }) => {
										const ids = selected
											.map((element) => element.getAttribute('data-block-id'))
											.filter((id): id is string => Boolean(id))
											.filter((id) => {
												const control = currentWorkspace?.controls.find(
													(item) => item.id === id,
												);
												return (
													control &&
													!control.locked &&
													control.isVisible !== false
												);
											});

										// A plain click on empty canvas clears the selection.
										if (isClick && !inputEvent?.shiftKey && ids.length === 0) {
											useControlsStore.getState().setSelection([]);
											return;
										}

										useControlsStore.getState().setSelection(ids);
									}}
								/>
							)}
					</div>
				</div>

				{/* Panels */}
				<div className='pointer-events-none absolute flex h-full w-full'>
					{/* Left Panel */}
					<div className='pointer-events-auto flex max-w-xs'>
						<Suspense>
							<LeftPanel></LeftPanel>
						</Suspense>
					</div>

					{/* Right Panel */}
					<ResizablePanelGroup orientation='horizontal'>
						<ResizablePanel></ResizablePanel>
						<ResizableHandle className='w-0 bg-transparent' />
						<Suspense>
							<RightPanel></RightPanel>
						</Suspense>
						{beedlyOpen && (
							<>
								<ResizableHandle className='w-0 bg-transparent' />
								<Suspense>
									<BeedlyPanel />
								</Suspense>
							</>
						)}
					</ResizablePanelGroup>
				</div>
			</div>

			<Suspense>
				<BeedlyCommands />
			</Suspense>

			<StatusBar></StatusBar>
		</div>
	);
};

export default Editor;
