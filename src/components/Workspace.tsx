import { useViewStore } from '@/lib/viewer';
/* eslint-disable array-callback-return */
import React, {
	useRef,
	type RefObject,
	Suspense,
	useLayoutEffect,
	useMemo,
	useState,
} from 'react';
import {
	useWorkspaceStore,
	useControlsStore,
	useUIStore,
	useHistoryStore,
} from '../stores';
import { ControlHandler } from './Blocks/ControlHandler';
import { MeshGradient } from './Misc/MeshGradient';
import { LavaLampBackground } from './Misc/LavaLampBackground';
import { StarfieldBackground } from './Misc/StarfieldBackground';
import { GalaxyBackground } from './Misc/GalaxyBackground';
import Moveable, {
	type OnDrag,
	type OnResize,
	type OnResizeStart,
	type OnResizeEnd,
	type OnScale,
	type OnRotate,
	type OnScaleGroup,
	type OnDragGroup,
	type OnResizeGroup,
	type OnRotateGroup,
	type OnRotateStart,
	type OnWarpStart,
	type OnWarp,
} from 'react-moveable';
import WorkspaceTexture from './WorkspaceTexture';
import { Wallpapers } from '../utils/wallpapers';
import noiseTexture from '../assets/noisy.png';
import { addBlock, readProperty } from '@/lib/editor/actions';
import { boxFromDrag, isDrawn, toCanvasPoint } from '@/lib/canvas/drawing';
import {
	type StrokePoint,
	outlinePath,
	parsePoints,
	serializePoints,
	smoothPath,
	strokeFromPoints,
} from '@/lib/canvas/stroke';
import {
	type NodeFrame,
	canvasToNode,
	insertNode,
	moveNode,
	nodeAt,
	nodeToCanvas,
	removeNode,
} from '@/lib/canvas/nodes';
import { toast } from 'sonner';
import type { TextSizing } from '@/lib/blocks/catalog';
import { isTextSizing, sizingAfterResize } from '@/lib/blocks/text-sizing';

interface Props {
	reference: RefObject<HTMLDivElement>;
}

type DrawPoint = { x: number; y: number };
type DrawBox = { x: number; y: number; width: number; height: number };

interface TargetSnapshot {
	pos: { x: number; y: number };
	size: { w: number; h: number };
	transform: string;
	clip: string;
	sizing: TextSizing | undefined;
}
export const Workspace: React.FC<Props> = ({ reference }) => {
	/* App Store */
	const controlID = useControlsStore((state) => state.currentControlID);
	const selectedControlIDs = useControlsStore(
		(state) => state.selectedControlIDs,
	);
	const commitBatch = useHistoryStore((state) => state.commitBatch);
	/** Box of each target when a gesture starts, to record it as one step. */
	const gestureStart = useRef<Record<string, TargetSnapshot>>({});
	/** A text block being resized: its box and sizing mode before the drag. */
	const textResize = useRef<{
		size: { w: number; h: number };
		sizing: TextSizing;
		nextSizing: TextSizing;
		style: { width: string; height: string };
	} | null>(null);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const currentControls = currentWorkspace?.controls ?? [];
	const currentControl = useMemo(() => {
		return currentControls.find((item) => item.id === controlID);
	}, [currentControls, controlID]);

	const controlsClass = useMemo(() => {
		const controlsClass: string[] = [];
		currentControls.forEach((item) => {
			if (item.id !== controlID) {
				controlsClass.push('.block-' + item.id);
			}
		});
		return controlsClass;
	}, [currentControls, controlID]);
	const controlProperties = useControlsStore(
		(state) => state.ControlProperties,
	);

	const activeTool = useUIStore((state) => state.activeTool);
	const drawShape = useUIStore((state) => state.drawShape);
	const brushColor = useUIStore((state) => state.brushColor);
	const brushSize = useUIStore((state) => state.brushSize);
	const brushSmoothing = useUIStore((state) => state.brushSmoothing);
	const brushThinning = useUIStore((state) => state.brushThinning);
	const setActiveTool = useUIStore((state) => state.setActiveTool);
	// Panning and drawing hide the handles; cropping and warping replace what
	// a drag does.
	const editing =
		activeTool !== 'pan' &&
		activeTool !== 'draw' &&
		activeTool !== 'brush' &&
		activeTool !== 'nodes';
	const crop = activeTool === 'crop';
	const warp = activeTool === 'warp';
	const draw = activeTool === 'draw';
	const brush = activeTool === 'brush';
	const editingNodes = activeTool === 'nodes';
	const lockAspect = useUIStore((state) => state.lockAspect);
	const snapping = useViewStore((state) => state.snapping);
	const isExporting = useUIStore((state) => state.isExporting);
	const exportTransparent = useUIStore((state) => state.exportTransparent);

	const workspaces = useWorkspaceStore((state) => state.workspaces);
	const currentWorkspaceID = useWorkspaceStore(
		(state) => state.currentWorkspaceID,
	);

	const setControlTransform = useControlsStore(
		(state) => state.setControlTransform,
	);
	const setControlSize = useControlsStore((state) => state.setControlSize);
	const setControlPos = useControlsStore((state) => state.setControlPosition);
	const setControlProperties = useControlsStore(
		(state) => state.setControlProperties,
	);

	const blurAmount = useMemo(
		() => currentWorkspace?.workspaceBlur ?? 0,
		[currentWorkspace],
	);
	const noiseAmount = useMemo(
		() => currentWorkspace?.workspaceNoise ?? 0,
		[currentWorkspace],
	);
	const blurSpread = useMemo(() => Math.max(blurAmount * 2, 0), [blurAmount]);
	const dynamicColors = useMemo(
		() => currentWorkspace?.workspaceDynamicSettings.colors ?? [],
		[currentWorkspace],
	);

	const workspaceBaseBackground = useMemo(() => {
		return currentWorkspace?.workspaceType === 'dynamic' &&
			dynamicColors.length > 0
			? `linear-gradient(135deg, ${dynamicColors[0]}, ${
					dynamicColors[1] ?? dynamicColors[0]
				}, ${dynamicColors[2] ?? dynamicColors[1] ?? dynamicColors[0]})`
			: currentWorkspace?.workspaceColorMode === 'Single'
				? currentWorkspace?.workspaceColor
				: `linear-gradient(${currentWorkspace?.workspaceGradientSettings.deg}deg, ${currentWorkspace?.workspaceGradientSettings.color1},${currentWorkspace?.workspaceGradientSettings.color2})`;
	}, [currentWorkspace, dynamicColors]);

	const getGroupDescendantIds = (
		controls: Array<{
			id: string;
			parentId?: string | null;
			type: string;
			isDeleted?: boolean;
			isVisible?: boolean;
		}>,
		groupId: string,
	): string[] => {
		const children = controls.filter(
			(item) => (item.parentId ?? null) === groupId && !item.isDeleted,
		);

		return children.flatMap((child) =>
			child.type === 'group'
				? getGroupDescendantIds(controls, child.id)
				: child.isVisible === false
					? []
					: [child.id],
		);
	};

	const groupTargetIds = useMemo(() => {
		if (currentControl?.type !== 'group') return [];

		return getGroupDescendantIds(currentControls, currentControl.id);
	}, [currentControl, currentControls]);

	const canTransformControl =
		currentControl !== undefined &&
		!currentControl.locked &&
		!currentControl.isDeleted &&
		Boolean(currentControl.isVisible);
	const showMoveable = selectedControlIDs.length > 1 || canTransformControl;

	const [moveableTarget, setMoveableTarget] = useState<
		HTMLElement | HTMLElement[] | null
	>(null);

	useLayoutEffect(() => {
		/* Ids of the blocks the handles act on: the selection, the blocks of a
		   group, or the selected block. */
		const ids: string[] =
			selectedControlIDs.length > 1
				? selectedControlIDs.flatMap((id) => {
						const control = currentControls.find((item) => item.id === id);
						if (
							!control ||
							control.locked ||
							control.isDeleted ||
							control.isVisible === false
						) {
							return [];
						}
						return control.type === 'group'
							? getGroupDescendantIds(currentControls, control.id)
							: [control.id];
					})
				: !canTransformControl
					? []
					: currentControl.type === 'group'
						? groupTargetIds
						: [controlID];

		if (ids.length === 0) {
			/* eslint-disable-next-line react-hooks/set-state-in-effect -- the handles
			   follow the selection in the same layout pass, before paint */
			setMoveableTarget(null);
			return;
		}

		const asGroup = ids.length > 1 || selectedControlIDs.length > 1;
		let frame = 0;
		let cancelled = false;
		let attempts = 0;

		/* Blocks mount asynchronously (they are lazy loaded), so a missing one
		   is retried on the next frame. The first attempt is synchronous: it
		   must not depend on frames, which do not run while the window is
		   hidden. */
		const resolve = () => {
			if (cancelled) return;

			const targets = ids
				.map((id) => document.getElementById(id))
				.filter((item): item is HTMLElement => item !== null);

			if (targets.length === ids.length || attempts >= 20) {
				setMoveableTarget(
					targets.length === 0 ? null : asGroup ? targets : targets[0],
				);
				return;
			}

			attempts += 1;
			frame = window.requestAnimationFrame(resolve);
		};

		resolve();

		return () => {
			cancelled = true;
			window.cancelAnimationFrame(frame);
		};
	}, [
		controlID,
		currentControl,
		groupTargetIds,
		currentControls,
		currentWorkspaceID,
		selectedControlIDs,
		canTransformControl,
	]);

	const snapshotTargets = (targets: Array<HTMLElement | SVGElement>) => {
		gestureStart.current = Object.fromEntries(
			targets.map((target) => [
				target.id,
				{
					pos: readTargetPosition(target),
					size: readTargetSize(target),
					transform: readTargetTransform(target),
					clip: (target as HTMLElement).style.clipPath,
					sizing: textSizingOf(target.id),
				},
			]),
		);
	};

	/**
	 * Record what a gesture changed on its targets as one undoable step.
	 * `resized` also stores the fixed sizing text blocks switch to. Returns
	 * whether anything changed.
	 */
	const commitGesture = (
		targets: Array<HTMLElement | SVGElement>,
		keys: ReadonlyArray<'pos' | 'size' | 'transform' | 'clip'>,
		resized = false,
	): boolean => {
		const start = gestureStart.current;
		gestureStart.current = {};

		const changes = targets.flatMap((target) => {
			const before = start[target.id];
			if (!before) return [];

			const after: TargetSnapshot = {
				pos: readTargetPosition(target),
				size: readTargetSize(target),
				transform: readTargetTransform(target),
				clip: (target as HTMLElement).style.clipPath,
				sizing: before.sizing,
			};
			const ids = {
				pos: `${target.id}-pos`,
				size: `${target.id}-control_size`,
				transform: `${target.id}-transform`,
				clip: `${target.id}-clip`,
			};

			const changed: Array<{ id: string; previous: unknown; next: unknown }> =
				keys
					.filter(
						(key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
					)
					.map((key) => ({
						id: ids[key],
						previous: before[key],
						next: after[key],
					}));

			if (
				resized &&
				changed.length > 0 &&
				before.sizing &&
				before.sizing !== 'fixed'
			) {
				changed.push({
					id: `${target.id}-sizing`,
					previous: before.sizing,
					next: 'fixed',
				});
			}

			return changed;
		});

		commitBatch(changes);
		return changes.length > 0;
	};

	const syncGroupTargetsToStore = (
		targets: Array<HTMLElement | SVGAElement>,
		/** Blocks were resized: content-sized text blocks keep the new box. */
		resized = false,
	): void => {
		const nextProperties = [...controlProperties];

		const upsertProperty = (id: string, value: unknown) => {
			const index = nextProperties.findIndex((item) => item.id === id);
			const property = {
				id,
				value,
				workspace: currentWorkspaceID,
			};

			if (index === -1) {
				nextProperties.push(property);
			} else {
				nextProperties[index] = property;
			}
		};

		targets.forEach((target) => {
			const targetId = target.id;

			upsertProperty(`${targetId}-pos`, {
				x: parseFloat(target.style.left.replace('px', '')),
				y: parseFloat(target.style.top.replace('px', '')),
			});
			upsertProperty(`${targetId}-control_size`, readTargetSize(target));
			upsertProperty(`${targetId}-transform`, target.style.transform);

			const sizing = textSizingOf(targetId);
			if (resized && sizing && sizing !== 'fixed') {
				upsertProperty(`${targetId}-sizing`, 'fixed');
			}
		});

		setControlProperties(nextProperties);
	};

	const renderWorkspaceBackground = (useBlurCompensation = false) => {
		const sizeStyle = useBlurCompensation
			? {
					height: `calc(100% + ${blurSpread * 2}px)`,
					width: `calc(100% + ${blurSpread * 2}px)`,
					left: `-${blurSpread}px`,
					top: `-${blurSpread}px`,
				}
			: {
					height: currentWorkspace?.workspaceHeight + 'px',
					width: currentWorkspace?.workspaceWidth + 'px',
				};

		return (
			<>
				<div
					className='absolute inset-0'
					style={{
						background: workspaceBaseBackground,
					}}
				/>

				{currentWorkspace?.workspaceType === 'texture' && (
					<div className='absolute overflow-hidden' style={sizeStyle}>
						<Suspense fallback={<></>}>
							<WorkspaceTexture
								texture={currentWorkspace?.textureName}
							></WorkspaceTexture>
						</Suspense>
					</div>
				)}

				{currentWorkspace?.workspaceType === 'image' && (
					<div
						className='absolute overflow-hidden transition-all'
						style={sizeStyle}
					>
						<img
							className='flex h-full w-full select-none object-cover'
							src={
								Wallpapers.find(
									(item) => item.id === currentWorkspace?.textureName,
								)?.img
							}
						></img>
					</div>
				)}

				{currentWorkspace?.workspaceType === 'dynamic' && (
					<div className='absolute overflow-hidden' style={sizeStyle}>
						<Suspense fallback={<div />}>
							{currentWorkspace?.workspaceDynamicType === 'mesh' ? (
								<MeshGradient
									colors={currentWorkspace?.workspaceDynamicSettings.colors}
									blur={currentWorkspace?.workspaceBlur}
									seed={currentWorkspace?.workspaceDynamicSettings.seed}
									width={
										parseInt(currentWorkspace?.workspaceWidth || '512') +
										blurSpread * 2
									}
									height={
										parseInt(currentWorkspace?.workspaceHeight || '512') +
										blurSpread * 2
									}
								/>
							) : currentWorkspace?.workspaceDynamicType === 'lava' ? (
								<LavaLampBackground
									colors={currentWorkspace?.workspaceDynamicSettings.colors}
									blur={currentWorkspace?.workspaceBlur}
									seed={currentWorkspace?.workspaceDynamicSettings.seed}
									width={
										parseInt(currentWorkspace?.workspaceWidth || '512') +
										blurSpread * 2
									}
									height={
										parseInt(currentWorkspace?.workspaceHeight || '512') +
										blurSpread * 2
									}
								/>
							) : currentWorkspace?.workspaceDynamicType === 'starfield' ? (
								<StarfieldBackground
									colors={currentWorkspace?.workspaceDynamicSettings.colors}
									blur={currentWorkspace?.workspaceBlur}
									seed={currentWorkspace?.workspaceDynamicSettings.seed}
									width={
										parseInt(currentWorkspace?.workspaceWidth || '512') +
										blurSpread * 2
									}
									height={
										parseInt(currentWorkspace?.workspaceHeight || '512') +
										blurSpread * 2
									}
								/>
							) : (
								<GalaxyBackground
									colors={currentWorkspace?.workspaceDynamicSettings.colors}
									blur={currentWorkspace?.workspaceBlur}
									seed={currentWorkspace?.workspaceDynamicSettings.seed}
									width={
										parseInt(currentWorkspace?.workspaceWidth || '512') +
										blurSpread * 2
									}
									height={
										parseInt(currentWorkspace?.workspaceHeight || '512') +
										blurSpread * 2
									}
								/>
							)}
						</Suspense>
					</div>
				)}
			</>
		);
	};

	const readTargetPosition = (target: HTMLElement | SVGElement) => ({
		x: parseFloat(target.style.left.replace('px', '')),
		y: parseFloat(target.style.top.replace('px', '')),
	});

	const readTargetSize = (target: HTMLElement | SVGElement) => {
		const element = target as HTMLElement;
		const w = parseFloat(element.style.width);
		const h = parseFloat(element.style.height);
		// Content-sized blocks (auto width or height) have no pixel size set.
		return {
			w: Number.isFinite(w) ? w : element.offsetWidth,
			h: Number.isFinite(h) ? h : element.offsetHeight,
		};
	};

	const textSizingOf = (id: string): TextSizing | undefined => {
		if (currentControls.find((item) => item.id === id)?.type !== 'text') {
			return undefined;
		}
		const stored = readProperty(`${id}-sizing`).value;
		return isTextSizing(stored) ? stored : 'fixed';
	};

	const readTargetTransform = (target: HTMLElement | SVGElement) =>
		target.style.transform;

	const parseCssSize = (value: string): number | undefined => {
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	};

	const clampResizeDimensions = (
		target: HTMLElement | SVGElement,
		width: number,
		height: number,
	) => {
		const style = window.getComputedStyle(target as Element);
		const minWidth = parseCssSize(style.minWidth);
		const minHeight = parseCssSize(style.minHeight);
		const maxWidth = parseCssSize(style.maxWidth);
		const maxHeight = parseCssSize(style.maxHeight);

		const nextWidth =
			maxWidth !== undefined
				? Math.min(
						minWidth !== undefined ? Math.max(width, minWidth) : width,
						maxWidth,
					)
				: minWidth !== undefined
					? Math.max(width, minWidth)
					: width;

		const nextHeight =
			maxHeight !== undefined
				? Math.min(
						minHeight !== undefined ? Math.max(height, minHeight) : height,
						maxHeight,
					)
				: minHeight !== undefined
					? Math.max(height, minHeight)
					: height;

		return {
			width: nextWidth,
			height: nextHeight,
		};
	};

	/* Drawing a shape: the drag is followed here and the block is created when
	   it ends, so the canvas shows the shape exactly where it was drawn. */
	const canvasSize = {
		width: parseFloat(currentWorkspace?.workspaceWidth ?? '0'),
		height: parseFloat(currentWorkspace?.workspaceHeight ?? '0'),
	};
	const drawStart = useRef<DrawPoint | null>(null);
	const [drawBox, setDrawBox] = useState<DrawBox | null>(null);

	const canvasRect = () => {
		const element = document.getElementById('workspace');
		if (!element) return null;
		const rect = element.getBoundingClientRect();
		return {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height,
		};
	};

	const pointerBox = (event: React.PointerEvent, start: DrawPoint) => {
		const rect = canvasRect();
		if (!rect) return null;

		return boxFromDrag(
			start,
			toCanvasPoint(event, rect, canvasSize),
			canvasSize,
			{ square: event.shiftKey, fromCenter: event.altKey },
		);
	};

	const onDrawStart = (event: React.PointerEvent<HTMLDivElement>) => {
		const rect = canvasRect();
		if (!rect || event.button !== 0) return;

		try {
			// Keeps the drag alive outside the canvas; not every pointer can be
			// captured (synthetic events, some pens), and that is not fatal.
			event.currentTarget.setPointerCapture(event.pointerId);
		} catch {
			/* the drag still works without capture */
		}
		drawStart.current = toCanvasPoint(event, rect, canvasSize);
		setDrawBox(null);
	};

	const onDrawMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const start = drawStart.current;
		if (!start) return;

		const box = pointerBox(event, start);
		if (box) setDrawBox(box);
	};

	const onDrawEnd = (event: React.PointerEvent<HTMLDivElement>) => {
		const start = drawStart.current;
		drawStart.current = null;
		if (!start) return;

		const box = pointerBox(event, start) ?? drawBox;
		setDrawBox(null);

		try {
			// A click, without a real drag, drops the shape at its default size.
			const drawn = box && isDrawn(box);
			const block = addBlock({
				type: 'shape',
				properties: { shape: drawShape },
				...(drawn
					? { x: box.x, y: box.y, width: box.width, height: box.height }
					: {}),
			});
			useControlsStore.getState().setSelection([block.id]);
			useControlsStore.getState().setCurrentControlID(block.id);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'The shape was not drawn',
			);
		}

		// One shape per drag, as in every editor: back to the select tool.
		setActiveTool('select');
	};

	/* Brush: the points the pointer goes through become a vector stroke when
	   the drag ends. The live path is drawn from the same points. */
	const brushPoints = useRef<StrokePoint[]>([]);
	const [brushPath, setBrushPath] = useState('');

	/* While drawing, the line is painted the same way the block will paint it:
	   an outline when it thins, a plain stroke when it does not. */
	const brushOutline = brushThinning > 0;
	const paintBrush = (points: StrokePoint[]) => {
		setBrushPath(
			brushOutline
				? outlinePath(points, {
						width: brushSize,
						thinning: brushThinning / 100,
						taper: brushSize * 1.5,
					})
				: smoothPath(points),
		);
	};

	const brushPointAt = (
		event: { clientX: number; clientY: number; pressure?: number },
		rect: { left: number; top: number; width: number; height: number },
	): StrokePoint => ({
		...toCanvasPoint(event, rect, canvasSize),
		pressure: event.pressure,
	});

	const onBrushStart = (event: React.PointerEvent<HTMLDivElement>) => {
		const rect = canvasRect();
		if (!rect || event.button !== 0) return;

		try {
			event.currentTarget.setPointerCapture(event.pointerId);
		} catch {
			/* the stroke still works without capture */
		}
		brushPoints.current = [brushPointAt(event.nativeEvent, rect)];
		paintBrush(brushPoints.current);
	};

	const onBrushMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (brushPoints.current.length === 0) return;

		const rect = canvasRect();
		if (!rect) return;

		// Coalesced events keep the curve faithful on a fast stroke; not every
		// pointer reports them, and then the event itself is the only point.
		const coalesced =
			typeof event.nativeEvent.getCoalescedEvents === 'function'
				? event.nativeEvent.getCoalescedEvents()
				: [];
		const moves = coalesced.length > 0 ? coalesced : [event.nativeEvent];

		moves.forEach((move) => {
			brushPoints.current.push(brushPointAt(move, rect));
		});
		paintBrush(brushPoints.current);
	};

	const onBrushEnd = () => {
		const points = brushPoints.current;
		brushPoints.current = [];
		setBrushPath('');
		if (points.length === 0) return;

		const stroke = strokeFromPoints(points, {
			smoothing: brushSmoothing,
			padding: brushSize / 2 + 1,
		});
		if (!stroke) return;

		try {
			const block = addBlock({
				type: 'drawing',
				x: Math.round(stroke.box.x),
				y: Math.round(stroke.box.y),
				width: Math.max(4, Math.round(stroke.box.width)),
				height: Math.max(4, Math.round(stroke.box.height)),
				properties: {
					path: stroke.path,
					// The points travel with the block, so its width and thinning
					// can still be changed once it is drawn.
					points: serializePoints(stroke.points),
					thinning: brushThinning,
					viewWidth: Math.max(4, Math.round(stroke.box.width)),
					viewHeight: Math.max(4, Math.round(stroke.box.height)),
					strokeColor: brushColor,
					strokeWidth: brushSize,
				},
			});
			// The brush stays armed, so several strokes can be drawn in a row.
			useControlsStore.getState().setSelection([block.id]);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'The stroke was not drawn',
			);
		}
	};

	/* Editing the nodes of a stroke: the points of the selected block are
	   shown on the canvas and can be dragged, added and taken out. */
	const strokeBlock =
		editingNodes && currentControl?.type === 'drawing'
			? currentControl
			: undefined;

	const nodeFrame: NodeFrame | undefined = useMemo(() => {
		if (!strokeBlock) return undefined;

		const position = readProperty(`${strokeBlock.id}-pos`).value as
			{ x: number; y: number } | undefined;
		const size = readProperty(`${strokeBlock.id}-control_size`).value as
			{ w: number; h: number } | undefined;
		const viewWidth = Number(
			readProperty(`${strokeBlock.id}-viewWidth`).value ?? size?.w ?? 100,
		);
		const viewHeight = Number(
			readProperty(`${strokeBlock.id}-viewHeight`).value ?? size?.h ?? 100,
		);

		return {
			x: position?.x ?? 0,
			y: position?.y ?? 0,
			width: size?.w ?? viewWidth,
			height: size?.h ?? viewHeight,
			viewWidth,
			viewHeight,
		};
		// The stored values are read again whenever the block changes.
	}, [strokeBlock, controlProperties]);

	/** The points as they are stored right now, for the handlers. */
	const readStrokePoints = (): StrokePoint[] =>
		strokeBlock
			? parsePoints(readProperty(`${strokeBlock.id}-points`).value)
			: [];

	/* The handles are drawn from the stored points, which change on every
	   move: reading them again is what keeps the handles under the pointer. */
	const strokePoints = useMemo(
		() => readStrokePoints(),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[strokeBlock, controlProperties],
	);

	/** The node being dragged and the stroke as it was when the drag started. */
	const nodeDrag = useRef<{
		index: number;
		points: StrokePoint[];
		path: string;
	} | null>(null);

	/** Write the points and the path of the stroke without recording a step. */
	const applyStrokePoints = (points: StrokePoint[]) => {
		if (!strokeBlock) return;

		const controls = useControlsStore.getState();
		controls.addControlProperty(
			{ id: `${strokeBlock.id}-points`, value: serializePoints(points) },
			currentWorkspaceID,
		);
		controls.addControlProperty(
			{ id: `${strokeBlock.id}-path`, value: smoothPath(points) },
			currentWorkspaceID,
		);
	};

	/** Record what a node edit changed as one undoable step. */
	const commitStrokePoints = (
		points: StrokePoint[],
		previous: {
			points: StrokePoint[];
			path: string;
		},
	) => {
		if (!strokeBlock) return;

		const path = smoothPath(points);
		if (path === previous.path) return;

		commitBatch([
			{
				id: `${strokeBlock.id}-points`,
				previous: serializePoints(previous.points),
				next: serializePoints(points),
			},
			{ id: `${strokeBlock.id}-path`, previous: previous.path, next: path },
		]);
	};

	const onNodePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		const rect = canvasRect();
		if (!rect || !nodeFrame || !strokeBlock || event.button !== 0) return;

		const point = toCanvasPoint(event, rect, canvasSize);
		const points = readStrokePoints();
		const index = nodeAt(points, point, nodeFrame, 12);
		const previous = {
			points,
			path: String(readProperty(`${strokeBlock.id}-path`).value ?? ''),
		};

		// Alt takes a node out; clicking beside the stroke adds one.
		if (index >= 0 && event.altKey) {
			const next = removeNode(points, index);
			applyStrokePoints(next);
			commitStrokePoints(next, previous);
			return;
		}

		try {
			event.currentTarget.setPointerCapture(event.pointerId);
		} catch {
			/* dragging still works without capture */
		}

		if (index >= 0) {
			nodeDrag.current = { index, ...previous };
			return;
		}

		const added = insertNode(points, canvasToNode(point, nodeFrame));
		nodeDrag.current = { index: added.index, ...previous };
		applyStrokePoints(added.points);
	};

	const onNodePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = nodeDrag.current;
		const rect = canvasRect();
		if (!drag || !rect || !nodeFrame) return;

		const node = canvasToNode(
			toCanvasPoint(event, rect, canvasSize),
			nodeFrame,
		);
		applyStrokePoints(moveNode(readStrokePoints(), drag.index, node));
	};

	const onNodePointerUp = () => {
		const drag = nodeDrag.current;
		nodeDrag.current = null;
		if (!drag) return;

		// Read the points again: a click that adds a node and lets go never
		// re-rendered, so what this closure captured is one step behind.
		commitStrokePoints(readStrokePoints(), drag);
	};

	return (
		<div ref={reference} id='workspace'>
			<div
				className={`relative overflow-hidden transition-all ${isExporting ? '' : 'shadow-2xl'}`}
				style={{
					height: currentWorkspace?.workspaceHeight + 'px',
					width: currentWorkspace?.workspaceWidth + 'px',
				}}
			>
				{!exportTransparent && (
					<div className='absolute inset-0 overflow-hidden'>
						{renderWorkspaceBackground()}
					</div>
				)}

				{!exportTransparent && blurAmount > 0 && (
					<div className='absolute inset-0 overflow-hidden pointer-events-none'>
						<div
							className='absolute inset-0'
							style={{
								filter: `blur(${blurAmount}px)`,
							}}
						>
							{renderWorkspaceBackground(true)}
						</div>
					</div>
				)}

				{!exportTransparent && noiseAmount > 0 && (
					<div
						className='absolute inset-0 pointer-events-none'
						style={{
							opacity: noiseAmount / 100,
							backgroundImage: `url("${noiseTexture}")`,
							backgroundRepeat: 'repeat',
							backgroundSize: '160px 160px',
						}}
					></div>
				)}

				<div
					className='relative z-10'
					style={{
						height: currentWorkspace?.workspaceHeight + 'px',
						width: currentWorkspace?.workspaceWidth + 'px',
					}}
				>
					{workspaces.map((workspace: { id: string; controls: any[] }) => (
						<div
							className={`${
								currentWorkspaceID === workspace.id ? 'block' : 'hidden'
							}`}
							id={workspace.id}
							key={workspace.id}
						>
							{(workspace.controls ?? [])
								.filter((item) => !item.isDeleted && item.type !== 'group')
								.map((item) => (
									<ControlHandler
										id={item.id}
										key={item.id}
										type={item.type}
										isVisible={item.isVisible}
									></ControlHandler>
								))}
						</div>
					))}

					{/* Nodes: the points of the selected stroke, to drag and edit */}
					{editingNodes && nodeFrame && !isExporting && (
						<div
							className='absolute inset-0 z-50 cursor-crosshair'
							onPointerDown={onNodePointerDown}
							onPointerMove={onNodePointerMove}
							onPointerUp={onNodePointerUp}
							onPointerCancel={() => {
								nodeDrag.current = null;
							}}
						>
							{strokePoints.map((node, index) => {
								const canvas = nodeToCanvas(node, nodeFrame);
								return (
									<div
										key={`${index}-${canvas.x}-${canvas.y}`}
										className='pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500 bg-background'
										style={{ left: canvas.x, top: canvas.y }}
									></div>
								);
							})}
						</div>
					)}

					{/* Brush: the layer that follows the stroke, above the blocks */}
					{brush && !isExporting && (
						<div
							className='absolute inset-0 z-50 cursor-crosshair'
							onPointerDown={onBrushStart}
							onPointerMove={onBrushMove}
							onPointerUp={onBrushEnd}
							onPointerCancel={() => {
								brushPoints.current = [];
								setBrushPath('');
							}}
						>
							{brushPath !== '' && (
								<svg className='pointer-events-none absolute inset-0 h-full w-full overflow-visible'>
									<path
										d={brushPath}
										fill={brushOutline ? brushColor : 'none'}
										stroke={brushOutline ? 'none' : brushColor}
										strokeWidth={brushSize}
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							)}
						</div>
					)}

					{/* Draw tool: the layer that follows the drag, above the blocks */}
					{draw && !isExporting && (
						<div
							className='absolute inset-0 z-50 cursor-crosshair'
							onPointerDown={onDrawStart}
							onPointerMove={onDrawMove}
							onPointerUp={onDrawEnd}
							onPointerCancel={() => {
								drawStart.current = null;
								setDrawBox(null);
							}}
						>
							{drawBox && (
								<div
									className='pointer-events-none absolute border border-dashed border-blue-500 bg-blue-500/10'
									style={{
										left: drawBox.x,
										top: drawBox.y,
										width: drawBox.width,
										height: drawBox.height,
									}}
								></div>
							)}
						</div>
					)}
				</div>
			</div>

			{editing && !isExporting && (
				<Moveable
					useResizeObserver
					target={showMoveable ? moveableTarget : null}
					origin={true}
					/* Resize event edges */
					edge={false}
					/* Snappable */
					snappable={snapping}
					snapContainer={reference}
					snapDirections={{
						top: true,
						bottom: true,
						left: true,
						right: true,
						center: true,
						middle: true,
					}}
					snapThreshold={10}
					verticalGuidelines={[
						0,
						parseFloat(currentWorkspace?.workspaceWidth ?? '1080') * 0.2,
						parseFloat(currentWorkspace?.workspaceWidth ?? '1080') / 2,
						parseFloat(currentWorkspace?.workspaceWidth ?? '1080') * 0.8,
						currentWorkspace?.workspaceWidth ?? 1080,
					]}
					horizontalGuidelines={[
						0,
						parseFloat(currentWorkspace?.workspaceHeight ?? '1980') * 0.2,
						parseFloat(currentWorkspace?.workspaceHeight ?? '1980') / 2,
						parseFloat(currentWorkspace?.workspaceHeight ?? '1980') * 0.8,
						currentWorkspace?.workspaceHeight ?? 1980,
					]}
					elementSnapDirections
					elementGuidelines={controlsClass}
					useAccuratePosition // TODO Not Available For Groups
					isDisplaySnapDigit
					snapGap
					snapRotationDegrees={[0, 90, 180, 270]}
					/* draggable */
					draggable={!crop}
					throttleDrag={0}
					onDragStart={({ target }) => {
						snapshotTargets([target]);
					}}
					onDragGroupStart={({ targets }: any) => {
						snapshotTargets(targets);
					}}
					onDragGroup={({ events }: any) => {
						events.forEach(({ target, left, top }: any) => {
							target.style.left = `${left}px`;
							target.style.top = `${top}px`;
						});
					}}
					onDragGroupEnd={({ targets }: any) => {
						// Record the move of every block as one undoable step.
						if (commitGesture(targets, ['pos'])) {
							syncGroupTargetsToStore(targets);
						}
					}}
					onDrag={({ target, left, top }: OnDrag) => {
						// console.log('onDrag left, top', left, top);
						target.style.left = `${left}px`;
						target.style.top = `${top}px`;
					}}
					onDragEnd={({ target }) => {
						// A click without movement is not a step.
						if (commitGesture([target], ['pos'])) {
							setControlPos(readTargetPosition(target));
						}
					}}
					/* When resize or scale, keeps a ratio of the width, height. */
					keepRatio={lockAspect}
					/* resizable */
					/* Only one of resizable, scalable, warpable can be used. */
					resizable={!warp}
					throttleResize={0}
					onResizeStart={({ target, direction }: OnResizeStart) => {
						const sizing = textSizingOf(controlID);
						if (sizing) {
							// Text blocks switch sizing mode with the handle; the size
							// and the mode are recorded together when the drag ends.
							const element = target as HTMLElement;
							const size = {
								w: element.offsetWidth,
								h: element.offsetHeight,
							};
							const nextSizing = sizingAfterResize(
								sizing,
								direction,
								lockAspect,
							);
							textResize.current = {
								size,
								sizing,
								nextSizing,
								style: {
									width: element.style.width,
									height: element.style.height,
								},
							};
							// Start the drag from the box the content gave the block.
							element.style.width = `${size.w}px`;
							if (nextSizing === 'fixed') element.style.height = `${size.h}px`;
							return;
						}

						snapshotTargets([target]);
					}}
					onResize={({ target, width, height, delta }: OnResize) => {
						// console.log('onResize', target);
						const nextSize = clampResizeDimensions(target, width, height);
						// Text with a fixed width wraps: its height follows the text.
						const heightFollowsContent =
							textResize.current?.nextSizing === 'fixed-width';
						delta[0] !== 0 && (target.style.width = `${nextSize.width}px`);
						delta[1] !== 0 &&
							!heightFollowsContent &&
							(target.style.height = `${nextSize.height}px`);
					}}
					onResizeGroup={({ events }: any) => {
						events.forEach(({ target, width, height, delta }: any) => {
							const nextSize = clampResizeDimensions(target, width, height);
							delta[0] !== 0 && (target.style.width = `${nextSize.width}px`);
							delta[1] !== 0 && (target.style.height = `${nextSize.height}px`);
						});
					}}
					onResizeGroupStart={({ targets }: any) => {
						snapshotTargets(targets);
					}}
					onResizeGroupEnd={({ targets }: any) => {
						// Resizing a group also moves its blocks.
						if (commitGesture(targets, ['pos', 'size'], true)) {
							syncGroupTargetsToStore(targets, true);
						}
					}}
					onResizeEnd={({ target, isDrag }: OnResizeEnd) => {
						const text = textResize.current;
						if (text) {
							textResize.current = null;
							const element = target as HTMLElement;

							if (!isDrag) {
								element.style.width = text.style.width;
								element.style.height = text.style.height;
								return;
							}

							if (text.nextSizing !== 'fixed') element.style.height = 'auto';
							const size = {
								w: element.offsetWidth,
								h: element.offsetHeight,
							};
							commitBatch([
								{
									id: `${controlID}-control_size`,
									previous: text.size,
									next: size,
								},
								...(text.nextSizing !== text.sizing
									? [
											{
												id: `${controlID}-sizing`,
												previous: text.sizing,
												next: text.nextSizing,
											},
										]
									: []),
							]);
							setControlSize(size);
							return;
						}

						// Resizing from the top or left edge also moves the block.
						if (isDrag && commitGesture([target], ['size', 'pos'])) {
							setControlSize(readTargetSize(target));
							setControlPos(readTargetPosition(target));
						}
					}}
					/* scalable */
					/* Only one of resizable, scalable, warpable can be used. */
					scalable={false}
					throttleScale={0}
					onScaleStart={() => {
						// console.log('onScaleStart', target);
					}}
					onScale={({ target, transform }: OnScale) => {
						// console.log('onScale scale', scale);
						target.style.transform = transform;
					}}
					onScaleGroup={({ targets, transform }: OnScaleGroup) => {
						targets.map((el) => {
							el.style.transform = transform;
						});
						// console.log('onScale scale', scale);
						// target!.style.transform = transform;
					}}
					onScaleEnd={({ target }) => {
						// console.log('onScaleEnd', target, isDrag);
					}}
					/* rotatable */
					rotatable={true}
					throttleRotate={0}
					onRotateStart={({ target }: OnRotateStart) => {
						snapshotTargets([target]);
					}}
					onRotate={({ target, transform }: OnRotate) => {
						// console.log('onRotate', dist);
						target.style.transform = transform;
					}}
					onRotateGroup={({ events }: any) => {
						events.forEach(({ target, transform }: any) => {
							target.style.transform = transform;
						});
					}}
					onRotateGroupStart={({ targets }: any) => {
						snapshotTargets(targets);
					}}
					onRotateGroupEnd={({ targets }: any) => {
						// Rotating a group turns its blocks around the group center.
						if (commitGesture(targets, ['pos', 'transform'])) {
							syncGroupTargetsToStore(targets);
						}
					}}
					onRotateEnd={({ target }) => {
						if (commitGesture([target], ['transform'])) {
							setControlTransform(readTargetTransform(target));
						}
					}}
					// Enabling pinchable lets you use events that
					// can be used in draggable, resizable, scalable, and rotateable.
					pinchable={false}
					onPinchStart={() => {
						// pinchStart event occur before dragStart, rotateStart, scaleStart, resizeStart
						// console.log('onPinchStart');
					}}
					onPinch={() => {
						// pinch event occur before drag, rotate, scale, resize
						// console.log('onPinch');
					}}
					onPinchGroup={() => {
						// pinch event occur before drag, rotate, scale, resize
						// console.log('onPinch');
					}}
					onPinchEnd={() => {
						// pinchEnd event occur before dragEnd, rotateEnd, scaleEnd, resizeEnd
						// console.log('onPinchEnd');
					}}
					defaultGroupOrigin=''
					useMutationObserver
					clippable={crop}
					dragWithClip={false}
					clipTargetBounds
					/* Percentages, so a crop follows the block when it is resized */
					clipRelative
					/* The crop area itself can be dragged, not only its corners */
					clipArea
					onClip={(e) => {
						e.target.style.clipPath = e.clipStyle;
					}}
					onClipStart={({ target }) => {
						snapshotTargets([target]);
					}}
					onClipEnd={({ target }) => {
						commitGesture([target], ['clip']);
					}}
					warpable={warp}
					onWarpStart={({ target }: OnWarpStart) => {
						snapshotTargets([target]);
					}}
					onWarp={({ target, transform }: OnWarp) => {
						// console.log('onRotate', dist);
						target.style.transform = transform;
					}}
					onWarpEnd={({ target }) => {
						if (commitGesture([target], ['transform'])) {
							setControlTransform(readTargetTransform(target));
						}
					}}
					renderDirections={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
				/>
			)}
		</div>
	);
};

export default Workspace;
