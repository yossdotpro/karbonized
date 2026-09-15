/* eslint-disable @typescript-eslint/no-misused-promises */
import { ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { type ExportFormat, exportElement } from '@/lib/export/exporter';
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	type ReactNode,
} from 'react';
import { useControlState } from '../../hooks/useControlState';
import {
	useWorkspaceStore,
	useControlsStore,
	useUIStore,
	useHistoryStore,
} from '../../stores';
import { ControlContextMenu } from './ControlContextMenu';
import { ControlMenu } from './ControlMenu';

interface ControlProps {
	id: string;
	color?: string;
	children?: ReactNode;
	contextMenu?: ReactNode;
	menu?: ReactNode;
	lockAspectRatio?: boolean;
	border?: number;
	borderEditable?: boolean;
	shadowEditable?: boolean;
	maskEditable?: boolean;
	defaultHeight?: string;
	defaultWidth?: string;
	maxHeight?: string;
	maxWidth?: string;
	minHeight?: string;
	minWidth?: string;
	/**
	 * Let the content size the block: `both` fits width and height, `height`
	 * keeps the stored width and grows the height. The stored size follows.
	 */
	autoSize?: 'none' | 'both' | 'height';
	/** The width or height was typed in the position panel. */
	onSizeInput?: (axis: 'w' | 'h') => void;

	onClick?: () => void;
	onCreateDynamicBackground?: () => Promise<void> | void;
}

export const ControlTemplate: React.FC<ControlProps> = ({
	id,
	color,
	children,
	contextMenu,
	menu,
	shadowEditable = true,
	maskEditable = true,
	border = 2,
	borderEditable = true,
	maxHeight = '400px',
	maxWidth = '400px',
	minHeight = '150px',
	minWidth = '300px',
	defaultHeight = '50px',
	defaultWidth = '80px',
	autoSize = 'none',
	onSizeInput,
	onCreateDynamicBackground,
}) => {
	// App Store
	const controlID = useControlsStore((state) => state.currentControlID);
	const workspaceName = useWorkspaceStore(
		(state) => state.currentWorkspace?.workspaceName || '',
	);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const controlSize = useControlsStore((state) => state.controlSize);
	const controlTransform = useControlsStore((state) => state.controlTransform);
	const setControlSize = useControlsStore((state) => state.setControlSize);
	const controlPos = useControlsStore((state) => state.controlPosition);
	const setControlPos = useControlsStore((state) => state.setControlPosition);
	const setControlTransform = useControlsStore(
		(state) => state.setControlTransform,
	);
	const setWorkspaceTab = useUIStore((state) => state.setSelectedTab);
	const pastHistory = useHistoryStore((state) => state.pastHistory);
	const setPastHistory = useHistoryStore((state) => state.setPast);
	const setFutureHistory = useHistoryStore((state) => state.setFuture);
	const setControlState = useHistoryStore((state) => state.setControlState);
	const deleteControl = useControlsStore((state) => state.deleteControl);
	const duplicateControl = useControlsStore((state) => state.duplicateControl);
	const moveControlByStep = useControlsStore(
		(state) => state.moveControlByStep,
	);
	const moveControlToEdge = useControlsStore(
		(state) => state.moveControlToEdge,
	);
	const toggleControlVisibility = useControlsStore(
		(state) => state.toggleControlVisibility,
	);
	const toggleControlLock = useControlsStore(
		(state) => state.toggleControlLock,
	);

	const setID = useControlsStore((state) => state.setCurrentControlID);
	const workspaceMode = useUIStore((state) => state.workspaceMode);
	const setWorkspaceMode = useUIStore((state) => state.setWorkspaceMode);

	// Component States
	const [zIndex, setzIndex] = useControlState('0', `${id}-zindex`);
	const [visibility, setVisibility] = useControlState(true, `${id}-visibility`);

	/* Position and Size */
	const [transform, setTransform] = useControlState(
		'',
		`${id}-transform`,
		true,
	);
	const [position, setPosition] = useControlState(
		{ x: 33, y: 190 },
		`${id}-pos`,
		true,
	);
	const [size, setSize] = useControlState(
		{
			w: defaultWidth.replace('px', '') as unknown as number,
			h: defaultHeight.replace('px', '') as unknown as number,
		},
		`${id}-control_size`,
		true,
	);
	const [clip] = useControlState('', `${id}-clip`, true);
	const [borderRadius, setBorderRadius] = useControlState(
		border,
		`${id}-borderRadius`,
	);

	/* Flip */
	const [flipX, setFlipX] = useControlState(false, `${id}-flipx`);
	const [flipY, setFlipY] = useControlState(false, `${id}-flipy`);

	/* Rotation */
	const [rotateX, setRotateX] = useControlState(0, `${id}-rotatex`);
	const [rotateY, setRotateY] = useControlState(0, `${id}-rotatey`);

	/* Filters */
	const [blur, setBlur] = useControlState(0, `${id}-blur`);
	const [brightness, setBrightness] = useControlState(100, `${id}-brightness`);
	const [contrast, setContrast] = useControlState(100, `${id}-contrast`);
	const [grayscale, setGrayscale] = useControlState(0, `${id}-grayscale`);
	const [huerotate, setHueRotate] = useControlState(0, `${id}-huerotate`);
	const [invert, setInvert] = useControlState(0, `${id}-invert`);
	const [saturate, setSaturate] = useControlState(100, `${id}-saturate`);
	const [opacity, setOpacity] = useControlState(100, `${id}-opacity`);
	const [sepia, setSepia] = useControlState(0, `${id}-sepia`);

	/* Shadow */
	const [shadowX, setShadowX] = useControlState(0, `${id}-shadowX`);
	const [shadowY, setShadowY] = useControlState(0, `${id}-shadowY`);
	const [shadowBlur, setShadowBlur] = useControlState(0, `${id}-shadowBlur`);
	const [shadowColor, setShadowColor] = useControlState(
		'#090b11',
		`${id}-shadowColor`,
	);

	const [mask, setMask] = useControlState('', `${id}-mask`);
	const [maskRepeat, setMaskRepeat] = useControlState(
		false,
		`${id}-maskRepeat`,
	);

	/* Blocks sized by their content: keep the stored size in step with it, so
	   the position panel, alignment and tools see the real box. */
	const syncContentSize = useRef(() => {});
	useLayoutEffect(() => {
		syncContentSize.current = () => {
			const element = document.getElementById(id);
			if (!element) return;

			const next = { w: element.offsetWidth, h: element.offsetHeight };
			if (next.w === Number(size.w) && next.h === Number(size.h)) return;

			// Write the store, not the local state: the block reads it back, and
			// writing both at once makes them chase each other.
			const sizeId = `${id}-control_size`;
			const { ControlProperties, addControlProperty } =
				useControlsStore.getState();
			const stored = ControlProperties.find((item) => item.id === sizeId);
			if (stored?.value?.w !== next.w || stored?.value?.h !== next.h) {
				addControlProperty(
					{ id: sizeId, value: next },
					useWorkspaceStore.getState().currentWorkspaceID,
				);
			}
		};
	});

	// After every render (content, font size…). Reading the layout works even
	// when the window is not painting, unlike observers.
	useLayoutEffect(() => {
		if (autoSize !== 'none' && visibility) syncContentSize.current();
	});

	// Changes that don't re-render the block, such as web fonts loading.
	useEffect(() => {
		if (autoSize === 'none' || !visibility) return;
		const element = document.getElementById(id);
		if (!element) return;

		const observer = new ResizeObserver(() => syncContentSize.current());
		observer.observe(element);
		return () => observer.disconnect();
	}, [autoSize, id, visibility]);

	/* Sync the selected control with the shared editor state on selection */
	useEffect(() => {
		if (id !== controlID) return;

		setControlPos({
			x: position.x,
			y: position.y,
		});
		setControlSize({
			w: size.w,
			h: size.h,
		});
		setControlTransform(transform);
	}, [
		controlID,
		id,
		position.x,
		position.y,
		setControlPos,
		setControlSize,
		setControlTransform,
		size.h,
		size.w,
		transform,
	]);

	const Masks = [
		'default',
		'mask-squircle',
		'mask-decagon',
		'mask-diamond',
		'mask-heart',
		'mask-hexagon',
		'mask-circle',
		'mask-parallelogram',
		'mask-parallelogram-2',
		'mask-parallelogram-3',
		'mask-parallelogram-4',
		'mask-pentagon',
		'mask-square',
		'mask-star',
		'mask-star-2',
		'mask-triangle',
		'mask-triangle-2',
		'mask-triangle-3',
		'mask-triangle-4',
	];

	/* Mask classes live in src/styles/masks.css; `mask` fits the shape to the
	   block, leaving it out tiles the shape (Mask Repeat) */
	const hasMask = mask !== '' && mask !== 'default';
	const maskClassName = hasMask && cn(!maskRepeat && 'mask', mask);

	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (
			id === controlID &&
			controlPos !== undefined &&
			Number.isFinite(controlPos.x) &&
			Number.isFinite(controlPos.y)
		) {
			setPosition({
				x: controlPos?.x as unknown as number,
				y: controlPos?.y as unknown as number,
			});
		}
	}, [controlPos]);

	useEffect(() => {
		if (
			id === controlID &&
			controlSize !== undefined &&
			Number.isFinite(controlSize.w) &&
			Number.isFinite(controlSize.h)
		) {
			setSize({
				w: controlSize?.w as unknown as number,
				h: controlSize?.h as unknown as number,
			});
		}
	}, [controlSize]);

	useEffect(() => {
		if (id === controlID) {
			if (controlTransform !== undefined) setTransform(controlTransform);
		}
	}, [controlTransform]);

	/* Export this block as an image with the current export settings */
	const exportBlock = useCallback(
		async (format: ExportFormat) => {
			try {
				await exportElement(ref.current, `${workspaceName}-${id}`, { format });
			} catch (error) {
				console.error(error);
				toast.error('Export failed');
			}
		},
		[id, ref, workspaceName],
	);
	const exportAsPng = useCallback(() => exportBlock('png'), [exportBlock]);
	const exportAsSvg = useCallback(() => exportBlock('svg'), [exportBlock]);
	const exportAsJpeg = useCallback(() => exportBlock('jpeg'), [exportBlock]);

	const toggleSelection = useControlsStore((state) => state.toggleSelection);
	const selectedControlIDs = useControlsStore(
		(state) => state.selectedControlIDs,
	);

	const syncSelectionState = useCallback(
		(event?: React.MouseEvent | React.TouchEvent) => {
			// Shift+click adds or removes the block from the selection.
			if (event?.shiftKey) {
				toggleSelection(id);
				return;
			}

			// Clicking a block that is part of a multi-selection keeps the selection
			// so the whole group can be dragged.
			if (selectedControlIDs.length > 1 && selectedControlIDs.includes(id))
				return;

			if (controlID === id) return;

			setID(id);
			setControlPos({
				x: position.x,
				y: position.y,
			});
			setControlSize({
				w: size.w,
				h: size.h,
			});
			setControlTransform(transform);
		},
		[
			controlID,
			id,
			position.x,
			position.y,
			selectedControlIDs,
			setControlPos,
			setControlSize,
			setControlTransform,
			setID,
			size.h,
			size.w,
			toggleSelection,
			transform,
		],
	);

	return (
		<>
			<AnimatePresence>
				{visibility && (
					<ControlContextMenu
						key={`animate-${id}`}
						opacity={opacity}
						setOpacity={setOpacity}
						exportAsPng={exportAsPng}
						exportAsJpeg={exportAsJpeg}
						exportAsSvg={exportAsSvg}
						onCreateDynamicBackground={onCreateDynamicBackground}
						contextMenu={contextMenu}
						setID={setID}
						removeControl={() => {
							deleteControl(id, currentWorkspace);
						}}
						onDuplicate={() =>
							duplicateControl(id, currentWorkspace, currentWorkspace?.id || '')
						}
						onMoveStep={(direction) =>
							moveControlByStep({ id, direction }, currentWorkspace)
						}
						onMoveEdge={(position) =>
							moveControlToEdge({ id, position }, currentWorkspace)
						}
						onHide={() => toggleControlVisibility(id, currentWorkspace)}
						onToggleLock={() => toggleControlLock(id, currentWorkspace)}
						locked={
							currentWorkspace?.controls.find((item) => item.id === id)
								?.locked ?? false
						}
					>
						<ContextMenuTrigger>
							<motion.div
								id={id}
								key={id}
								data-block-id={id}
								className={`absolute flex flex-auto select-none block-${id}`}
								style={{
									zIndex,
									height: autoSize === 'none' ? size.h + 'px' : 'auto',
									width: autoSize === 'both' ? 'max-content' : size.w + 'px',
									maxHeight,
									maxWidth,
									minHeight,
									minWidth,
									left: position.x,
									top: position.y,
									transform,
									clipPath: clip,
								}}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0, marginTop: '100px' }}
								transition={{ duration: 0.1 }}
							>
								<div
									className='flex flex-auto'
									onMouseDown={syncSelectionState}
									onTouchStart={syncSelectionState}
									onDoubleClick={() => {
										setWorkspaceTab('control');

										if (workspaceMode !== 'edit') {
											setWorkspaceMode('edit');
										} else {
											setWorkspaceMode('zen');
										}
									}}
								>
									{/* The exported node carries the mask so per-block exports keep
									    it; flips, rotation and filters stay inside the masked area */}
									<div
										id={'control-' + id}
										ref={ref}
										className={cn('flex h-full flex-auto', maskClassName)}
									>
										<div
											style={{
												borderRadius: borderRadius + 'px',
												backgroundColor: color,
												transform: `${flipX ? 'scaleX(-1)' : ''} ${
													flipY ? 'scaleY(-1)' : ''
												} rotateY(${rotateY + 'deg'}) rotateX(${rotateX + 'deg'})`,

												filter: `blur(${blur + 'px'}) brightness(${
													brightness + '%'
												}) contrast(${contrast + '%'})  grayscale(${
													grayscale + '%'
												}) hue-rotate(${huerotate + 'deg'}) invert(${
													invert + '%'
												}) opacity(${opacity + '%'}) saturate(${
													saturate + '%'
												}) sepia(${sepia + '%'}) drop-shadow(${
													shadowX +
													'px ' +
													shadowY +
													'px ' +
													shadowBlur +
													'px ' +
													shadowColor
												})`,
											}}
											className='flex h-full flex-auto flex-col'
										>
											{children}
										</div>
									</div>
								</div>
							</motion.div>
						</ContextMenuTrigger>
					</ControlContextMenu>
				)}

				{/* Menu */}
				<ControlMenu
					id={id}
					controlID={controlID}
					menu={menu}
					shadowEditable={shadowEditable}
					maskEditable={maskEditable}
					borderEditable={borderEditable}
					Masks={Masks}
					controlPos={controlPos}
					controlSize={controlSize}
					onSizeInput={onSizeInput}
					pastHistory={pastHistory}
					setPastHistory={setPastHistory}
					setFutureHistory={setFutureHistory}
					setControlState={setControlState}
					setControlPos={setControlPos}
					setControlSize={setControlSize}
					currentWorkspace={currentWorkspace}
					setWorkspaceControls={() => {}}
					setID={setID}
					onDeleteControl={() => {
						deleteControl(id, currentWorkspace);
					}}
					flipX={flipX}
					setFlipX={setFlipX}
					flipY={flipY}
					setFlipY={setFlipY}
					zIndex={zIndex}
					setzIndex={setzIndex}
					rotateX={rotateX}
					setRotateX={setRotateX}
					rotateY={rotateY}
					setRotateY={setRotateY}
					shadowX={shadowX}
					setShadowX={setShadowX}
					shadowY={shadowY}
					setShadowY={setShadowY}
					shadowBlur={shadowBlur}
					setShadowBlur={setShadowBlur}
					shadowColor={shadowColor}
					setShadowColor={setShadowColor}
					borderRadius={borderRadius}
					setBorderRadius={setBorderRadius}
					mask={mask}
					setMask={setMask}
					maskRepeat={maskRepeat}
					setMaskRepeat={setMaskRepeat}
					blur={blur}
					setBlur={setBlur}
					brightness={brightness}
					setBrightness={setBrightness}
					contrast={contrast}
					setContrast={setContrast}
					grayscale={grayscale}
					setGrayscale={setGrayscale}
					huerotate={huerotate}
					setHueRotate={setHueRotate}
					invert={invert}
					setInvert={setInvert}
					saturate={saturate}
					setSaturate={setSaturate}
					opacity={opacity}
					setOpacity={setOpacity}
					sepia={sepia}
					setSepia={setSepia}
				/>
			</AnimatePresence>
		</>
	);
};
