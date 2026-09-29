import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { cn } from '@/components/lib/utils';
import { DraftInput } from './DraftInput';

interface Props {
	/** Items that are not strings (numbers written by hand) are edited as text. */
	value: unknown[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	label?: string;
}

const IconButton: React.FC<{
	label: string;
	onClick: () => void;
	disabled?: boolean;
	className?: string;
	children: React.ReactNode;
}> = ({ label, onClick, disabled, className, children }) => (
	<button
		type='button'
		title={label}
		aria-label={label}
		disabled={disabled}
		onClick={onClick}
		className={cn(
			'flex size-6 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5',
			className,
		)}
	>
		{children}
	</button>
);

/**
 * A list of text items, one field per item: edit in place (Enter or leaving
 * the field applies it), reorder, remove, and add at the end.
 */
export const ArrayEditor: React.FC<Props> = ({
	value = [],
	onChange,
	placeholder = 'New item',
	label,
}) => {
	const items = value.map((item) =>
		typeof item === 'string' ? item : JSON.stringify(item),
	);
	const [adding, setAdding] = useState(false);
	// Remounts the new item's field after each add, so it starts empty.
	const [addedCount, setAddedCount] = useState(0);

	const replace = (index: number, text: string) =>
		onChange(items.map((item, current) => (current === index ? text : item)));

	const remove = (index: number) =>
		onChange(items.filter((_, current) => current !== index));

	const move = (index: number, offset: -1 | 1) => {
		const next = [...items];
		const [item] = next.splice(index, 1);
		next.splice(index + offset, 0, item);
		onChange(next);
	};

	return (
		<div className='space-y-1.5'>
			<div className='flex min-h-6 items-center gap-2'>
				{label && (
					<span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>
						{label}
					</span>
				)}
				<span className='ml-auto text-[11px] tabular-nums text-muted-foreground'>
					{items.length} item{items.length === 1 ? '' : 's'}
				</span>
			</div>

			{items.length > 0 && (
				<ol className='space-y-1'>
					{items.map((item, index) => (
						<li key={index} className='group flex items-center gap-1'>
							<span className='w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground'>
								{index + 1}
							</span>
							<DraftInput
								aria-label={`${label ?? 'Item'} ${index + 1}`}
								value={item}
								onCommit={(text) => replace(index, text)}
							/>
							<div className='flex shrink-0 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'>
								<IconButton
									label='Move up'
									disabled={index === 0}
									onClick={() => move(index, -1)}
								>
									<ChevronUp />
								</IconButton>
								<IconButton
									label='Move down'
									disabled={index === items.length - 1}
									onClick={() => move(index, 1)}
								>
									<ChevronDown />
								</IconButton>
								<IconButton
									label='Remove'
									onClick={() => remove(index)}
									className='hover:bg-destructive/15 hover:text-destructive'
								>
									<X />
								</IconButton>
							</div>
						</li>
					))}
				</ol>
			)}

			{adding ? (
				<div className='flex items-center gap-1 pl-5'>
					<DraftInput
						key={addedCount}
						autoFocus
						aria-label={`New ${label ?? 'item'}`}
						placeholder={placeholder}
						value=''
						onCommit={(text) => {
							if (text.trim() === '') return;
							onChange([...items, text]);
							setAddedCount((count) => count + 1);
						}}
						onBlur={() => setAdding(false)}
					/>
				</div>
			) : (
				<button
					type='button'
					onClick={() => setAdding(true)}
					className='flex h-7 w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-ring/60 hover:text-foreground'
				>
					<Plus className='size-3.5' />
					Add item
				</button>
			)}
		</div>
	);
};
