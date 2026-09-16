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
import { ContextMenuItem } from '../ui/context-menu';
import { useControlsStore, useHistoryStore } from '@/stores';
import { addBlock, deleteBlocks, readProperty } from '@/lib/editor/actions';
import { serializePoints, smoothPath } from '@/lib/canvas/stroke';
import {
	DEFAULT_GEOMETRY,
	SHAPE_OPTIONS,
	shapeNodes,
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
	/* A gradient fill, painted by the SVG itself so it follows the shape. */
	const [fillMode, setFillMode] = useControlState<'solid' | 'gradient'>(
		'solid',
		`${id}-fillMode`,
	);
	const [gradientFrom, setGradientFrom] = useControlState(
		'#0da2e7',
		`${id}-gradientFrom`,
	);
	const [gradientTo, setGradientTo] = useControlState(
		'#5895c8',
		`${id}-gradientTo`,
	);
	const [gradientAngle, setGradientAngle] = useControlState(
		45,
		`${id}-gradientAngle`,
	);
	const gradientId = `shape-gradient-${id}`;

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

	/**
	 * Turn the shape into a stroke block with the same outline, which the node
	 * tool can then edit point by point.
	 */
	const convertToStroke = () => {
		const kind = resolveShape(shape)?.kind;
		if (!kind || box.width === 0) return;

		const geometry = {
			width: box.width,
			height: box.height,
			cornerRadius,
			sides,
			points,
			innerRadius,
		};
		const nodes = shapeNodes(kind, geometry, width);
		if (nodes.length < 2) return;

		const position = readProperty(`${id}-pos`).value as
			{ x: number; y: number } | undefined;

		useHistoryStore.getState().transaction(() => {
			const block = addBlock({
				type: 'drawing',
				x: position?.x ?? 0,
				y: position?.y ?? 0,
				width: Math.round(box.width),
				height: Math.round(box.height),
				properties: {
					points: serializePoints(nodes),
					path: smoothPath(nodes),
					thinning: 0,
					closed: !isStrokedShape(kind),
					fillColor: isStrokedShape(kind) ? '#00000000' : color,
					strokeColor: strokeColor,
					strokeWidth: Math.max(1, width),
					viewWidth: Math.round(box.width),
					viewHeight: Math.round(box.height),
				},
			});
			deleteBlocks([id]);
			useControlsStore.getState().setSelection([block.id]);
			useControlsStore.getState().setCurrentControlID(block.id);
		});
	};

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
				contextMenu={
					<ContextMenuItem onClick={convertToStroke}>
						Convert to stroke
					</ContextMenuItem>
				}
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
								<>
									<ToggleGroup
										type='single'
										variant='outline'
										size='sm'
										className='w-full'
										value={fillMode}
										onValueChange={(value) =>
											value && setFillMode(value as 'solid' | 'gradient')
										}
									>
										<ToggleGroupItem value='solid' className='flex-1 text-xs'>
											Solid
										</ToggleGroupItem>
										<ToggleGroupItem
											value='gradient'
											className='flex-1 text-xs'
										>
											Gradient
										</ToggleGroupItem>
									</ToggleGroup>

									{fillMode === 'solid' ? (
										<ColorPicker
											type='HexAlpha'
											label='Fill'
											isGradientEnable={false}
											color={color}
											onColorChange={setColor}
										></ColorPicker>
									) : (
										<>
											<ColorPicker
												type='HexAlpha'
												label='From'
												isGradientEnable={false}
												color={gradientFrom}
												onColorChange={setGradientFrom}
											></ColorPicker>
											<ColorPicker
												type='HexAlpha'
												label='To'
												isGradientEnable={false}
												color={gradientTo}
												onColorChange={setGradientTo}
											></ColorPicker>
											<div className='flex flex-row items-center gap-2 text-xs'>
												<Label className='my-auto w-24 text-xs text-muted-foreground'>
													Angle: {gradientAngle}°
												</Label>
												<Slider
													className='flex-1'
													min={0}
													max={360}
													value={[gradientAngle]}
													onValueChange={(value) => {
														setGradientAngle(value[0]);
													}}
												></Slider>
											</div>
										</>
									)}
								</>
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
								{fillMode === 'gradient' && !stroked && (
									<defs>
										<linearGradient
											id={gradientId}
											gradientUnits='objectBoundingBox'
											gradientTransform={`rotate(${gradientAngle} 0.5 0.5)`}
										>
											<stop offset='0%' stopColor={gradientFrom}></stop>
											<stop offset='100%' stopColor={gradientTo}></stop>
										</linearGradient>
									</defs>
								)}
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
										fill={
											stroked
												? 'none'
												: fillMode === 'gradient'
													? `url(#${gradientId})`
													: color
										}
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
