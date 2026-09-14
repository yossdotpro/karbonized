import {
	type Placement,
	flip,
	offset,
	shift,
	useFloating,
} from '@floating-ui/react-dom';
import React, { useState } from 'react';
import { HexAlphaColorPicker, HexColorPicker } from 'react-colorful';
import { Portal } from 'react-portal';
import { Plus } from 'lucide-react';
import { useScreenDirection } from '../../hooks/useScreenDirection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface Props {
	type?: 'HexAlpha' | 'Hex';
	placement?: Placement;
	label?: string;
	color?: string;
	isGradientEnable?: boolean;
	colorGradient1?: string;
	colorGradient2?: string;
	gradientDeg?: number;
	mode?: string;
	showLabel?: boolean;
	onModeChange?: (mode: string) => void;
	onColorChange: (color: string) => void;
	onGradientChange?: (color: string, color2: string) => void;
	onGradientDegChange?: (deg: number) => void;
}

export const ColorPicker: React.FC<Props> = ({
	type = 'Hex',
	label = 'color',
	color = '#5895c8',
	mode = 'Single',
	placement = 'left-end',
	isGradientEnable = true,
	colorGradient1 = '#0da2e7',
	colorGradient2 = '#5895c8',
	gradientDeg = 23,
	showLabel = true,
	onModeChange,
	onColorChange,
	onGradientChange,
	onGradientDegChange,
}) => {
	/* Component Store */
	const [gradientMode, setGradientMode] = useState<'Color1' | 'Color2'>(
		'Color1',
	);
	const [customGradients, setCustomGradients] = useState<
		Array<{ color1: string; color2: string }>
	>(
		localStorage.getItem('custom-gradients')
			? JSON.parse(localStorage.getItem('custom-gradients') as string)
			: [],
	);

	const [showColor, setShowColor] = useState(false);
	const [visible, setVisible] = useState(false);
	const isHorizontal = useScreenDirection();
	const { x, y, reference, floating, strategy } = useFloating({
		middleware: [offset(22), flip(), shift()],
		placement,
	});
	return (
		<>
			<button
				ref={reference}
				onFocus={() => {
					setShowColor(true);
				}}
				onBlur={() => {
					if (isHorizontal) {
						!visible && setShowColor(false);
					}
				}}
				onMouseDown={() => {
					setShowColor(!showColor);
				}}
				className='flex h-fit w-full select-none flex-row items-center rounded-control py-1 transition-colors hover:bg-accent'
			>
				{showLabel && (
					<label className='my-auto ml-2 mr-2 cursor-pointer select-none text-left text-xs text-foreground'>
						{label}
					</label>
				)}

				{mode === 'Single' ? (
					<div
						className={` ${
							showLabel ? 'ml-auto mr-2 flex flex-row gap-2' : 'mx-auto p-1'
						} `}
					>
						{showLabel && (
							<label className='my-auto cursor-pointer font-mono text-xs uppercase text-muted-foreground'>{color}</label>
						)}

						<div
							className='mx-auto my-auto size-5 shrink-0 rounded-[4px] border border-border'
							style={{ backgroundColor: color }}
						></div>
					</div>
				) : (
					<div className='ml-auto mr-2 flex flex-row'>
						<div
							className='my-auto -ml-1 size-5 shrink-0 rounded-[4px] border border-border first:ml-0'
							style={{ backgroundColor: colorGradient1 }}
						></div>

						<div
							className='my-auto -ml-1 size-5 shrink-0 rounded-[4px] border border-border first:ml-0'
							style={{ backgroundColor: colorGradient2 }}
						></div>
					</div>
				)}
			</button>

			{/* Menu */}
			{showColor && isHorizontal && (
				// @ts-ignore
				<Portal>
					<div
						tabIndex={0}
						onMouseEnter={() => {
							setVisible(true);
						}}
						onMouseDown={() => {
							setVisible(true);
						}}
						onMouseLeave={() => {
							setVisible(false);
						}}
						onBlur={() => {
							if (!visible) setShowColor(false);
						}}
						ref={floating}
						style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
						className='z-50 flex w-60 flex-auto select-none flex-col gap-2 rounded-surface border border-border bg-popover p-2.5 text-popover-foreground shadow-xl shadow-black/20'
					>
						{/* Tabs */}
						{isGradientEnable && (
							<div className='mb-2 flex flex-auto select-none flex-row gap-2 text-foreground'>
								<button
									onMouseDown={() => {
										mode = 'Single';
										onModeChange && onModeChange('Single');
										setShowColor(true);
									}}
									className={`flex justify-center items-center hover:bg-accent w-8 grow cursor-pointer rounded-control px-2 py-1 text-xs font-medium capitalize text-muted-foreground transition-colors hover:text-foreground ${
										mode === 'Single' && 'bg-accent text-foreground'
									}`}
								>
									solid
								</button>

								<button
									onClick={() => {
										mode = 'Gradient';
										onModeChange && onModeChange('Gradient');
										setShowColor(true);
									}}
									className={`flex justify-center items-center hover:bg-accent w-8 grow cursor-pointer rounded-control px-2 py-1 text-xs font-medium capitalize text-muted-foreground transition-colors hover:text-foreground ${
										mode === 'Gradient' && 'bg-accent text-foreground'
									}`}
								>
									gradient
								</button>
							</div>
						)}

						{/* Simgle Color */}
						{mode === 'Single' && (
							<>
								{type === 'Hex' ? (
									<HexColorPicker
										color={color}
										onChange={(color) => {
											onColorChange(color);
										}}
										className='mx-auto flex max-h-44 w-36 max-w-xs flex-auto'
									></HexColorPicker>
								) : (
									<HexAlphaColorPicker
										color={color}
										onChange={(color) => {
											onColorChange(color);
										}}
										className='mx-auto flex max-h-44 w-36 max-w-xs flex-auto'
									></HexAlphaColorPicker>
								)}
								{/* Predefined colors */}
								<div className='mx-auto flex flex-auto flex-row gap-x-0.5'>
									<button
										style={{ background: '#dc4040' }}
										onClick={() => {
											onColorChange('#dc4040');
										}}
										className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										style={{ background: '#db8f40' }}
										onClick={() => {
											onColorChange('#db8f40');
										}}
										className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										style={{ background: '#6ebb45' }}
										onClick={() => {
											onColorChange('#6ebb45');
										}}
										className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										style={{ background: '#45ba97' }}
										onClick={() => {
											onColorChange('#45ba97');
										}}
										className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										style={{ background: '#4582ba' }}
										onClick={() => {
											onColorChange('#4582ba');
										}}
										className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										style={{ background: '#5545ba' }}
										onClick={() => {
											onColorChange('#5545ba');
										}}
										className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>
									<button
										style={{ background: '#cc63b5' }}
										onClick={() => {
											onColorChange('#cc63b5');
										}}
										className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>
								</div>

								{/* Input */}
								<div className='mt-2 flex flex-auto flex-row text-foreground'>
									<div
										className='my-auto size-8 shrink-0 rounded-[5px] border border-border'
										style={{ backgroundColor: color }}
									></div>
									<Input
										spellCheck={false}
										onInput={(ev) => {
											onColorChange(ev.currentTarget.value);
										}}
										className='my-auto ml-2 flex w-24 flex-auto'
										value={color}
									></Input>
								</div>
							</>
						)}

						{/* Gradient */}
						{mode === 'Gradient' && (
							<>
								{gradientMode === 'Color1' ? (
									<HexAlphaColorPicker
										color={colorGradient1}
										className='mx-auto flex max-h-44 w-36 max-w-xs flex-auto'
										onChange={(color) => {
											onGradientChange &&
												onGradientChange(color, colorGradient2);
										}}
									></HexAlphaColorPicker>
								) : (
									<HexAlphaColorPicker
										color={colorGradient2}
										className='mx-auto flex max-h-44 w-36 max-w-xs flex-auto'
										onChange={(color) => {
											onGradientChange &&
												onGradientChange(colorGradient1, color);
										}}
									></HexAlphaColorPicker>
								)}

								{/* Predefined Gradients */}
								<div className='mx-auto w-full h-8 flex flex-auto flex-row justify-center gap-0.5'>
									<button
										style={{ background: 'linear-gradient(#bf86da,#144ab4)' }}
										onClick={() =>
											onGradientChange && onGradientChange('#bf86da', '#144ab4')
										}
										className='cursor-pointer aspect-square rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										style={{ background: 'linear-gradient(#00B4DB,#0083B0)' }}
										onClick={() =>
											onGradientChange && onGradientChange('#00B4DB', '#0083B0')
										}
										className='cursor-pointer aspect-square rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										style={{ background: 'linear-gradient(#FF9A9E,#FECFEF)' }}
										onClick={() =>
											onGradientChange && onGradientChange('#FF9A9E', '#FECFEF')
										}
										className='cursor-pointer aspect-square rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										style={{ background: 'linear-gradient(#5adb00,#0083b0)' }}
										onClick={() =>
											onGradientChange && onGradientChange('#5adb00', '#0083b0')
										}
										className='cursor-pointer aspect-square rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										style={{ background: 'linear-gradient(#ed7b6b,#b07f00)' }}
										onClick={() =>
											onGradientChange && onGradientChange('#ed7b6b', '#b07f00')
										}
										className='cursor-pointer aspect-square rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
									></button>

									<button
										onClick={() => {
											const copy = [...customGradients];
											copy.push({
												color1: colorGradient1,
												color2: colorGradient2,
											});
											setCustomGradients(copy);

											localStorage.setItem(
												'custom-gradients',
												JSON.stringify(copy),
											);
										}}
										className='cursor-pointer h-full min-w-8 w-8 p-1 min-h-full rounded-[4px] border border-border hover:border-foreground/50 transition-colors flex items-center justify-center'
									>
										<Plus className='text-muted-foreground size-4'></Plus>
									</button>
								</div>

								{customGradients.length > 0 && (
									<>
										<Separator className='my-2' orientation='horizontal' />

										{/* Custom Gradients */}
										<div className='flex max-h-28 flex-auto flex-row flex-wrap gap-0.5 overflow-y-auto overflow-x-hidden'>
											{customGradients.map(({ color1, color2 }) => (
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<button
																onDoubleClick={() => {
																	let copy = [...customGradients];
																	copy = copy.filter(
																		(colors) =>
																			colors.color1 + colors.color2 !==
																			color1 + color2,
																	);
																	setCustomGradients(copy);

																	localStorage.setItem(
																		'custom-gradients',
																		JSON.stringify(copy),
																	);
																}}
																style={{
																	background: `linear-gradient(${color1},${color2})`,
																}}
																onClick={() =>
																	onGradientChange &&
																	onGradientChange(color1, color2)
																}
																className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
															></button>
														</TooltipTrigger>
														<TooltipContent>
															<p>Double Click To Delete</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											))}
										</div>
									</>
								)}

								{/* Preview Colors */}
								<div className='mx-auto mt-4 flex flex-auto flex-row gap-2 text-foreground'>
									<button
										className={`my-auto flex h-4 flex-auto cursor-pointer rounded-[5px] border border-border p-4 ${
											gradientMode === 'Color1' && 'ring-2 ring-foreground/70'
										}`}
										onMouseDown={() => {
											setGradientMode('Color1');
										}}
										style={{ background: colorGradient1 }}
									></button>

									<Input
										spellCheck={false}
										onInput={(ev) => {
											if (onGradientChange) {
												gradientMode === 'Color1'
													? onGradientChange(
															ev.currentTarget.value,
															colorGradient2,
														)
													: onGradientChange(
															colorGradient1,
															ev.currentTarget.value,
														);
											}
										}}
										className='mx-2 my-auto flex w-24 flex-auto'
										value={
											gradientMode === 'Color1'
												? colorGradient1
												: colorGradient2
										}
									></Input>
									<button
										className={`my-auto flex h-4 flex-auto cursor-pointer rounded-[5px] border border-border p-4 ${
											gradientMode === 'Color2' && 'ring-2 ring-foreground/70'
										}`}
										onMouseDown={() => {
											setGradientMode('Color2');
										}}
										style={{ background: colorGradient2 }}
									></button>
								</div>

								<div className='flex flex-auto flex-row items-center gap-2'>
									<Slider
										min={0}
										max={180}
										onValueChange={(value) =>
											onGradientDegChange && onGradientDegChange(value[0])
										}
										value={[gradientDeg]}
										className='my-auto flex-1'
									></Slider>
									<p className='my-auto font-mono text-xs text-muted-foreground'>deg</p>
								</div>
							</>
						)}
					</div>
				</Portal>
			)}

			{/* Modal */}
			{!isHorizontal && (
				// @ts-ignore
				<Portal>
					<Dialog open={showColor && !isHorizontal} onOpenChange={(open) => setShowColor(open)}>
						<DialogContent className='w-70 overflow-hidden'>
							<DialogHeader>
								<DialogTitle>Color</DialogTitle>
							</DialogHeader>

							<div className='flex flex-auto select-none flex-col gap-2 overflow-auto'>
								{/* Tabs */}
								{isGradientEnable && (
									<div className='mb-2 flex flex-auto select-none flex-row gap-2 text-foreground'>
										<button
											onMouseDown={() => {
												mode = 'Single';
												onModeChange && onModeChange('Single');
												setShowColor(true);
											}}
											className={`hover:bg-accent flex w-8 grow cursor-pointer rounded-control px-2 py-1 text-xs font-medium capitalize text-muted-foreground transition-colors hover:text-foreground ${
												mode === 'Single' && 'bg-accent text-foreground'
											}`}
										>
											solid
										</button>

										<button
											onClick={() => {
												mode = 'Gradient';
												onModeChange && onModeChange('Gradient');
												setShowColor(true);
											}}
											className={`hover:bg-accent flex w-8 grow cursor-pointer rounded-control px-2 py-1 text-xs font-medium capitalize text-muted-foreground transition-colors hover:text-foreground ${
												mode === 'Gradient' && 'bg-accent text-foreground'
											}`}
										>
											gradient
										</button>
									</div>
								)}

							{/* Simgle Color */}
							{mode === 'Single' && (
								<>
									{type === 'Hex' ? (
										<HexColorPicker
											color={color}
											onChange={(color) => {
												onColorChange(color);
											}}
											className='mx-auto flex max-h-44 w-36 max-w-xs flex-auto'
										></HexColorPicker>
									) : (
										<HexAlphaColorPicker
											color={color}
											onChange={(color) => {
												onColorChange(color);
											}}
											className='mx-auto flex max-h-44 w-36 max-w-xs flex-auto'
										></HexAlphaColorPicker>
									)}
									{/* Predefined colors */}
									<div className='mx-auto flex flex-auto flex-row gap-x-0.5'>
										<button
											style={{ background: '#dc4040' }}
											onClick={() => {
												onColorChange('#dc4040');
											}}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: '#db8f40' }}
											onClick={() => {
												onColorChange('#db8f40');
											}}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: '#6ebb45' }}
											onClick={() => {
												onColorChange('#6ebb45');
											}}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: '#45ba97' }}
											onClick={() => {
												onColorChange('#45ba97');
											}}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: '#4582ba' }}
											onClick={() => {
												onColorChange('#4582ba');
											}}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: '#5545ba' }}
											onClick={() => {
												onColorChange('#5545ba');
											}}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: '#cc63b5' }}
											onClick={() => {
												onColorChange('#cc63b5');
											}}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>
									</div>

									{/* Input */}
									<div className='flex flex-auto flex-row text-foreground'>
										<div
											className='my-auto size-8 shrink-0 rounded-[5px] border border-border'
											style={{ backgroundColor: color }}
										></div>
										<Input
											spellCheck={false}
											onInput={(ev) => {
												onColorChange(ev.currentTarget.value);
											}}
											className='my-auto ml-2 flex w-24 flex-auto'
											value={color}
										></Input>
									</div>
								</>
							)}

							{/* Gradient */}
							{mode === 'Gradient' && (
								<>
									{gradientMode === 'Color1' ? (
										<HexAlphaColorPicker
											color={colorGradient1}
											className='mx-auto flex max-h-44 w-36 max-w-xs flex-auto'
											onChange={(color) => {
												onGradientChange &&
													onGradientChange(color, colorGradient2);
											}}
										></HexAlphaColorPicker>
									) : (
										<HexAlphaColorPicker
											color={colorGradient2}
											className='mx-auto flex max-h-44 w-36 max-w-xs flex-auto'
											onChange={(color) => {
												onGradientChange &&
													onGradientChange(colorGradient1, color);
											}}
										></HexAlphaColorPicker>
									)}

									{/* Predefined Gradients */}
									<div className='mx-auto flex flex-auto flex-row gap-0.5'>
										<button
											style={{ background: 'linear-gradient(#bf86da,#144ab4)' }}
											onClick={() =>
												onGradientChange &&
												onGradientChange('#bf86da', '#144ab4')
											}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: 'linear-gradient(#06BEB6,#48B1BF)' }}
											onClick={() =>
												onGradientChange &&
												onGradientChange('#06BEB6', '#48B1BF')
											}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: 'linear-gradient(#00B4DB,#0083B0)' }}
											onClick={() =>
												onGradientChange &&
												onGradientChange('#00B4DB', '#0083B0')
											}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: 'linear-gradient(#FF9A9E,#FECFEF)' }}
											onClick={() =>
												onGradientChange &&
												onGradientChange('#FF9A9E', '#FECFEF')
											}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: 'linear-gradient(#5adb00,#0083b0)' }}
											onClick={() =>
												onGradientChange &&
												onGradientChange('#5adb00', '#0083b0')
											}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: 'linear-gradient(#ed7b6b,#b07f00)' }}
											onClick={() =>
												onGradientChange &&
												onGradientChange('#ed7b6b', '#b07f00')
											}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>

										<button
											style={{ background: 'linear-gradient(#ffe03a,#b94bdd)' }}
											onClick={() =>
												onGradientChange &&
												onGradientChange('#ffe03a', '#b94bdd')
											}
											className='cursor-pointer rounded-[4px] border border-border p-3 hover:border-foreground/50 transition-colors'
										></button>
									</div>

									{/* Preview Colors */}
									<div className='mx-auto mt-2 flex flex-auto flex-row gap-2 text-foreground'>
										<button
											className={`my-auto flex h-4 flex-auto cursor-pointer rounded-[5px] border border-border p-4 ${
												gradientMode === 'Color1' && 'ring-2 ring-foreground/70'
											}`}
											onMouseDown={() => {
												setGradientMode('Color1');
											}}
											style={{ background: colorGradient1 }}
										></button>

										<Input
											spellCheck={false}
											onInput={(ev) => {
												if (onGradientChange) {
													gradientMode === 'Color1'
														? onGradientChange(
																ev.currentTarget.value,
																colorGradient2,
															)
														: onGradientChange(
																colorGradient1,
																ev.currentTarget.value,
															);
												}
											}}
											className='mx-2 my-auto flex w-24 flex-auto'
											value={
												gradientMode === 'Color1'
													? colorGradient1
													: colorGradient2
											}
										></Input>
										<button
											className={`my-auto flex h-4 flex-auto cursor-pointer rounded-[5px] border border-border p-4 ${
												gradientMode === 'Color2' && 'ring-2 ring-foreground/70'
											}`}
											onMouseDown={() => {
												setGradientMode('Color2');
											}}
											style={{ background: colorGradient2 }}
										></button>
									</div>

									<div className='flex flex-auto flex-row items-center gap-2'>
										<Slider
											min={0}
											max={180}
											onValueChange={(value) =>
												onGradientDegChange && onGradientDegChange(value[0])
											}
											value={[gradientDeg]}
											className='my-auto flex-1'
										></Slider>
										<p className='my-auto font-mono text-xs text-muted-foreground'>deg</p>
									</div>
								</>
							)}
							</div>

							<DialogFooter>
								<Button
									onClick={() => {
										setShowColor(false);
									}}
								>
									OK
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</Portal>
			)}
		</>
	);
};

export default ColorPicker;
