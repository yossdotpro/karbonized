import React, { useMemo } from 'react';
import { Brush } from 'lucide-react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { type StrokeStyle, strokeDashArray } from '@/lib/blocks/shapes';
import { outlinePath, parsePoints } from '@/lib/canvas/stroke';

interface Props {
	id: string;
}

/**
 * A freehand stroke, kept as a vector path. It is drawn with the brush tool
 * and scales with the block, so it stays sharp at any size.
 */
export const DrawingBlock: React.FC<Props> = ({ id }) => {
	const [path] = useControlState('', `${id}-path`);
	/* The points of the stroke: the width is applied when it is drawn, so it
	   can still be changed after the fact. */
	const [rawPoints] = useControlState('', `${id}-points`);
	const [thinning, setThinning] = useControlState(50, `${id}-thinning`);
	/* The box the path was drawn in: the stroke scales with the block. */
	const [viewWidth] = useControlState(100, `${id}-viewWidth`);
	const [viewHeight] = useControlState(100, `${id}-viewHeight`);
	const [color, setColor] = useControlState('#f3f4f6', `${id}-strokeColor`);
	const [width, setWidth] = useControlState(6, `${id}-strokeWidth`);
	const [style, setStyle] = useControlState<StrokeStyle>(
		'solid',
		`${id}-strokeStyle`,
	);
	const [closed, setClosed] = useControlState(false, `${id}-closed`);
	const [fillColor, setFillColor] = useControlState(
		'#00000000',
		`${id}-fillColor`,
	);

	const points = useMemo(() => parsePoints(rawPoints), [rawPoints]);
	// A stroke of one width is a stroked line; a thinning one is an outline,
	// the only way a line can be thick in one place and thin in another.
	const variable = thinning > 0 && points.length > 0;
	const outline = useMemo(
		() =>
			variable
				? outlinePath(points, {
						width,
						thinning: thinning / 100,
						taper: width * 1.5,
					})
				: '',
		[points, thinning, variable, width],
	);

	return (
		<ControlTemplate
			id={id}
			borderEditable={false}
			maskEditable={false}
			defaultHeight='100px'
			defaultWidth='100px'
			minHeight={'4px'}
			minWidth={'4px'}
			maxWidth={'8000px'}
			maxHeight={'8000px'}
			menu={
				<CustomCollapse
					isOpen
					menu={
						<div className='flex items-center gap-2 text-foreground'>
							<Brush size={18} className='text-muted-foreground' />
							<Label className='text-sm font-semibold'>Stroke</Label>
						</div>
					}
				>
					<div className='flex flex-row items-center gap-2 text-xs'>
						<Label className='my-auto w-24 text-xs text-muted-foreground'>
							Width: {width}
						</Label>
						<Slider
							className='flex-1'
							min={1}
							max={80}
							value={[width]}
							onValueChange={(value) => {
								setWidth(value[0]);
							}}
						></Slider>
					</div>

					<div className='flex flex-row items-center gap-2 text-xs'>
						<Label className='my-auto w-24 text-xs text-muted-foreground'>
							Thinning: {thinning}%
						</Label>
						<Slider
							className='flex-1'
							min={0}
							max={100}
							value={[thinning]}
							onValueChange={(value) => {
								setThinning(value[0]);
							}}
						></Slider>
					</div>

					{/* A stroke of a single width can be dashed; an outline cannot */}
					<ToggleGroup
						type='single'
						variant='outline'
						size='sm'
						className='w-full'
						disabled={variable}
						value={style}
						onValueChange={(value) => value && setStyle(value as StrokeStyle)}
					>
						{(['solid', 'dashed', 'dotted'] as const).map((option) => (
							<ToggleGroupItem
								key={option}
								value={option}
								className='flex-1 text-xs capitalize'
							>
								{option}
							</ToggleGroupItem>
						))}
					</ToggleGroup>

					<ColorPicker
						type='HexAlpha'
						label='Stroke Color'
						isGradientEnable={false}
						color={color}
						onColorChange={setColor}
					></ColorPicker>

					<ToggleGroup
						type='single'
						variant='outline'
						size='sm'
						className='w-full'
						value={closed ? 'closed' : 'open'}
						onValueChange={(value) => value && setClosed(value === 'closed')}
					>
						<ToggleGroupItem value='open' className='flex-1 text-xs'>
							Open
						</ToggleGroupItem>
						<ToggleGroupItem value='closed' className='flex-1 text-xs'>
							Closed
						</ToggleGroupItem>
					</ToggleGroup>

					{closed && (
						<ColorPicker
							type='HexAlpha'
							label='Fill'
							isGradientEnable={false}
							color={fillColor}
							onColorChange={setFillColor}
						></ColorPicker>
					)}
				</CustomCollapse>
			}
		>
			<svg
				viewBox={`0 0 ${viewWidth} ${viewHeight}`}
				preserveAspectRatio='none'
				className='flex h-full w-full flex-auto overflow-visible'
			>
				{/* The fill follows the path of the stroke, whatever its width */}
				{closed && <path d={`${path} Z`} fill={fillColor} stroke='none'></path>}

				{variable ? (
					<path d={outline} fill={color} stroke='none'></path>
				) : (
					<path
						d={closed ? `${path} Z` : path}
						fill='none'
						stroke={color}
						strokeWidth={width}
						strokeDasharray={strokeDashArray(style, width)}
						strokeLinecap='round'
						strokeLinejoin='round'
					/>
				)}
			</svg>
		</ControlTemplate>
	);
};

export default DrawingBlock;
