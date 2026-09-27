import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { ColorPicker } from '../CustomControls/ColorPicker';
import React, { type ReactNode } from 'react';
import { useElementById } from '@/hooks/useElementById';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import {
	FieldInput,
	PropertyRow,
	SliderField,
	ToggleButton,
	ToggleGroup,
} from '../CustomControls/PropertyControls';
import {
	Box,
	Droplets,
	Layers2,
	Move,
	SlidersHorizontal,
	Square,
	Trash2,
} from 'lucide-react';
import { IconFlipVertical, IconFlipHorizontal } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { Portal } from 'react-portal';
import { useControlMenu } from './ControlMenuContext';

interface ControlMenuProps {
	/** The section the block adds to the panel, under the common ones. */
	menu?: ReactNode;
}

export const ControlMenu: React.FC<ControlMenuProps> = ({ menu }) => {
	const {
		id,
		controlID,
		shadowEditable,
		maskEditable,
		borderEditable,
		Masks,
		controlPos,
		controlSize,
		onSizeInput,
		rotation,
		warped,
		onRotate,
		pastHistory,
		setPastHistory,
		setFutureHistory,
		setControlState,
		setControlPos,
		setControlSize,
		setID,
		onDeleteControl,
		flipX,
		setFlipX,
		flipY,
		setFlipY,
		zIndex,
		setzIndex,
		rotateX,
		setRotateX,
		rotateY,
		setRotateY,
		shadowX,
		setShadowX,
		shadowY,
		setShadowY,
		shadowBlur,
		setShadowBlur,
		shadowColor,
		setShadowColor,
		borderRadius,
		setBorderRadius,
		mask,
		setMask,
		maskRepeat,
		setMaskRepeat,
		blur,
		setBlur,
		brightness,
		setBrightness,
		contrast,
		setContrast,
		grayscale,
		setGrayscale,
		huerotate,
		setHueRotate,
		invert,
		setInvert,
		saturate,
		setSaturate,
		opacity,
		setOpacity,
		sepia,
		setSepia,
	} = useControlMenu();

	const menuNode = useElementById('menu');

	if (controlID !== id || !menuNode) {
		return null;
	}
	const setPosition = (axis: 'x' | 'y', raw: string) => {
		const value = parseFloat(raw);
		if (Number.isNaN(value)) return;

		const current = {
			x: controlPos?.x as unknown as number,
			y: controlPos?.y as unknown as number,
		};
		const next = { ...current, [axis]: value };

		setPastHistory([...pastHistory, { id: `${id}-pos`, value: current }]);
		setControlState({ id: `${id}-pos`, value: next });
		setControlPos(next);
		setFutureHistory([]);
	};

	const setSize = (axis: 'w' | 'h', raw: string) => {
		const value = parseFloat(raw);
		if (Number.isNaN(value)) return;

		const current = {
			w: controlSize?.w as unknown as number,
			h: controlSize?.h as unknown as number,
		};
		const next = { ...current, [axis]: value };

		setPastHistory([
			...pastHistory,
			{ id: `${id}-control_size`, value: current },
		]);
		setControlState({ id: `${id}-control_size`, value: next });
		setControlSize(next);
		setFutureHistory([]);
		onSizeInput?.(axis);
	};

	const setNumber = (setter: (value: number) => void) => (raw: string) => {
		const value = parseFloat(raw);
		if (!Number.isNaN(value)) setter(value);
	};

	return (
		<>
			{/* @ts-ignore */}
			<Portal key={id + '_control_menu'} node={menuNode}>
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.15, ease: 'easeOut' }}
					className='flex flex-col'
				>
					{/* Position */}
					<CustomCollapse
						isOpen
						menu={
							<div className='flex items-center gap-2'>
								<Move />
								<Label>Layout</Label>
							</div>
						}
					>
						<div className='grid grid-cols-2 gap-1.5'>
							<FieldInput
								label='X'
								value={controlPos?.x}
								onChange={(value) => setPosition('x', value)}
							/>
							<FieldInput
								label='Y'
								value={controlPos?.y}
								onChange={(value) => setPosition('y', value)}
							/>
							<FieldInput
								label='W'
								value={controlSize?.w}
								onChange={(value) => setSize('w', value)}
							/>
							<FieldInput
								label='H'
								value={controlSize?.h}
								onChange={(value) => setSize('h', value)}
							/>
						</div>

						<div className='flex items-center gap-1.5'>
							<FieldInput
								label={<Layers2 className='size-3' />}
								title='Layer order (z-index)'
								value={parseInt(zIndex)}
								onChange={(value) => setzIndex(value)}
							/>
							<ToggleGroup>
								<ToggleButton
									label='Flip horizontally'
									active={flipX}
									onClick={() => setFlipX(!flipX)}
								>
									<IconFlipVertical />
								</ToggleButton>
								<ToggleButton
									label='Flip vertically'
									active={flipY}
									onClick={() => setFlipY(!flipY)}
								>
									<IconFlipHorizontal />
								</ToggleButton>
							</ToggleGroup>
						</div>

						<div className='flex items-center gap-1.5'>
							<FieldInput
								label='Rotate'
								suffix='°'
								disabled={warped}
								title={
									warped
										? 'The block was warped: reset it to rotate it by degrees'
										: undefined
								}
								value={rotation}
								onChange={(value) => {
									const degrees = parseFloat(value);
									if (Number.isFinite(degrees)) onRotate?.(degrees);
								}}
							/>
							{warped && (
								<Button
									size='sm'
									variant='outline'
									className='h-7 text-xs'
									onClick={() => {
										onRotate?.(0);
									}}
								>
									Reset warp
								</Button>
							)}
						</div>

						<SliderField
							label='Tilt X'
							min={-180}
							max={180}
							unit='°'
							defaultValue={0}
							value={rotateX}
							onChange={setRotateX}
						/>
						<SliderField
							label='Tilt Y'
							min={-180}
							max={180}
							unit='°'
							defaultValue={0}
							value={rotateY}
							onChange={setRotateY}
						/>
					</CustomCollapse>

					{/* Shadow Config */}
					{shadowEditable && (
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2'>
									<Droplets />
									<Label>Shadow</Label>
								</div>
							}
						>
							<div className='grid grid-cols-2 gap-1.5'>
								<FieldInput
									label='X'
									value={shadowX}
									onChange={setNumber(setShadowX)}
								/>
								<FieldInput
									label='Y'
									value={shadowY}
									onChange={setNumber(setShadowY)}
								/>
							</div>

							<SliderField
								label='Blur'
								max={100}
								value={shadowBlur}
								onChange={setShadowBlur}
							/>

							<ColorPicker
								type='HexAlpha'
								label='Color'
								color={shadowColor}
								isGradientEnable={false}
								onColorChange={(color) => {
									setShadowColor(color);
								}}
							></ColorPicker>
						</CustomCollapse>
					)}

					{/* Border  */}
					{borderEditable && (
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2'>
									<Square />
									<Label>Corners</Label>
								</div>
							}
						>
							<SliderField
								label='Radius'
								max={22}
								value={borderRadius}
								onChange={setBorderRadius}
							/>
						</CustomCollapse>
					)}

					{/* Mask */}
					{maskEditable && (
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2'>
									<Box />
									<Label>Mask</Label>
								</div>
							}
						>
							<PropertyRow label='Shape'>
								<Select
									value={mask}
									onValueChange={(e: string) => {
										setMask(e);
									}}
								>
									<SelectTrigger className='h-7 w-full capitalize'>
										<SelectValue placeholder='None' />
									</SelectTrigger>
									<SelectContent>
										{Masks.map((i: string) => {
											return (
												<SelectItem key={i} value={i} className='capitalize'>
													{i.replace('mask-', '').replace('-', ' ')}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</PropertyRow>

							<PropertyRow label='Repeat'>
								<Switch
									checked={maskRepeat}
									onCheckedChange={(checked) => {
										setMaskRepeat(checked);
									}}
								/>
							</PropertyRow>
						</CustomCollapse>
					)}

					{/* Filters */}
					<CustomCollapse
						menu={
							<div className='flex items-center gap-2'>
								<SlidersHorizontal />
								<Label>Filters</Label>
							</div>
						}
					>
						<SliderField
							label='Opacity'
							unit='%'
							defaultValue={100}
							value={opacity}
							onChange={setOpacity}
						/>
						<SliderField
							label='Blur'
							max={100}
							unit='px'
							defaultValue={0}
							value={blur}
							onChange={setBlur}
						/>
						<SliderField
							label='Brightness'
							min={1}
							max={200}
							unit='%'
							defaultValue={100}
							value={brightness}
							onChange={setBrightness}
						/>
						<SliderField
							label='Contrast'
							min={100}
							max={300}
							unit='%'
							defaultValue={100}
							value={contrast}
							onChange={setContrast}
						/>
						<SliderField
							label='Saturate'
							max={200}
							unit='%'
							defaultValue={100}
							value={saturate}
							onChange={setSaturate}
						/>
						<SliderField
							label='Grayscale'
							unit='%'
							defaultValue={0}
							value={grayscale}
							onChange={setGrayscale}
						/>
						<SliderField
							label='Sepia'
							unit='%'
							defaultValue={0}
							value={sepia}
							onChange={setSepia}
						/>
						<SliderField
							label='Invert'
							unit='%'
							defaultValue={0}
							value={invert}
							onChange={setInvert}
						/>
						<SliderField
							label='Hue'
							max={359}
							unit='°'
							defaultValue={0}
							value={huerotate}
							onChange={setHueRotate}
						/>
					</CustomCollapse>

					{menu}

					{/* Custom Components Menu */}
					<div id='custom_menu'></div>

					{/* Delete */}
					<div className='px-2 pb-2 pt-3'>
						<Button
							variant='ghost'
							className='w-full justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive'
							onClick={() => {
								setID('');
								onDeleteControl();
							}}
						>
							<Trash2 size={14}></Trash2>
							Delete block
						</Button>
					</div>
				</motion.div>
			</Portal>
		</>
	);
};
