import React, { useEffect, useRef, useState } from 'react';
import { HexAlphaColorPicker, HexColorPicker } from 'react-colorful';
import { Pipette, Plus, X } from 'lucide-react';
import { useScreenDirection } from '../../hooks/useScreenDirection';
import { cn } from '@/components/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

/** Floating UI style placements, kept for backwards compatibility. */
type Placement =
	| 'top'
	| 'right'
	| 'bottom'
	| 'left'
	| `${'top' | 'right' | 'bottom' | 'left'}-${'start' | 'end'}`;

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

const SWATCHES = [
	'#000000',
	'#3f3f46',
	'#a1a1aa',
	'#ffffff',
	'#dc4040',
	'#db8f40',
	'#e5c33b',
	'#6ebb45',
	'#45ba97',
	'#3fb4d8',
	'#4582ba',
	'#5545ba',
	'#8b4fd6',
	'#cc63b5',
	'#e5484d',
	'#f97583',
];

const GRADIENT_PRESETS: Array<[string, string]> = [
	['#bf86da', '#144ab4'],
	['#00B4DB', '#0083B0'],
	['#06BEB6', '#48B1BF'],
	['#FF9A9E', '#FECFEF'],
	['#5adb00', '#0083b0'],
	['#ed7b6b', '#b07f00'],
	['#ffe03a', '#b94bdd'],
	['#f857a6', '#ff5858'],
];

const RECENT_KEY = 'karbonized:recent-colors';
const GRADIENTS_KEY = 'custom-gradients';
const MAX_RECENT = 8;

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Transparent-checkerboard background, so colors with alpha read correctly. */
const CHECKERBOARD =
	'repeating-conic-gradient(#a1a1aa33 0% 25%, transparent 0% 50%) 50% / 8px 8px';

const readJSON = <T,>(key: string, fallback: T): T => {
	try {
		const value = localStorage.getItem(key);
		return value ? (JSON.parse(value) as T) : fallback;
	} catch {
		return fallback;
	}
};

const writeJSON = (key: string, value: unknown) => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* storage unavailable */
	}
};

const toPopoverPosition = (
	placement: Placement,
): {
	side: 'top' | 'right' | 'bottom' | 'left';
	align: 'start' | 'center' | 'end';
} => {
	const [side, align] = placement.split('-') as [
		'top' | 'right' | 'bottom' | 'left',
		'start' | 'end' | undefined,
	];
	return { side, align: align ?? 'center' };
};

/** Small color chip with a checkerboard behind it. */
const Chip: React.FC<{ background: string; className?: string }> = ({
	background,
	className,
}) => (
	<span
		className={cn(
			'relative block size-5 shrink-0 overflow-hidden rounded-[5px] ring-1 ring-inset ring-black/10 dark:ring-white/15',
			className,
		)}
		style={{ background: CHECKERBOARD }}
	>
		<span className='absolute inset-0' style={{ background }} />
	</span>
);

/** Hex text field that only commits valid colors. */
const HexInput: React.FC<{
	value: string;
	onChange: (color: string) => void;
	className?: string;
}> = ({ value, onChange, className }) => {
	const [draft, setDraft] = useState(value);
	const [focused, setFocused] = useState(false);

	useEffect(() => {
		if (!focused) setDraft(value);
	}, [value, focused]);

	const invalid = !HEX_PATTERN.test(draft.trim());

	return (
		<div className={cn('relative flex-1', className)}>
			<span className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground'>
				#
			</span>
			<Input
				spellCheck={false}
				aria-label='Hex color'
				aria-invalid={invalid || undefined}
				value={draft.replace(/^#/, '')}
				onFocus={(event) => {
					setFocused(true);
					event.currentTarget.select();
				}}
				onBlur={() => {
					setFocused(false);
					setDraft(value);
				}}
				onChange={(event) => {
					const next = event.currentTarget.value.trim();
					setDraft(next);
					if (HEX_PATTERN.test(next)) {
						onChange(('#' + next.replace(/^#/, '')).toLowerCase());
					}
				}}
				className='h-7 pl-5 font-mono text-xs uppercase md:text-xs'
			/>
		</div>
	);
};

const EyeDropperButton: React.FC<{ onPick: (color: string) => void }> = ({
	onPick,
}) => {
	if (typeof window === 'undefined' || !('EyeDropper' in window)) return null;

	return (
		<Button
			type='button'
			variant='outline'
			size='icon'
			aria-label='Pick a color from the screen'
			title='Pick from screen'
			className='size-7 shrink-0'
			onClick={async () => {
				try {
					const result = await new (window as any).EyeDropper().open();
					if (result?.sRGBHex) onPick(result.sRGBHex);
				} catch {
					/* cancelled */
				}
			}}
		>
			<Pipette className='size-3.5' />
		</Button>
	);
};

const SectionLabel: React.FC<{
	children: React.ReactNode;
	action?: React.ReactNode;
}> = ({ children, action }) => (
	<div className='flex h-5 items-center justify-between'>
		<span className='text-[11px] font-medium text-muted-foreground'>
			{children}
		</span>
		{action}
	</div>
);

const SwatchButton: React.FC<{
	background: string;
	title: string;
	active?: boolean;
	onClick: () => void;
	onRemove?: () => void;
}> = ({ background, title, active, onClick, onRemove }) => (
	<button
		type='button'
		title={onRemove ? `${title} — right-click to remove` : title}
		onClick={onClick}
		onContextMenu={(event) => {
			if (!onRemove) return;
			event.preventDefault();
			onRemove();
		}}
		className={cn(
			'group relative aspect-square w-full overflow-hidden rounded-[5px] ring-1 ring-inset ring-black/10 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring dark:ring-white/15',
			active && 'ring-2 ring-foreground dark:ring-foreground',
		)}
		style={{ background: CHECKERBOARD }}
	>
		<span className='absolute inset-0' style={{ background }} />
	</button>
);

interface BodyProps extends Props {
	activeMode: string;
	setActiveMode: (mode: string) => void;
}

const PickerBody: React.FC<BodyProps> = ({
	type = 'Hex',
	color = '#5895c8',
	isGradientEnable = true,
	colorGradient1 = '#0da2e7',
	colorGradient2 = '#5895c8',
	gradientDeg = 23,
	activeMode,
	setActiveMode,
	onColorChange,
	onGradientChange,
	onGradientDegChange,
}) => {
	const [stop, setStop] = useState<0 | 1>(0);
	const [recent] = useState<string[]>(() => readJSON(RECENT_KEY, []));
	const [customGradients, setCustomGradients] = useState<
		Array<{ color1: string; color2: string }>
	>(() => readJSON(GRADIENTS_KEY, []));

	const Picker = type === 'HexAlpha' ? HexAlphaColorPicker : HexColorPicker;
	const isGradient = isGradientEnable && activeMode === 'Gradient';
	const stopColor = stop === 0 ? colorGradient1 : colorGradient2;

	const setStopColor = (next: string) => {
		if (!onGradientChange) return;
		if (stop === 0) onGradientChange(next, colorGradient2);
		else onGradientChange(colorGradient1, next);
	};

	const saveCustomGradients = (
		next: Array<{ color1: string; color2: string }>,
	) => {
		setCustomGradients(next);
		writeJSON(GRADIENTS_KEY, next);
	};

	return (
		<div className='flex flex-col gap-3'>
			{/* Mode */}
			{isGradientEnable && (
				<div className='grid grid-cols-2 gap-0.5 rounded-control bg-muted p-0.5'>
					{['Single', 'Gradient'].map((item) => (
						<button
							key={item}
							type='button'
							onClick={() => setActiveMode(item)}
							className={cn(
								'h-6 rounded-[5px] text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
								activeMode === item &&
									'bg-background text-foreground shadow-sm dark:bg-accent',
							)}
						>
							{item === 'Single' ? 'Solid' : 'Gradient'}
						</button>
					))}
				</div>
			)}

			{/* Gradient preview and stops */}
			{isGradient && (
				<div className='flex flex-col gap-2'>
					<div
						className='h-10 w-full rounded-control ring-1 ring-inset ring-black/10 dark:ring-white/15'
						style={{
							background: `linear-gradient(${gradientDeg}deg, ${colorGradient1}, ${colorGradient2})`,
						}}
					/>
					<div className='grid grid-cols-2 gap-1.5'>
						{([0, 1] as const).map((index) => {
							const value = index === 0 ? colorGradient1 : colorGradient2;
							return (
								<button
									key={index}
									type='button'
									onClick={() => setStop(index)}
									className={cn(
										'flex h-7 items-center gap-2 rounded-control border border-input px-1.5 text-left transition-colors hover:bg-accent',
										stop === index && 'border-ring bg-accent',
									)}
								>
									<Chip background={value} className='size-4' />
									<span className='truncate font-mono text-[11px] uppercase text-foreground'>
										{value}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Picker */}
			<Picker
				color={isGradient ? stopColor : color}
				onChange={(next) =>
					isGradient ? setStopColor(next) : onColorChange(next)
				}
				className='kz-color-picker'
			/>

			{/* Hex */}
			<div className='flex items-center gap-1.5'>
				<EyeDropperButton
					onPick={(next) =>
						isGradient ? setStopColor(next) : onColorChange(next)
					}
				/>
				<HexInput
					value={isGradient ? stopColor : color}
					onChange={(next) =>
						isGradient ? setStopColor(next) : onColorChange(next)
					}
				/>
			</div>

			{/* Angle */}
			{isGradient && (
				<div className='flex items-center gap-2'>
					<span className='w-9 text-[11px] font-medium text-muted-foreground'>
						Angle
					</span>
					<Slider
						min={0}
						max={360}
						value={[gradientDeg]}
						onValueChange={(value) => onGradientDegChange?.(value[0])}
						className='flex-1'
					/>
					<span className='w-9 text-right font-mono text-[11px] tabular-nums text-muted-foreground'>
						{Math.round(gradientDeg)}°
					</span>
				</div>
			)}

			{/* Swatches */}
			{!isGradient ? (
				<>
					<div className='flex flex-col gap-1.5'>
						<SectionLabel>Palette</SectionLabel>
						<div className='grid grid-cols-8 gap-1.5'>
							{SWATCHES.map((swatch) => (
								<SwatchButton
									key={swatch}
									title={swatch}
									background={swatch}
									active={swatch === color?.toLowerCase()}
									onClick={() => onColorChange(swatch)}
								/>
							))}
						</div>
					</div>

					{recent.length > 0 && (
						<div className='flex flex-col gap-1.5'>
							<SectionLabel>Recent</SectionLabel>
							<div className='grid grid-cols-8 gap-1.5'>
								{recent.map((swatch) => (
									<SwatchButton
										key={swatch}
										title={swatch}
										background={swatch}
										active={swatch === color?.toLowerCase()}
										onClick={() => onColorChange(swatch)}
									/>
								))}
							</div>
						</div>
					)}
				</>
			) : (
				<div className='flex flex-col gap-1.5'>
					<SectionLabel
						action={
							<button
								type='button'
								title='Save this gradient'
								onClick={() =>
									saveCustomGradients([
										...customGradients.filter(
											(item) =>
												item.color1 + item.color2 !==
												colorGradient1 + colorGradient2,
										),
										{ color1: colorGradient1, color2: colorGradient2 },
									])
								}
								className='flex items-center gap-1 rounded-[4px] px-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
							>
								<Plus className='size-3' />
								Save
							</button>
						}
					>
						Presets
					</SectionLabel>
					<div className='grid grid-cols-8 gap-1.5'>
						{GRADIENT_PRESETS.map(([color1, color2]) => (
							<SwatchButton
								key={color1 + color2}
								title={`${color1} → ${color2}`}
								background={`linear-gradient(135deg, ${color1}, ${color2})`}
								onClick={() => onGradientChange?.(color1, color2)}
							/>
						))}
						{customGradients.map(({ color1, color2 }) => (
							<SwatchButton
								key={'custom' + color1 + color2}
								title={`${color1} → ${color2}`}
								background={`linear-gradient(135deg, ${color1}, ${color2})`}
								onClick={() => onGradientChange?.(color1, color2)}
								onRemove={() =>
									saveCustomGradients(
										customGradients.filter(
											(item) => item.color1 + item.color2 !== color1 + color2,
										),
									)
								}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

const rememberColor = (color: string) => {
	if (!HEX_PATTERN.test(color)) return;
	const normalized = color.toLowerCase();
	const recent = readJSON<string[]>(RECENT_KEY, []).filter(
		(item) => item !== normalized,
	);
	writeJSON(RECENT_KEY, [normalized, ...recent].slice(0, MAX_RECENT));
};

export const ColorPicker: React.FC<Props> = (props) => {
	const {
		label = 'color',
		color = '#5895c8',
		mode = 'Single',
		placement = 'left-start',
		colorGradient1 = '#0da2e7',
		colorGradient2 = '#5895c8',
		gradientDeg = 23,
		showLabel = true,
		isGradientEnable = true,
		onModeChange,
	} = props;

	const isHorizontal = useScreenDirection();
	const [open, setOpen] = useState(false);
	const [activeMode, setActiveModeState] = useState(mode);
	const colorOnOpen = useRef(color);

	useEffect(() => {
		setActiveModeState(mode);
	}, [mode]);

	const setActiveMode = (next: string) => {
		setActiveModeState(next);
		onModeChange?.(next);
	};

	const handleOpenChange = (next: boolean) => {
		if (next) {
			colorOnOpen.current = color;
		} else if (activeMode !== 'Gradient' && color !== colorOnOpen.current) {
			rememberColor(color);
		}
		setOpen(next);
	};

	const isGradient = isGradientEnable && activeMode === 'Gradient';
	const preview = isGradient
		? `linear-gradient(${gradientDeg}deg, ${colorGradient1}, ${colorGradient2})`
		: color;

	const triggerButton = (
		<button
			type='button'
			aria-label={label || 'Color'}
			onClick={isHorizontal ? undefined : () => handleOpenChange(true)}
			className={cn(
				'group flex h-7 select-none items-center gap-2 rounded-control border border-input text-left transition-colors hover:border-ring/60 focus-visible:outline-2 focus-visible:outline-ring data-[state=open]:border-ring',
				showLabel ? 'min-w-0 flex-1 px-1.5' : 'size-7 justify-center',
			)}
		>
			<Chip background={preview} className='size-4 rounded-[4px]' />
			{showLabel && (
				<span className='truncate font-mono text-[11px] uppercase text-foreground'>
					{isGradient ? `${colorGradient1} → ${colorGradient2}` : color}
				</span>
			)}
		</button>
	);

	/* Same layout as `PropertyRow`, so pickers line up with other fields. */
	const withLabel = (node: React.ReactNode) =>
		showLabel && !label ? (
			<div className='flex w-full'>{node}</div>
		) : showLabel ? (
			<div className='flex min-h-8 w-full items-center gap-2'>
				<span className='w-20 shrink-0 truncate text-xs capitalize text-muted-foreground'>
					{label}
				</span>
				{node}
			</div>
		) : (
			node
		);

	if (!isHorizontal) {
		return (
			<>
				{withLabel(triggerButton)}
				<Dialog open={open} onOpenChange={handleOpenChange}>
					<DialogContent className='w-72'>
						<DialogHeader>
							<DialogTitle className='capitalize'>
								{label || 'Color'}
							</DialogTitle>
						</DialogHeader>
						<PickerBody
							{...props}
							activeMode={activeMode}
							setActiveMode={setActiveMode}
						/>
						<DialogFooter>
							<Button onClick={() => handleOpenChange(false)}>Done</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>
		);
	}

	const { side, align } = toPopoverPosition(placement);

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			{withLabel(<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>)}
			<PopoverContent
				side={side}
				align={align}
				sideOffset={10}
				className='w-60'
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<div className='mb-3 flex items-center justify-between'>
					<span className='text-xs font-medium capitalize text-foreground'>
						{label || 'Color'}
					</span>
					<button
						type='button'
						aria-label='Close'
						onClick={() => handleOpenChange(false)}
						className='flex size-5 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
					>
						<X className='size-3.5' />
					</button>
				</div>
				<PickerBody
					{...props}
					activeMode={activeMode}
					setActiveMode={setActiveMode}
				/>
			</PopoverContent>
		</Popover>
	);
};

export default ColorPicker;
