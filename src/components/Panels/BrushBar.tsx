import React from 'react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { Slider } from '../ui/slider';
import { useUIStore } from '@/stores';

/** One setting of the bar: a small label and its value over the control. */
const Setting: React.FC<{
	label: string;
	value: string;
	title?: string;
	children: React.ReactNode;
}> = ({ label, value, title, children }) => (
	<div className='flex flex-col gap-1.5 px-2.5 py-1' title={title}>
		<div className='flex items-center justify-between gap-3 text-[10px] leading-none'>
			<span className='font-medium uppercase tracking-wide text-muted-foreground'>
				{label}
			</span>
			<span className='font-mono tabular-nums text-foreground'>{value}</span>
		</div>
		<div className='flex h-4 items-center gap-2'>{children}</div>
	</div>
);

const Divider: React.FC = () => <div className='h-8 w-px bg-border' />;

/** Brush settings, shown while the brush tool is active. */
export const BrushBar: React.FC = () => {
	const color = useUIStore((state) => state.brushColor);
	const setColor = useUIStore((state) => state.setBrushColor);
	const size = useUIStore((state) => state.brushSize);
	const setSize = useUIStore((state) => state.setBrushSize);
	const smoothing = useUIStore((state) => state.brushSmoothing);
	const setSmoothing = useUIStore((state) => state.setBrushSmoothing);
	const thinning = useUIStore((state) => state.brushThinning);
	const setThinning = useUIStore((state) => state.setBrushThinning);

	// The dot previews the stroke, capped so it fits the bar.
	const dot = Math.max(3, Math.min(16, size / 2));

	return (
		<div className='z-50 mb-12 ml-auto mr-auto mt-auto flex flex-row items-center gap-0.5 rounded-[12px] border border-border bg-popover/95 p-1 shadow-xl shadow-black/20 backdrop-blur'>
			<span
				aria-hidden
				className='flex size-8 shrink-0 items-center justify-center rounded-control bg-muted'
			>
				<span
					className='block rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/20'
					style={{ width: dot, height: dot, background: color }}
				/>
			</span>

			<Setting label='Size' value={`${size}px`}>
				<Slider
					aria-label='Brush size'
					className='w-28'
					min={1}
					max={80}
					step={1}
					value={[size]}
					onValueChange={(value) => {
						setSize(value[0]);
					}}
				/>
			</Setting>

			<Divider />

			<Setting
				label='Smoothing'
				value={smoothing.toFixed(1)}
				title='How much the stroke is smoothed while you draw'
			>
				<Slider
					aria-label='Smoothing'
					className='w-24'
					min={0}
					max={6}
					step={0.2}
					value={[smoothing]}
					onValueChange={(value) => {
						setSmoothing(value[0]);
					}}
				/>
			</Setting>

			<Divider />

			{/* How much the stroke thins with pressure, or with speed on a mouse */}
			<Setting
				label='Thinning'
				value={`${thinning}%`}
				title='How much the stroke thins with pen pressure, or with speed on a mouse'
			>
				<Slider
					aria-label='Thinning'
					className='w-24'
					min={0}
					max={100}
					step={5}
					value={[thinning]}
					onValueChange={(value) => {
						setThinning(value[0]);
					}}
				/>
			</Setting>

			<Divider />

			<div className='px-1'>
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
		</div>
	);
};

export default BrushBar;
