import React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/components/lib/utils';
import { Slider } from '@/components/ui/slider';

/**
 * Building blocks for the property panels (right panel → Control).
 * Every row shares the same height, label column and spacing so block
 * menus line up with each other.
 */

/** A labelled row: fixed label column on the left, control on the right. */
export const PropertyRow: React.FC<{
	label: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}> = ({ label, children, className }) => (
	<div className={cn('flex min-h-8 items-center gap-2', className)}>
		<span className='w-[4.5rem] shrink-0 truncate text-xs text-muted-foreground'>
			{label}
		</span>
		<div className='flex min-w-0 flex-1 items-center gap-1.5'>{children}</div>
	</div>
);

/** Numeric field with its label drawn inside, e.g. `X 120`. */
export const FieldInput: React.FC<{
	label: React.ReactNode;
	value: number | string | undefined;
	onChange: (value: string) => void;
	suffix?: string;
	step?: number;
	className?: string;
	title?: string;
	disabled?: boolean;
}> = ({ label, value, onChange, suffix, step, className, title, disabled }) => (
	<label
		title={title}
		className={cn(
			'flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-control border border-input bg-transparent px-2 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 hover:border-ring/60',
			disabled && 'pointer-events-none opacity-50',
			className,
		)}
	>
		<span className='shrink-0 select-none text-[11px] text-muted-foreground'>
			{label}
		</span>
		<input
			type='number'
			step={step}
			disabled={disabled}
			value={
				value === undefined || Number.isNaN(Number(value))
					? ''
					: Math.round(Number(value) * 100) / 100
			}
			onChange={(event) => onChange(event.currentTarget.value)}
			className='w-full min-w-0 bg-transparent text-right font-mono text-xs tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
		/>
		{suffix && (
			<span className='shrink-0 select-none text-[11px] text-muted-foreground'>
				{suffix}
			</span>
		)}
	</label>
);

/** Slider with its current value and an optional reset to the default. */
export const SliderField: React.FC<{
	label: React.ReactNode;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	unit?: string;
	defaultValue?: number;
}> = ({
	label,
	value,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	unit = '',
	defaultValue,
}) => {
	const isDefault = defaultValue === undefined || value === defaultValue;

	return (
		<PropertyRow label={label}>
			<Slider
				className='flex-1'
				min={min}
				max={max}
				step={step}
				value={[value]}
				onValueChange={(next) => onChange(next[0])}
			/>
			<span className='w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground'>
				{Math.round(value)}
				{unit}
			</span>
			{defaultValue !== undefined && (
				<button
					type='button'
					title='Reset'
					aria-label={`Reset ${typeof label === 'string' ? label : ''}`}
					disabled={isDefault}
					onClick={() => onChange(defaultValue)}
					className='flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-0'
				>
					<RotateCcw className='size-3' />
				</button>
			)}
		</PropertyRow>
	);
};

/** Small segmented toggle, used for flags like bold/italic or flip. */
export const ToggleButton: React.FC<{
	active: boolean;
	onClick: () => void;
	label: string;
	children: React.ReactNode;
	className?: string;
}> = ({ active, onClick, label, children, className }) => (
	<button
		type='button'
		title={label}
		aria-label={label}
		aria-pressed={active}
		onClick={onClick}
		className={cn(
			'flex h-7 flex-1 items-center justify-center rounded-[5px] text-xs text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5',
			active && 'bg-background text-foreground shadow-sm dark:bg-accent',
			className,
		)}
	>
		{children}
	</button>
);

export const ToggleGroup: React.FC<{
	children: React.ReactNode;
	className?: string;
}> = ({ children, className }) => (
	<div
		className={cn(
			'flex flex-1 gap-0.5 rounded-control bg-muted p-0.5',
			className,
		)}
	>
		{children}
	</div>
);
