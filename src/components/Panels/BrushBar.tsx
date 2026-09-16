import React from 'react';
import { Brush, Spline } from 'lucide-react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { Slider } from '../ui/slider';
import { Tooltip } from '../CustomControls/Tooltip';
import { useUIStore } from '@/stores';

/** Brush settings, shown while the brush tool is active. */
export const BrushBar: React.FC = () => {
	const color = useUIStore((state) => state.brushColor);
	const setColor = useUIStore((state) => state.setBrushColor);
	const size = useUIStore((state) => state.brushSize);
	const setSize = useUIStore((state) => state.setBrushSize);
	const smoothing = useUIStore((state) => state.brushSmoothing);
	const setSmoothing = useUIStore((state) => state.setBrushSmoothing);

	return (
		<div className='z-50 mb-12 ml-auto mr-auto mt-auto flex w-80 flex-row items-center gap-2 rounded-[10px] border border-border bg-popover px-3 py-1.5 shadow-lg shadow-black/20'>
			<Tooltip message={`Size: ${size}px`} placement='top'>
				<div className='flex flex-auto items-center gap-2'>
					<Brush size={16} className='shrink-0 text-muted-foreground'></Brush>
					<Slider
						className='flex flex-auto'
						min={1}
						max={80}
						step={1}
						value={[size]}
						onValueChange={(value) => {
							setSize(value[0]);
						}}
					/>
				</div>
			</Tooltip>

			<Tooltip message={`Smoothing: ${smoothing.toFixed(1)}`} placement='top'>
				<div className='flex flex-auto items-center gap-2'>
					<Spline size={16} className='shrink-0 text-muted-foreground'></Spline>
					<Slider
						className='flex flex-auto'
						min={0}
						max={6}
						step={0.2}
						value={[smoothing]}
						onValueChange={(value) => {
							setSmoothing(value[0]);
						}}
					/>
				</div>
			</Tooltip>

			<ColorPicker
				type='HexAlpha'
				isGradientEnable={false}
				color={color}
				onColorChange={setColor}
				showLabel={false}
				placement='top-end'
				label='Brush color'
			></ColorPicker>
		</div>
	);
};

export default BrushBar;
