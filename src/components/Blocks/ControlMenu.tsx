import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Slider } from '@/components/ui/slider';
import { ColorPicker } from '../CustomControls/ColorPicker';
import React, { type ReactNode } from 'react';
import { useElementById } from '@/hooks/useElementById';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { Droplets, Square, Box, Palette, Trash2, Move } from 'lucide-react';
import {
	IconFlipVertical,
	IconFlipHorizontal,
	IconReload,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { Portal } from 'react-portal';
import { Checkbox } from '../ui/checkbox';
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

	return (
		<>
			{/* @ts-ignore */}
			<Portal key={id + '_control_menu'} node={menuNode}>
				<motion.div
					initial={{ marginTop: '25px' }}
					animate={{ marginTop: '5px' }}
					className='flex flex-col'
				>
					{/* Position */}
					<CustomCollapse
						menu={
							<div className='flex items-center gap-2 text-foreground'>
								<Move size={18} className='text-muted-foreground' />
								<Label className='text-sm font-semibold'>Position</Label>
							</div>
						}
					>
						<div className='flex flex-col gap-4'>
							{/* Flip Options */}
							<div className='flex gap-2'>
								<Button
									variant={flipX ? 'default' : 'outline'}
									size='icon'
									className='flex-1 transition-all duration-200 '
									onClick={() => {
										setFlipX(!flipX);
									}}
								>
									<IconFlipVertical size={16} />
								</Button>
								<Button
									variant={flipY ? 'default' : 'outline'}
									size='icon'
									className='flex-1 transition-all duration-200 '
									onClick={() => {
										setFlipY(!flipY);
									}}
								>
									<IconFlipHorizontal size={16} />
								</Button>
							</div>

							{/* Position */}
							<div className='grid grid-cols-3 gap-2'>
								{/* Position X */}
								<div className='flex items-center gap-2'>
									<Label className='text-xs text-muted-foreground w-4'>X</Label>
									<Input
										type={'number'}
										className='h-8 text-sm'
										onChange={(ev) => {
											setPastHistory([
												...pastHistory,
												{
													id: `${id}-pos`,
													value: {
														x: controlPos?.x as unknown as number,
														y: controlPos?.y as unknown as number,
													},
												},
											]);
											setControlState({
												id: `${id}-pos`,
												value: {
													x: parseFloat(ev.target.value),
													y: controlPos?.y as unknown as number,
												},
											});
											setControlPos({
												x: parseFloat(ev.target.value),
												y: controlPos?.y as unknown as number,
											});

											setFutureHistory([]);
										}}
										value={controlPos?.x}
									></Input>
								</div>

								{/* Position Y */}
								<div className='flex items-center gap-2'>
									<Label className='text-xs text-muted-foreground w-4'>Y</Label>
									<Input
										type={'number'}
										className='h-8 text-sm'
										onChange={(ev) => {
											setPastHistory([
												...pastHistory,
												{
													id: `${id}-pos`,
													value: {
														x: controlPos?.x as unknown as number,
														y: controlPos?.y as unknown as number,
													},
												},
											]);
											setControlState({
												id: `${id}-pos`,
												value: {
													y: parseFloat(ev.target.value),
													x: controlPos?.x as unknown as number,
												},
											});

											setControlPos({
												y: parseFloat(ev.target.value),
												x: controlPos?.x as unknown as number,
											});

											setFutureHistory([]);
										}}
										value={controlPos?.y}
									></Input>
								</div>

								{/* Position Z */}
								<div className='flex items-center gap-2'>
									<Label className='text-xs text-muted-foreground w-4'>Z</Label>
									<Input
										type={'number'}
										className='h-8 text-sm'
										onChange={(ev) => {
											setzIndex(ev.currentTarget.value);
										}}
										value={parseInt(zIndex)}
									></Input>
								</div>
							</div>

							{/* Size */}
							<div className='grid grid-cols-2 gap-2'>
								<div className='flex items-center gap-2'>
									<Label className='text-xs text-muted-foreground w-4'>W</Label>
									<Input
										type={'number'}
										className='h-8 text-sm'
										onChange={(ev) => {
											setPastHistory([
												...pastHistory,
												{
													id: `${id}-control_size`,
													value: {
														w: controlSize?.w as unknown as number,
														h: controlSize?.h as unknown as number,
													},
												},
											]);
											setControlState({
												id: `${id}-control_size`,
												value: {
													w: parseFloat(ev.target.value),
													h: controlSize?.h as unknown as number,
												},
											});

											setControlSize({
												w: parseFloat(ev.target.value),
												h: controlSize?.h as unknown as number,
											});

											setFutureHistory([]);
											onSizeInput?.('w');
										}}
										value={controlSize?.w}
									></Input>
								</div>

								<div className='flex items-center gap-2'>
									<Label className='text-xs text-muted-foreground w-4'>H</Label>
									<Input
										type={'number'}
										className='h-8 text-sm'
										onChange={(ev) => {
											setPastHistory([
												...pastHistory,
												{
													id: `${id}-control_size`,
													value: {
														w: controlSize?.w as unknown as number,
														h: controlSize?.h as unknown as number,
													},
												},
											]);
											setControlState({
												id: `${id}-control_size`,
												value: {
													h: parseFloat(ev.target.value),
													w: controlSize?.w as unknown as number,
												},
											});

											setControlSize({
												w: controlSize?.w as unknown as number,
												h: parseFloat(ev.target.value),
											});

											setFutureHistory([]);
											onSizeInput?.('h');
										}}
										value={controlSize?.h}
									></Input>
								</div>
							</div>

							{/* Rotation */}
							<Label className='text-sm font-semibold text-foreground'>
								Rotation
							</Label>

							{/* In-plane rotation, the one the handle above the block turns */}
							<div className='flex items-center gap-2'>
								<Label className='w-4 text-xs text-muted-foreground'>Z</Label>
								<Input
									type='number'
									className='h-8 text-sm'
									disabled={warped}
									title={
										warped
											? 'The block was warped: reset it to rotate it by degrees'
											: undefined
									}
									onChange={(ev) => {
										const degrees = parseFloat(ev.target.value);
										if (Number.isFinite(degrees)) onRotate?.(degrees);
									}}
									value={rotation}
								></Input>
								<Label className='text-xs text-muted-foreground'>deg</Label>

								{warped && (
									<Button
										size='sm'
										variant='outline'
										className='h-8 text-xs'
										onClick={() => {
											onRotate?.(0);
										}}
									>
										Reset warp
									</Button>
								)}
							</div>

							<div className='flex gap-2 items-center'>
								{/* Rotation X */}
								<div className='flex flex-1 gap-2 items-center'>
									<Label className='text-xs text-muted-foreground w-4'>X</Label>
									<Slider
										className='flex-1'
										min={-180}
										max={180}
										onValueChange={(ev) => {
											setRotateX(ev[0]);
										}}
										value={[rotateX]}
									></Slider>
								</div>

								{/* Rotation Y */}
								<div className='flex flex-1 gap-2 items-center'>
									<Label className='text-xs text-muted-foreground w-4'>Y</Label>
									<Slider
										className='flex-1'
										min={-180}
										max={180}
										onValueChange={(ev) => {
											setRotateY(ev[0]);
										}}
										value={[rotateY]}
									></Slider>
								</div>

								<Button
									size='icon'
									variant='outline'
									onClick={() => {
										setRotateX(0);
										setRotateY(0);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>
						</div>
					</CustomCollapse>

					{/* Shadow Config */}
					{shadowEditable && (
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<Droplets size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Shadow</Label>
								</div>
							}
						>
							<div className='flex flex-col gap-3'>
								{/* Position */}
								<div className='grid grid-cols-2 gap-2'>
									{/* Shadow X */}
									<div className='flex items-center gap-2'>
										<Label className='text-xs text-muted-foreground w-4'>
											X
										</Label>
										<Input
											type={'number'}
											className='h-8 text-sm'
											onChange={(ev) => {
												setShadowX(parseFloat(ev.currentTarget.value));
											}}
											value={shadowX}
										></Input>
									</div>
									{/* Shadow Y */}
									<div className='flex items-center gap-2'>
										<Label className='text-xs text-muted-foreground w-4'>
											Y
										</Label>
										<Input
											type={'number'}
											className='h-8 text-sm'
											onChange={(ev) => {
												setShadowY(parseFloat(ev.currentTarget.value));
											}}
											value={shadowY}
										></Input>
									</div>
								</div>

								{/* Shadow Blur */}
								<div className='flex items-center gap-2'>
									<Label className='text-xs text-muted-foreground w-12'>
										Blur
									</Label>
									<Slider
										className='flex-1'
										onValueChange={(ev) => {
											setShadowBlur(ev[0]);
										}}
										value={[shadowBlur]}
										max={100}
									></Slider>
								</div>

								{/* Shadow Color */}
								<div className='flex flex-col'>
									<ColorPicker
										type='HexAlpha'
										label='Shadow Color'
										color={shadowColor}
										onColorChange={(color) => {
											setShadowColor(color);
										}}
									></ColorPicker>
								</div>
							</div>
						</CustomCollapse>
					)}

					{/* Border  */}
					{borderEditable && (
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<Square size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Border</Label>
								</div>
							}
						>
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-12'>
									Radius
								</Label>
								<Slider
									className='flex-1'
									onValueChange={(ev) => {
										setBorderRadius(ev[0]);
									}}
									value={[borderRadius]}
									max={22}
								></Slider>
							</div>
						</CustomCollapse>
					)}

					{/* Mask */}
					{maskEditable && (
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<Box size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Mask</Label>
								</div>
							}
						>
							<div className='flex'>
								{/* Select Mask */}
								<div className='flex flex-auto p-2 '>
									<Select
										value={mask}
										onValueChange={(e: string) => {
											setMask(e);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder='Mask Shape' />
										</SelectTrigger>
										<SelectContent>
											{Masks.map((i: string) => {
												return (
													<SelectItem key={i} value={i}>
														{/* Shape preview using the same mask classes as the block */}
														<span
															aria-hidden
															className={`size-4 shrink-0 bg-current opacity-70 ${
																i === 'default' ? 'rounded-[3px]' : `mask ${i}`
															}`}
														/>
														{i.replace('mask-', '').replace('-', ' ')}
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
								</div>

								<div className='m-2 flex flex-row gap-2'>
									<p className='my-auto text-xs'>Mask Repeat</p>
									<Checkbox
										onCheckedChange={(checked) => {
											setMaskRepeat(checked as boolean);
										}}
										checked={maskRepeat}
									></Checkbox>
								</div>
							</div>
						</CustomCollapse>
					)}

					{/* Filters */}
					<CustomCollapse
						menu={
							<div className='flex items-center gap-2 text-foreground'>
								<Palette size={18} className='text-muted-foreground' />
								<Label className='text-sm font-semibold'>Filters</Label>
							</div>
						}
					>
						<div className='flex flex-col gap-2'>
							{/* Blur Options */}
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-16'>
									Blur
								</Label>
								<Slider
									className='flex-1'
									min={-1}
									max={100}
									onValueChange={(ev) => {
										setBlur(ev[0]);
									}}
									value={[blur]}
								></Slider>
								<Button
									variant='outline'
									size='icon'
									onMouseDown={() => {
										setBlur(-1 * 1);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>

							{/* Brightness Options */}
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-16'>
									Brightness
								</Label>
								<Slider
									className='flex-1'
									min={1}
									max={200}
									onValueChange={(ev) => {
										setBrightness(ev[0]);
									}}
									value={[brightness]}
								></Slider>
								<Button
									variant='outline'
									size='icon'
									onClick={() => {
										setBrightness(100);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>

							{/* Contrast Options */}
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-16'>
									Contrast
								</Label>
								<Slider
									className='flex-1'
									min={100}
									max={300}
									onValueChange={(ev) => {
										setContrast(ev[0]);
									}}
									value={[contrast]}
								></Slider>
								<Button
									variant='outline'
									size='icon'
									onMouseDown={() => {
										setContrast(100);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>

							{/* Grayscale Options */}
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-16'>
									Grayscale
								</Label>
								<Slider
									className='flex-1'
									min={0}
									max={100}
									onValueChange={(ev) => {
										setGrayscale(ev[0]);
									}}
									value={[grayscale]}
								></Slider>
								<Button
									variant='outline'
									size='icon'
									onMouseDown={() => {
										setGrayscale(0);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>

							{/* Hue Rotate Options */}
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-16'>
									Hue Rotate
								</Label>
								<Slider
									className='flex-1'
									min={0}
									max={359}
									onValueChange={(ev) => {
										setHueRotate(ev[0]);
									}}
									value={[huerotate]}
								></Slider>
								<Button
									variant='outline'
									size='icon'
									onMouseDown={() => {
										setHueRotate(0);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>

							{/* Invert Options */}
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-16'>
									Invert
								</Label>
								<Slider
									className='flex-1'
									min={0}
									max={100}
									onValueChange={(ev) => {
										setInvert(ev[0]);
									}}
									value={[invert]}
								></Slider>
								<Button
									variant='outline'
									size='icon'
									onMouseDown={() => {
										setInvert(0);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>

							{/* Saturate Options */}
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-16'>
									Saturate
								</Label>
								<Slider
									className='flex-1'
									min={0}
									max={200}
									onValueChange={(ev) => {
										setSaturate(ev[0]);
									}}
									value={[saturate]}
								></Slider>
								<Button
									variant='outline'
									size='icon'
									onMouseDown={() => {
										setSaturate(100);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>

							{/* Sepia Options */}
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-16'>
									Sepia
								</Label>
								<Slider
									className='flex-1'
									min={0}
									max={100}
									onValueChange={(ev) => {
										setSepia(ev[0]);
									}}
									value={[sepia]}
								></Slider>
								<Button
									variant='outline'
									size='icon'
									onMouseDown={() => {
										setSepia(0);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>

							{/* Opacity Options */}
							<div className='flex items-center gap-2'>
								<Label className='text-xs text-muted-foreground w-16'>
									Opacity
								</Label>
								<Slider
									className='flex-1'
									min={0}
									max={100}
									onValueChange={(ev) => {
										setOpacity(ev[0]);
									}}
									value={[opacity]}
								></Slider>
								<Button
									variant='outline'
									size='icon'
									onMouseDown={() => {
										setOpacity(100);
									}}
									className='transition-all duration-200 '
								>
									<IconReload size={16} />
								</Button>
							</div>
						</div>
					</CustomCollapse>

					{menu}

					{/* Custom Components Menu */}
					<div id='custom_menu'></div>

					{/* Delete */}
					<Button
						variant='destructive'
						className='w-full transition-all duration-200 '
						onClick={() => {
							setID('');
							onDeleteControl();
						}}
					>
						<Trash2 className='mr-2' size={16}></Trash2>
						Delete Component
					</Button>
				</motion.div>
			</Portal>
		</>
	);
};
