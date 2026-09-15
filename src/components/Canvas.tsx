import React, { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore, useDrawingStore } from '../stores';

export const Canvas: React.FC = () => {
	const [isDrawing, setIsDrawing] = useState(false);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const ctxRef = useRef<any>(null);

	const canDraw = useDrawingStore((state) => state.isDrawing);
	const isErasing = useDrawingStore((state) => state.isErasing);

	const strokeColor = useDrawingStore((state) => state.strokeColor);
	const lineWidth = useDrawingStore((state) => state.lineWidth);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

	const startDrawing = (e: any) => {
		if (ctxRef) {
			ctxRef.current?.beginPath();
			ctxRef.current?.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

			setIsDrawing(true);
		}
	};

	const endDrawing = () => {
		ctxRef.current.closePath();
		setIsDrawing(false);
	};

	const draw = (e: any) => {
		if (!isDrawing) {
			return;
		}

		ctxRef.current.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

		if (isErasing) {
			ctxRef.current.globalCompositeOperation = 'destination-out';
		} else {
			ctxRef.current.globalCompositeOperation = 'source-over';
		}

		ctxRef.current.stroke();
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext('2d');

		if (ctx) {
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			// ctx.globalAlpha = 0.1;
			ctx.lineWidth = lineWidth;
			ctx.strokeStyle = strokeColor;
			ctxRef.current = ctx;
		}
	}, [lineWidth, strokeColor]);

	return (
		<>
			<canvas
				ref={canvasRef}
				width={currentWorkspace?.workspaceWidth ?? 1280}
				height={currentWorkspace?.workspaceHeight ?? 720}
				className={`${
					canDraw || isErasing ? '' : 'pointer-events-none'
				} absolute z-50`}
				style={{ backgroundColor: '#4e4e4e00' }}
				onMouseDown={startDrawing}
				onMouseUp={endDrawing}
				onMouseMove={draw}
			></canvas>
		</>
	);
};
