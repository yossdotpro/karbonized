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
import {
	useWorkspaceStore,
	useControlsStore,
	useHistoryStore,
	useUIStore,
	useDrawingStore,
} from '../stores';
import { useCommands } from '@/lib/commands/registry';
import {
	fitViewer,
	setViewerZoom,
	useViewStore,
	zoomViewerBy,
} from '@/lib/viewer';
import {
	Brush,
	Copy,
	Magnet,
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

export const Editor: React.FC = () => {
	const { viewerRef } = useContext(AppContext);
	const navigate = useNavigate();
	const workspaces = useWorkspaceStore((state) => state.workspaces);

	/* App Store */
	const duplicateControl = useControlsStore((state) => state.duplicateControl);
	const deleteControl = useControlsStore((state) => state.deleteControl);
	const setCurrentControlID = useControlsStore(
		(state) => state.setCurrentControlID,
	);
	const setControlPos = useControlsStore((state) => state.setControlPosition);
	const setControlSize = useControlsStore((state) => state.setControlSize);
	const setControlTransform = useControlsStore(
		(state) => state.setControlTransform,
	);
	const drag = useUIStore((state) => state.drag);
	const canDraw = useDrawingStore((state) => state.isDrawing);
	const isErasing = useDrawingStore((state) => state.isErasing);
	const lineWidth = useDrawingStore((state) => state.lineWidth);
	const strokeColor = useDrawingStore((state) => state.strokeColor);
	const setStrokeColor = useDrawingStore((state) => state.setStrokeColor);
	const setLineWidth = useDrawingStore((state) => state.setLineWidth);
	const aspectRatio = useUIStore((state) => state.lockAspect);
	const setAspectRatio = useUIStore((state) => state.setLockAspect);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const setWorkspaceControls = useWorkspaceStore(
		(state) => state.setWorkspaceControls,
	);

	/* Copy/Paste System */
	const controlID = useControlsStore((state) => state.currentControlID);

	const redo = useHistoryStore((state) => state.redo);
	const undo = useHistoryStore((state) => state.undo);
	const controlState = useHistoryStore((state) => state.controlState);

	/* Component Store and Actions */

	const ref = useRef<HTMLDivElement>(null);

	const applyHistoryResult = (
		result:
			| {
					type: 'workspace-update';
					snapshot: { controls: any[]; currentControlID: string };
					historyId: string;
			  }
			| {
					type: 'control-update';
					historyId: string;
			  }
			| undefined,
	) => {
		if (result?.type === 'workspace-update') {
			setWorkspaceControls(result.snapshot.controls);
			setCurrentControlID(result.snapshot.currentControlID);
			return;
		}

		if (result?.type !== 'control-update' || controlState == null) return;

		if (controlState.id.endsWith('-pos')) {
			setControlPos(controlState.value);
			return;
		}

		if (controlState.id.endsWith('-control_size')) {
			setControlSize(controlState.value);
			return;
		}

		if (controlState.id.endsWith('-transform')) {
			setControlTransform(controlState.value);
		}
	};

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

	/* Move the selected block with the arrow keys (Shift for 10px) */
	const nudgeSelection = (dx: number, dy: number): void => {
		const { currentControlID, controlPosition, setControlPosition } =
			useControlsStore.getState();
		const control = useWorkspaceStore
			.getState()
			.currentWorkspace?.controls.find((item) => item.id === currentControlID);

		if (!control || control.locked || !controlPosition) return;

		const history = useHistoryStore.getState();
		const id = `${currentControlID}-pos`;
		const next = {
			x: Number(controlPosition.x) + dx,
			y: Number(controlPosition.y) + dy,
		};

		history.setPast([...history.pastHistory, { id, value: controlPosition }]);
		history.setControlState({ id, value: next });
		history.setFuture([]);
		setControlPosition(next);
	};

	const hasSelection = () =>
		useControlsStore.getState().currentControlID !== '';

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
			run: () => applyHistoryResult(undo()),
		},
		{
			id: 'edit.redo',
			title: 'Redo',
			group: 'Edit',
			icon: Redo2,
			shortcut: ['Mod+Shift+Z', 'Mod+Y'],
			run: () => applyHistoryResult(redo()),
		},
		{
			id: 'edit.duplicate',
			title: 'Duplicate selection',
			group: 'Edit',
			icon: Copy,
			shortcut: 'Mod+D',
			when: () => useControlsStore.getState().currentControlID !== '',
			run: () =>
				duplicateControl(
					controlID,
					currentWorkspace,
					currentWorkspace?.id || '',
				),
		},
		{
			id: 'edit.delete',
			title: 'Delete selection',
			group: 'Edit',
			icon: Trash2,
			shortcut: ['Delete', 'Backspace'],
			when: () => useControlsStore.getState().currentControlID !== '',
			run: () => deleteControl(controlID, currentWorkspace),
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
					{/* Draw Bar */}
					{(canDraw || isErasing) && (
						<div className=' absolute flex h-full w-full'>
							<div className='z-50 mb-12 ml-auto mr-4 mt-auto flex flex-row items-center gap-1 rounded-[10px] border border-border bg-popover px-2 py-1 shadow-lg shadow-black/20'>
								{/* Stroke Range */}
								<Brush
									size={16}
									className='mx-1 my-auto text-muted-foreground'
								></Brush>
								<Slider
									className='my-auto flex flex-auto p-1'
									min={0}
									max={100}
									step={1}
									value={[lineWidth]}
									onValueChange={(value) => {
										setLineWidth(value[0]);
									}}
								/>

								<ColorPicker
									isGradientEnable={false}
									color={strokeColor}
									onColorChange={setStrokeColor}
									showLabel={false}
									placement='right-end'
									label='Color'
								></ColorPicker>
							</div>
						</div>
					)}

					{/* Workspace */}
					<div
						className={`canvas-grid flex flex-auto flex-col ${drag && 'cursor-move'}`}
					>
						{/* Ruler Horizontal */}
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
					</ResizablePanelGroup>
				</div>
			</div>

			<StatusBar></StatusBar>
		</div>
	);
};

export default Editor;
