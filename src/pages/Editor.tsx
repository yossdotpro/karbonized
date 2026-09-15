import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import React, {
	Suspense,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import { Tooltip } from '../components/CustomControls/Tooltip';
import { useScreenDirection } from '../hooks/useScreenDirection';
import {
	useWorkspaceStore,
	useControlsStore,
	useHistoryStore,
	useUIStore,
	useDrawingStore,
} from '../stores';
import { getRandomNumber } from '../utils/getRandom';
import { useCommands } from '@/lib/commands/registry';
import {
	Brush,
	Copy,
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
	const workspaceMode = useUIStore((state) => state.workspaceMode);

	const redo = useHistoryStore((state) => state.redo);
	const undo = useHistoryStore((state) => state.undo);
	const controlState = useHistoryStore((state) => state.controlState);

	/* Component Store and Actions */
	const isHorizontal = useScreenDirection();

	const ref = useRef<HTMLDivElement>(null);

	const [zoom, setZoom] = useState(isHorizontal ? 0.9 : 0.4);

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
		if (currentWorkspace !== undefined) {
			const width = parseFloat(currentWorkspace?.workspaceWidth);

			if (isHorizontal) {
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
			} else {
				if (width < 1280) {
					viewerRef.current?.setZoom(0.6);
				} else if (width >= 1280 && width < 1920) {
					viewerRef.current?.setZoom(0.25);
				} else if (width >= 1920) {
					viewerRef.current?.setZoom(0.1);
				}
			}

			viewerRef.current?.scrollCenter();
		}
	};

	const zoomBy = (delta: number): void => {
		const zoom = viewerRef.current?.getZoom?.() ?? 1;
		viewerRef.current?.setZoom(Math.max(0.05, zoom + delta));
	};

	useCommands([
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
			run: () => zoomBy(0.2),
		},
		{
			id: 'view.zoom-out',
			title: 'Zoom out',
			group: 'View',
			icon: ZoomOut,
			shortcut: 'Mod+Minus',
			run: () => zoomBy(-0.2),
		},
		{
			id: 'view.zoom-reset',
			title: 'Reset zoom',
			group: 'View',
			icon: RotateCcw,
			shortcut: 'Shift+0',
			run: () => viewerRef.current?.setZoom(0.7),
		},
	]);

	/* Redirect to /new if no workspaces exist */
	useEffect(() => {
		if (workspaces.length === 0) {
			navigate('/new');
		}
	}, [workspaces, navigate]);

	/* Center view when the workspace, mode or aspect lock changes */
	useEffect(() => {
		centerView();
	}, [currentWorkspace, workspaceMode, aspectRatio]);

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

								{/* Zoom In */}
								<Tooltip className='hidden flex-auto ' message='Zoom In'>
									<Button
										className='flex flex-auto p-1'
										variant='ghost'
										size='icon'
										onClick={() => {
											setZoom(zoom + 0.2);
										}}
									>
										<ZoomIn size={15} className='text-foreground'></ZoomIn>
									</Button>
								</Tooltip>
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
