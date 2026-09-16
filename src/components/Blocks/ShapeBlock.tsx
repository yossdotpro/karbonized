import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { Hexagon } from 'lucide-react';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { ShapeHandler } from './ShapeHandler';
import {
	DEFAULT_GEOMETRY,
	SHAPE_OPTIONS,
	type ShapeKind,
	type StrokeStyle,
	isStrokedShape,
	resolveShape,
	shapeInset,
	shapePath,
	strokeDashArray,
} from '@/lib/blocks/shapes';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

interface Props {
	id: string;
}

/** Preview of a shape for the picker, drawn with the same geometry. */
const ShapePreview: React.FC<{ kind: ShapeKind; color: string }> = ({
	kind,
	color,
}) => {
	const stroked = isStrokedShape(kind);
	const strokeWidth = stroked ? 8 : 0;

	return (
		<svg viewBox='0 0 100 100' className='h-full w-full'>
			<g
				transform={`translate(${shapeInset(strokeWidth)} ${shapeInset(strokeWidth)})`}
			>
				<path
					d={shapePath(kind, { width: 100, height: 100 }, strokeWidth)}
					fill={stroked ? 'none' : color}
					stroke={stroked ? color : 'none'}
					strokeWidth={strokeWidth}
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			</g>
		</svg>
	);
};

export const ShapeBlock: React.FC<Props> = ({ id }) => {
	/* Component States */
	const [color, setColor] = useControlState('#f3f4f6', `${id}-color`);
	// Older projects store ids such as `oval` or `poligon`; see resolveShape.
	const [shape, setShape] = useControlState('ellipse', `${id}-shape`);
	const [strokeColor, setStrokeColor] = useControlState(
		'#f3f4f6',
		`${id}-strokeColor`,
	);
	const [strokeWidth, setStrokeWidth] = useControlState(0, `${id}-strokeWidth`);
	const [strokeStyle, setStrokeStyle] = useControlState<StrokeStyle>(
		'solid',
		`${id}-strokeStyle`,
	);
	const [cornerRadius, setCornerRadius] = useControlState(
		0,
		`${id}-cornerRadius`,
	);
	const [sides, setSides] = useControlState(
		DEFAULT_GEOMETRY.sides,
		`${id}-sides`,
	);
	const [points, setPoints] = useControlState(
		DEFAULT_GEOMETRY.points,
		`${id}-points`,
	);
	const [innerRadius, setInnerRadius] = useControlState(
		DEFAULT_GEOMETRY.innerRadius,
		`${id}-innerRadius`,
	);

	/* The shape is drawn in the block's own pixels, so it is measured instead
	   of stretched: corner radii and strokes keep their size. */
	const container = useRef<HTMLDivElement>(null);
	const [box, setBox] = useState({ width: 0, height: 0 });

	const measure = useCallback(() => {
		const element = container.current;
		if (!element) return;

		setBox((current) =>
			current.width === element.offsetWidth &&
			current.height === element.offsetHeight
				? current
				: { width: element.offsetWidth, height: element.offsetHeight },
		);
	}, []);

	// After every render. Reading the layout works even when the window is not
	// painting, unlike observers.
	useLayoutEffect(measure);

	// Resizes that do not re-render the block, such as dragging its handles.
	useEffect(() => {
		const element = container.current;
		if (!element) return;

		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => {
			observer.disconnect();
		};
	}, [measure]);

	const resolved = resolveShape(shape);
	const kind = resolved?.kind;
	const stroked = kind !== undefined && isStrokedShape(kind);
	// Lines and arrows are nothing without a stroke.
	const width = stroked && strokeWidth === 0 ? 6 : strokeWidth;
	const inset = shapeInset(width);

	return (
		<>
			<ControlTemplate
				id={id}
				borderEditable={false}
				maskEditable={false}
				defaultHeight='120px'
				defaultWidth='120px'
				minHeight={'10px'}
				minWidth={'10px'}
				maxWidth={'4000px'}
				maxHeight={'4000px'}
				menu={
					<>
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<Hexagon size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Shape</Label>
								</div>
							}
						>
							{/* Shape */}
							<div className='grid grid-cols-4 gap-1.5'>
								{SHAPE_OPTIONS.map((option) => (
									<button
										key={option.value}
										type='button'
										title={option.label}
										aria-label={option.label}
										aria-pressed={kind === option.value}
										onClick={() => {
											setShape(option.value);
										}}
										className={`flex h-12 cursor-pointer items-center justify-center rounded-control p-2 transition-colors hover:bg-accent ${
											kind === option.value ? 'bg-accent' : 'bg-muted/50'
										}`}
									>
										<ShapePreview
											kind={option.value}
											color='currentColor'
										></ShapePreview>
									</button>
								))}
							</div>

							{kind === 'rectangle' && (
								<div className='flex flex-row items-center gap-2 text-xs'>
									<Label className='my-auto w-24 text-xs text-muted-foreground'>
										Corners
									</Label>
									<Slider
										className='flex-1'
										max={200}
										value={[cornerRadius]}
										onValueChange={(value) => {
											setCornerRadius(value[0]);
										}}
									></Slider>
								</div>
							)}

							{kind === 'polygon' && (
								<div className='flex flex-row items-center gap-2 text-xs'>
									<Label className='my-auto w-24 text-xs text-muted-foreground'>
										Sides: {sides}
									</Label>
									<Slider
										className='flex-1'
										min={3}
										max={12}
										value={[sides]}
										onValueChange={(value) => {
											setSides(value[0]);
										}}
									></Slider>
								</div>
							)}

							{kind === 'star' && (
								<>
									<div className='flex flex-row items-center gap-2 text-xs'>
										<Label className='my-auto w-24 text-xs text-muted-foreground'>
											Points: {points}
										</Label>
										<Slider
											className='flex-1'
											min={3}
											max={12}
											value={[points]}
											onValueChange={(value) => {
												setPoints(value[0]);
											}}
										></Slider>
									</div>
									<div className='flex flex-row items-center gap-2 text-xs'>
										<Label className='my-auto w-24 text-xs text-muted-foreground'>
											Depth
										</Label>
										<Slider
											className='flex-1'
											min={5}
											max={95}
											value={[innerRadius]}
											onValueChange={(value) => {
												setInnerRadius(value[0]);
											}}
										></Slider>
									</div>
								</>
							)}

							{!stroked && (
								<ColorPicker
									type='HexAlpha'
									label='Fill'
									isGradientEnable={false}
									color={color}
									onColorChange={setColor}
								></ColorPicker>
							)}
						</CustomCollapse>

						{/* Stroke */}
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<div className='h-4 w-4 rounded-full border-2 border-muted-foreground'></div>
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
									min={stroked ? 1 : 0}
									max={60}
									value={[width]}
									onValueChange={(value) => {
										setStrokeWidth(value[0]);
									}}
								></Slider>
							</div>

							<ToggleGroup
								type='single'
								variant='outline'
								size='sm'
								className='w-full'
								value={strokeStyle}
								onValueChange={(value) =>
									value && setStrokeStyle(value as StrokeStyle)
								}
							>
								{(['solid', 'dashed', 'dotted'] as const).map((style) => (
									<ToggleGroupItem
										key={style}
										value={style}
										className='flex-1 text-xs capitalize'
									>
										{style}
									</ToggleGroupItem>
								))}
							</ToggleGroup>

							<ColorPicker
								type='HexAlpha'
								label='Stroke Color'
								isGradientEnable={false}
								color={strokeColor}
								onColorChange={setStrokeColor}
							></ColorPicker>
						</CustomCollapse>
					</>
				}
			>
				<div ref={container} className='flex h-full w-full flex-auto'>
					{kind === undefined ? (
						/* Arrows drawn by older versions keep their own graphic */
						<ShapeHandler color={color} type={shape}></ShapeHandler>
					) : (
						box.width > 0 && (
							<svg
								width={box.width}
								height={box.height}
								viewBox={`0 0 ${box.width} ${box.height}`}
								className='flex flex-auto overflow-visible'
							>
								<g transform={`translate(${inset} ${inset})`}>
									<path
										d={shapePath(
											kind,
											{
												width: box.width,
												height: box.height,
												cornerRadius,
												sides: resolved?.sides ?? sides,
												points,
												innerRadius,
											},
											width,
										)}
										fill={stroked ? 'none' : color}
										stroke={width > 0 ? strokeColor : 'none'}
										strokeWidth={width}
										strokeDasharray={strokeDashArray(strokeStyle, width)}
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</g>
							</svg>
						)
					)}
				</div>
			</ControlTemplate>
		</>
	);
};
export default ShapeBlock;
