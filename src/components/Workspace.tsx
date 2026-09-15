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
import { Canvas } from './Canvas';
import { Wallpapers } from '../utils/wallpapers';
import noiseTexture from '../assets/noisy.png';

interface Props {
	reference: RefObject<HTMLDivElement>;
}
export const Workspace: React.FC<Props> = ({ reference }) => {
	/* App Store */
	const controlID = useControlsStore((state) => state.currentControlID);
	const selectedControlIDs = useControlsStore(
		(state) => state.selectedControlIDs,
	);
	const commitBatch = useHistoryStore((state) => state.commitBatch);
	const groupDragStart = useRef<Record<string, { x: number; y: number }>>({});
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

	const editing = useUIStore((state) => state.editing);
	const crop = useUIStore((state) => state.crop);
	const warp = useUIStore((state) => state.warp);
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

	const setControlState = useHistoryStore((state) => state.setControlState);
	const pastHistory = useHistoryStore((state) => state.pastHistory);
	const setPastHistory = useHistoryStore((state) => state.setPast);
	const setFutureHistory = useHistoryStore((state) => state.setFuture);
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

	const [moveableTarget, setMoveableTarget] = useState<
		HTMLElement | HTMLElement[] | null
	>(null);

	useLayoutEffect(() => {
		/* Several selected blocks move and resize together */
		if (selectedControlIDs.length > 1) {
			const ids = selectedControlIDs.flatMap((id) => {
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
			});

			let frame = 0;
			let cancelled = false;
			let attempts = 0;

			const resolveTargets = () => {
				if (cancelled) return;

				const targets = ids
					.map((id) => document.getElementById(id))
					.filter((item): item is HTMLElement => item !== null);

				if (targets.length === ids.length || attempts >= 20) {
					setMoveableTarget(targets.length > 0 ? targets : null);
					return;
				}

				attempts += 1;
				frame = window.requestAnimationFrame(resolveTargets);
			};

			frame = window.requestAnimationFrame(resolveTargets);

			return () => {
				cancelled = true;
				window.cancelAnimationFrame(frame);
			};
		}

		if (
			currentControl === undefined ||
			currentControl.locked ||
			currentControl.isDeleted ||
			!currentControl.isVisible
		) {
			setMoveableTarget(null);
			return;
		}

		if (currentControl.type === 'group') {
			let frame = 0;
			let cancelled = false;
			let attempts = 0;

			const resolveGroupTargets = () => {
				if (cancelled) return;

				const groupTargets = groupTargetIds
					.map((id) => document.getElementById(id))
					.filter((item): item is HTMLElement => item !== null);

				if (groupTargets.length > 0 || attempts >= 20) {
					setMoveableTarget(groupTargets.length > 0 ? groupTargets : null);
					return;
				}

				attempts += 1;
				frame = window.requestAnimationFrame(resolveGroupTargets);
			};

			frame = window.requestAnimationFrame(resolveGroupTargets);

			return () => {
				cancelled = true;
				window.cancelAnimationFrame(frame);
			};
		}

		let frame = 0;
		let cancelled = false;
		let attempts = 0;

		const resolveTarget = () => {
			if (cancelled) return;

			const target = document.getElementById(controlID);
			if (target !== null || attempts >= 20) {
				setMoveableTarget(target);
				return;
			}

			attempts += 1;
			frame = window.requestAnimationFrame(resolveTarget);
		};

		frame = window.requestAnimationFrame(resolveTarget);

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
	]);

	const syncGroupTargetsToStore = (
		targets: Array<HTMLElement | SVGAElement>,
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
			upsertProperty(`${targetId}-control_size`, {
				w: parseFloat(target.style.width.replace('px', '')),
				h: parseFloat(target.style.height.replace('px', '')),
			});
			upsertProperty(`${targetId}-transform`, target.style.transform);
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

	const readTargetSize = (target: HTMLElement | SVGElement) => ({
		w: parseFloat(target.style.width.replace('px', '')),
		h: parseFloat(target.style.height.replace('px', '')),
	});

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

					<Canvas></Canvas>
				</div>
			</div>

			{editing && !isExporting && (
				<Moveable
					useResizeObserver
					target={moveableTarget}
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
						// console.log('onDragStart', target);
						setPastHistory([
							...pastHistory,
							{
								id: `${controlID}-pos`,
								value: {
									x: parseFloat(target.style.left.replace('px', '')),
									y: parseFloat(target.style.top.replace('px', '')),
								},
							},
						]);
					}}
					onDragGroupStart={({ targets }: any) => {
						groupDragStart.current = Object.fromEntries(
							(targets as HTMLElement[]).map((target) => [
								target.id,
								readTargetPosition(target),
							]),
						);
					}}
					onDragGroup={({ events }: any) => {
						events.forEach(({ target, left, top }: any) => {
							target.style.left = `${left}px`;
							target.style.top = `${top}px`;
						});
					}}
					onDragGroupEnd={({ targets }: any) => {
						// Record the move of every block as one undoable step.
						commitBatch(
							(targets as HTMLElement[])
								.map((target) => ({
									id: `${target.id}-pos`,
									previous: groupDragStart.current[target.id],
									next: readTargetPosition(target),
								}))
								.filter(
									(change) =>
										change.previous &&
										(change.previous.x !== change.next.x ||
											change.previous.y !== change.next.y),
								),
						);
						syncGroupTargetsToStore(targets);
						setFutureHistory([]);
					}}
					onDrag={({ target, left, top }: OnDrag) => {
						// console.log('onDrag left, top', left, top);
						target.style.left = `${left}px`;
						target.style.top = `${top}px`;
					}}
					onDragEnd={({ target }) => {
						const nextPosition = readTargetPosition(target);

						setControlPos(nextPosition);
						setControlState({
							id: `${controlID}-pos`,
							value: nextPosition,
						});

						setFutureHistory([]);
					}}
					/* When resize or scale, keeps a ratio of the width, height. */
					keepRatio={lockAspect}
					/* resizable */
					/* Only one of resizable, scalable, warpable can be used. */
					resizable={!warp}
					throttleResize={0}
					onResizeStart={({ target }) => {
						setPastHistory([
							...pastHistory,
							{
								id: `${controlID}-control_size`,
								value: {
									w: parseFloat(target.style.width.replace('px', '')),
									h: parseFloat(target.style.height.replace('px', '')),
								},
							},
						]);
					}}
					onResize={({ target, width, height, delta }: OnResize) => {
						// console.log('onResize', target);
						const nextSize = clampResizeDimensions(target, width, height);
						delta[0] !== 0 && (target.style.width = `${nextSize.width}px`);
						delta[1] !== 0 && (target.style.height = `${nextSize.height}px`);
					}}
					onResizeGroup={({ events }: any) => {
						events.forEach(({ target, width, height, delta }: any) => {
							const nextSize = clampResizeDimensions(target, width, height);
							delta[0] !== 0 && (target.style.width = `${nextSize.width}px`);
							delta[1] !== 0 && (target.style.height = `${nextSize.height}px`);
						});
					}}
					onResizeGroupEnd={({ targets }: any) => {
						syncGroupTargetsToStore(targets);
						setFutureHistory([]);
					}}
					onResizeEnd={({ target }) => {
						const nextSize = readTargetSize(target);

						setControlSize(nextSize);
						// console.log('onResizeEnd', target, isDrag);
						setControlState({
							id: `${controlID}-control_size`,
							value: nextSize,
						});

						setFutureHistory([]);
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
						setPastHistory([
							...pastHistory,
							{
								id: `${controlID}-transform`,
								value: target.style.transform,
							},
						]);
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
					onRotateGroupEnd={({ targets }: any) => {
						syncGroupTargetsToStore(targets);
						setFutureHistory([]);
					}}
					onRotateEnd={({ target }) => {
						const nextTransform = readTargetTransform(target);

						setControlTransform(nextTransform);
						setControlState({
							id: `${controlID}-transform`,
							value: nextTransform,
						});

						setFutureHistory([]);
						// console.log('onRotateEnd', target, isDrag);
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
					onClip={(e) => {
						e.target.style.clipPath = e.clipStyle;
					}}
					onClipStart={({ target }) => {
						setPastHistory([
							...pastHistory,
							{
								id: `${controlID}-clip`,
								value: target.style.clipPath,
							},
						]);
					}}
					onClipEnd={({ target }) => {
						// console.log('onResizeEnd', target, isDrag);
						setControlState({
							id: `${controlID}-clip`,
							value: target.style.clipPath,
						});

						setFutureHistory([]);
					}}
					warpable={warp}
					onWarpStart={({ target }: OnWarpStart) => {
						setPastHistory([
							...pastHistory,
							{
								id: `${controlID}-transform`,
								value: target.style.transform,
							},
						]);
					}}
					onWarp={({ target, transform }: OnWarp) => {
						// console.log('onRotate', dist);
						target.style.transform = transform;
					}}
					onWarpEnd={({ target }) => {
						const nextTransform = readTargetTransform(target);

						setControlTransform(nextTransform);
						setControlState({
							id: `${controlID}-transform`,
							value: nextTransform,
						});

						setFutureHistory([]);
						// console.log('onRotateEnd', target, isDrag);
					}}
					renderDirections={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
				/>
			)}
		</div>
	);
};

export default Workspace;
