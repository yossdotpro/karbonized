import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';

interface Props {
	number: number;
	onChange?: (number: number) => void;
	suffix?: string;
}

export const NumberInput: React.FC<Props> = ({
	number = 0,
	onChange = () => {},
	suffix,
}) => {
	return (
		<div className='flex h-7 min-w-0 flex-1 items-center rounded-control border border-input pl-2 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 hover:border-ring/60'>
			<input
				type='number'
				className='w-full min-w-0 bg-transparent font-mono text-xs tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
				onChange={(e) => {
					onChange(parseInt(e.currentTarget.value) || 0);
				}}
				value={number || 0}
			/>

			{suffix && (
				<span className='shrink-0 select-none pr-1 text-[11px] text-muted-foreground'>
					{suffix}
				</span>
			)}

			<div className='flex h-full shrink-0 flex-col border-l border-input text-muted-foreground'>
				<button
					type='button'
					aria-label='Increase'
					tabIndex={-1}
					className='flex flex-1 items-center px-1 transition-colors hover:bg-accent hover:text-foreground'
					onMouseDown={(event) => {
						event.preventDefault();
						onChange(number + 1);
					}}
				>
					<ChevronUp className='size-3' />
				</button>
				<button
					type='button'
					aria-label='Decrease'
					tabIndex={-1}
					className='flex flex-1 items-center px-1 transition-colors hover:bg-accent hover:text-foreground'
					onMouseDown={(event) => {
						event.preventDefault();
						onChange(number - 1);
					}}
				>
					<ChevronDown className='size-3' />
				</button>
			</div>
		</div>
	);
};
