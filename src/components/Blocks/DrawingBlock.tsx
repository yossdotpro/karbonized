import React, { useMemo } from 'react';
import { Brush } from 'lucide-react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import {
	PropertyRow,
	SliderField,
	ToggleButton,
	ToggleGroup,
} from '../CustomControls/PropertyControls';
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
						<div className='flex items-center gap-2'>
							<Brush />
							<Label>Stroke</Label>
						</div>
					}
				>
					<SliderField
						label='Width'
						min={1}
						max={80}
						unit='px'
						value={width}
						onChange={setWidth}
					/>

					<SliderField
						label='Thinning'
						unit='%'
						defaultValue={50}
						value={thinning}
						onChange={setThinning}
					/>

					{/* A stroke of a single width can be dashed; an outline cannot */}
					<PropertyRow label='Style'>
						<ToggleGroup
							className={
								variable ? 'pointer-events-none opacity-50' : undefined
							}
						>
							{(['solid', 'dashed', 'dotted'] as const).map((option) => (
								<ToggleButton
									key={option}
									label={
										variable ? 'Set thinning to 0 to dash the stroke' : option
									}
									active={style === option}
									onClick={() => setStyle(option as StrokeStyle)}
									className='text-[11px] capitalize'
								>
									{option}
								</ToggleButton>
							))}
						</ToggleGroup>
					</PropertyRow>

					<ColorPicker
						type='HexAlpha'
						label='Color'
						isGradientEnable={false}
						color={color}
						onColorChange={setColor}
					></ColorPicker>

					<PropertyRow label='Path'>
						<ToggleGroup>
							<ToggleButton
								label='Open path'
								active={!closed}
								onClick={() => setClosed(false)}
								className='text-[11px]'
							>
								Open
							</ToggleButton>
							<ToggleButton
								label='Closed path'
								active={closed}
								onClick={() => setClosed(true)}
								className='text-[11px]'
							>
								Closed
							</ToggleButton>
						</ToggleGroup>
					</PropertyRow>

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
