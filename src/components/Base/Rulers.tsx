import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { type GuideAxis, useViewStore } from '@/lib/viewer';
import { isGuideInside, tickStep, ticksBetween } from '@/lib/canvas/rulers';
import { useWorkspaceStore } from '@/stores';

const RULER_SIZE = 20;

interface Frame {
	/** Where the canvas starts on screen, and how wide it is drawn. */
	left: number;
	top: number;
	scaleX: number;
	scaleY: number;
	width: number;
	height: number;
}

/**
 * Rulers along the top and the left of the canvas, in canvas pixels, and the
 * guides dragged out of them.
 *
 * The rulers follow the canvas as it is panned and zoomed, so they are read
 * from where the canvas actually is on screen rather than from the viewer.
 */
export const Rulers: React.FC = () => {
	const showRulers = useViewStore((state) => state.showRulers);
	const guides = useViewStore((state) => state.guides);
	const addGuide = useViewStore((state) => state.addGuide);
	const moveGuide = useViewStore((state) => state.moveGuide);
	const removeGuide = useViewStore((state) => state.removeGuide);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

	const container = useRef<HTMLDivElement>(null);
	const [frame, setFrame] = useState<Frame | null>(null);
	/** A guide being dragged: which one, or `new` while it leaves the ruler. */
	const [dragging, setDragging] = useState<{
		axis: GuideAxis;
		index: number | 'new';
		position: number;
	} | null>(null);

	const canvasWidth = parseFloat(currentWorkspace?.workspaceWidth ?? '0');
	const canvasHeight = parseFloat(currentWorkspace?.workspaceHeight ?? '0');

	/** Where the canvas is drawn right now, in the coordinates of the pane. */
	const readFrame = useCallback(() => {
		const canvas = document.getElementById('workspace');
		const host = container.current;
		if (!canvas || !host || canvasWidth <= 0 || canvasHeight <= 0) return;

		const rect = canvas.getBoundingClientRect();
		const origin = host.getBoundingClientRect();
		const next: Frame = {
			left: rect.left - origin.left,
			top: rect.top - origin.top,
			scaleX: rect.width / canvasWidth,
			scaleY: rect.height / canvasHeight,
			width: rect.width,
			height: rect.height,
		};

		setFrame((current) =>
			current &&
			Math.abs(current.left - next.left) < 0.5 &&
			Math.abs(current.top - next.top) < 0.5 &&
			Math.abs(current.scaleX - next.scaleX) < 0.001
				? current
				: next,
		);
	}, [canvasHeight, canvasWidth]);

	// After every render, which is what makes the rulers appear at once even
	// when the window is not painting and frames do not run.
	useLayoutEffect(readFrame);

	/* The canvas moves with every pan and zoom, and neither reports it: the
	   only way to follow it is to read where it is, frame by frame. */
	useEffect(() => {
		if (!showRulers) return;

		let request = 0;
		const follow = () => {
			readFrame();
			request = window.requestAnimationFrame(follow);
		};

		follow();
		return () => {
			window.cancelAnimationFrame(request);
		};
	}, [showRulers, readFrame]);

	if (!showRulers || !frame) {
		return (
			<div ref={container} className='pointer-events-none absolute inset-0' />
		);
	}

	const positionOf = (
		axis: GuideAxis,
		event: { clientX: number; clientY: number },
	) => {
		const host = container.current?.getBoundingClientRect();
		if (!host) return 0;

		return axis === 'vertical'
			? (event.clientX - host.left - frame.left) / (frame.scaleX || 1)
			: (event.clientY - host.top - frame.top) / (frame.scaleY || 1);
	};

	const startDrag = (
		axis: GuideAxis,
		index: number | 'new',
		event: React.PointerEvent,
	) => {
		event.preventDefault();
		try {
			// Keeps the drag alive over the canvas; not every pointer can be
			// captured, and the guide still follows without it.
			(event.target as HTMLElement).setPointerCapture(event.pointerId);
		} catch {
			/* the drag works without capture */
		}
		setDragging({ axis, index, position: positionOf(axis, event) });
	};

	const onDragMove = (event: React.PointerEvent) => {
		if (!dragging) return;
		setDragging({ ...dragging, position: positionOf(dragging.axis, event) });
	};

	const onDragEnd = () => {
		if (!dragging) return;

		const size = dragging.axis === 'vertical' ? canvasWidth : canvasHeight;
		const inside = isGuideInside(dragging.position, size);

		if (dragging.index === 'new') {
			// A guide dropped outside the canvas is simply not created.
			if (inside) addGuide(dragging.axis, dragging.position);
		} else if (inside) {
			moveGuide(dragging.axis, dragging.index, dragging.position);
		} else {
			// Dragging a guide off the canvas is how it is taken away.
			removeGuide(dragging.axis, dragging.index);
		}

		setDragging(null);
	};

	const step = tickStep(frame.scaleX);
	const verticalTicks = ticksBetween(0, canvasWidth, step);
	const horizontalTicks = ticksBetween(0, canvasHeight, tickStep(frame.scaleY));

	const guideLine = (
		axis: GuideAxis,
		position: number,
		index: number | 'new',
	) => {
		const style =
			axis === 'vertical'
				? {
						left: frame.left + position * frame.scaleX,
						top: 0,
						width: 1,
						height: '100%',
					}
				: {
						left: 0,
						top: frame.top + position * frame.scaleY,
						height: 1,
						width: '100%',
					};

		return (
			<div
				key={`${axis}-${index}`}
				onPointerDown={(event) => {
					if (index !== 'new') startDrag(axis, index, event);
				}}
				className={`absolute bg-sky-400/70 ${
					index === 'new'
						? 'pointer-events-none'
						: axis === 'vertical'
							? 'pointer-events-auto cursor-ew-resize'
							: 'pointer-events-auto cursor-ns-resize'
				}`}
				style={{ ...style, outline: '4px solid transparent' }}
			></div>
		);
	};

	return (
		<div
			ref={container}
			className='pointer-events-none absolute inset-0 z-20 overflow-hidden'
			onPointerMove={onDragMove}
			onPointerUp={onDragEnd}
			onPointerCancel={onDragEnd}
		>
			{/* The guides themselves */}
			{guides.vertical.map((position, index) =>
				guideLine('vertical', position, index),
			)}
			{guides.horizontal.map((position, index) =>
				guideLine('horizontal', position, index),
			)}
			{dragging && guideLine(dragging.axis, dragging.position, 'new')}

			{/* Top ruler */}
			<div
				className='pointer-events-auto absolute left-0 top-0 h-5 w-full cursor-ns-resize border-b border-border bg-sidebar/95'
				onPointerDown={(event) => {
					startDrag('horizontal', 'new', event);
				}}
			>
				{verticalTicks.map((tick) => (
					<div
						key={tick}
						className='absolute top-0 h-full border-l border-border pl-1 text-[9px] leading-5 text-muted-foreground'
						style={{ left: frame.left + tick * frame.scaleX }}
					>
						{tick}
					</div>
				))}
			</div>

			{/* Left ruler */}
			<div
				className='pointer-events-auto absolute left-0 top-0 h-full w-5 cursor-ew-resize border-r border-border bg-sidebar/95'
				onPointerDown={(event) => {
					startDrag('vertical', 'new', event);
				}}
			>
				{horizontalTicks.map((tick) => (
					<div
						key={tick}
						className='absolute left-0 w-full border-t border-border text-center text-[9px] text-muted-foreground'
						style={{ top: frame.top + tick * frame.scaleY }}
					>
						{tick}
					</div>
				))}
			</div>

			<div
				className='absolute left-0 top-0 border-b border-r border-border bg-sidebar'
				style={{ width: RULER_SIZE, height: RULER_SIZE }}
			></div>
		</div>
	);
};

export default Rulers;
