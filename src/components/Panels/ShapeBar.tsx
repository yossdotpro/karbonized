import React from 'react';
import {
	SHAPE_OPTIONS,
	type ShapeKind,
	isStrokedShape,
	shapeInset,
	shapePath,
} from '@/lib/blocks/shapes';
import { useUIStore } from '@/stores';
import { Tooltip } from '../CustomControls/Tooltip';

/** A shape drawn the way the block draws it, for the picker. */
export const ShapeGlyph: React.FC<{ kind: ShapeKind }> = ({ kind }) => {
	const stroked = isStrokedShape(kind);
	const strokeWidth = stroked ? 10 : 0;

	return (
		<svg viewBox='0 0 100 100' className='h-full w-full'>
			<g
				transform={`translate(${shapeInset(strokeWidth)} ${shapeInset(
					strokeWidth,
				)})`}
			>
				<path
					d={shapePath(kind, { width: 100, height: 100 }, strokeWidth)}
					fill={stroked ? 'none' : 'currentColor'}
					stroke={stroked ? 'currentColor' : 'none'}
					strokeWidth={strokeWidth}
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			</g>
		</svg>
	);
};

/**
 * Which shape the draw tool puts on the canvas. Shows while that tool is
 * active, the way the brush settings show while drawing.
 */
export const ShapeBar: React.FC = () => {
	const drawShape = useUIStore((state) => state.drawShape);
	const startDrawing = useUIStore((state) => state.startDrawing);

	return (
		<div className='z-50 mb-12 ml-auto mr-auto mt-auto flex flex-row items-center gap-0.5 rounded-[10px] border border-border bg-popover px-1.5 py-1 shadow-lg shadow-black/20'>
			{SHAPE_OPTIONS.map((option) => (
				<Tooltip key={option.value} message={option.label} placement='top'>
					<button
						type='button'
						aria-label={`Draw ${option.label.toLowerCase()}`}
						aria-pressed={drawShape === option.value}
						onClick={() => {
							startDrawing(option.value);
						}}
						className={`flex size-8 items-center justify-center rounded-control p-1.5 text-foreground transition-colors hover:bg-accent ${
							drawShape === option.value ? 'bg-accent' : ''
						}`}
					>
						<ShapeGlyph kind={option.value}></ShapeGlyph>
					</button>
				</Tooltip>
			))}

			<span className='ml-1.5 mr-1 text-[11px] text-muted-foreground'>
				Drag on the canvas · Shift keeps it square · Alt draws from the center
			</span>
		</div>
	);
};

export default ShapeBar;
