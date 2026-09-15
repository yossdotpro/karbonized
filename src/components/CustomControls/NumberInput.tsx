import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';
import { Input } from '../ui/input';

interface Props {
	number: number;
	onChange?: (number: number) => void;
}

export const NumberInput: React.FC<Props> = ({
	number = 0,
	onChange = () => {},
}) => {
	return (
		<div className='flex flex-auto flex-row items-center'>
			<Input
				type='number'
				className='h-7 flex-auto text-center font-mono tabular-nums'
				onChange={(e) => {
					onChange(parseInt(e.currentTarget.value) || 0);
				}}
				value={number || 0}
			/>

			<div className='ml-1 flex flex-col text-muted-foreground'>
				<div className='flex flex-col'>
					<ChevronUp
						className='size-3.5 hover:text-foreground'
						onMouseDown={() => {
							onChange(number + 1);
						}}
					></ChevronUp>
					<ChevronDown
						className='size-3.5 hover:text-foreground'
						onMouseDown={() => {
							onChange(number - 1);
						}}
					></ChevronDown>
				</div>
			</div>
		</div>
	);
};
