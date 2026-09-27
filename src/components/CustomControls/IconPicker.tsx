import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/lib/utils';
import { FaIcon } from '../FaIcon';
import {
	ICON_SETS,
	type IconEntry,
	iconSetOf,
	loadIconSet,
	normalizeIconName,
} from '@/lib/icons/icons';

/** How many icons the grid renders at once; scrolling shows more. */
const PAGE = 240;

/** Dialog to pick an icon from the registered sets. */
export const IconPickerDialog: React.FC<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
	value?: string;
	onPick: (name: string) => void;
}> = ({ open, onOpenChange, value, onPick }) => {
	const [setId, setSetId] = useState(
		() => iconSetOf(value ?? '')?.id ?? ICON_SETS[0].id,
	);
	const [icons, setIcons] = useState<{ id: string; entries: IconEntry[] }>();
	const [query, setQuery] = useState('');
	const [limit, setLimit] = useState(PAGE);
	const set = ICON_SETS.find((item) => item.id === setId) ?? ICON_SETS[0];

	useEffect(() => {
		if (!open || icons?.id === setId) return;
		let cancelled = false;
		void loadIconSet(setId).then((entries) => {
			if (!cancelled) setIcons({ id: setId, entries });
		});
		return () => {
			cancelled = true;
		};
	}, [open, setId, icons?.id]);

	const entries = icons?.id === setId ? icons.entries : [];
	const filtered = useMemo(() => {
		const words = query.toLowerCase().split(/\s+/).filter(Boolean);
		return words.length
			? entries.filter((icon) => {
					const name = icon.name.toLowerCase();
					return words.every((word) => name.includes(word));
				})
			: entries;
	}, [entries, query]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='gap-3 sm:max-w-xl'>
				<DialogHeader>
					<DialogTitle>Choose an icon</DialogTitle>
					<DialogDescription>
						{set.name} ·{' '}
						<a
							className='underline underline-offset-2'
							href={set.url}
							target='_blank'
							rel='noreferrer'
						>
							{set.url.replace(/^https?:\/\//, '')}
						</a>{' '}
						· {set.license}
					</DialogDescription>
				</DialogHeader>

				{ICON_SETS.length > 1 && (
					<div className='flex gap-0.5 rounded-control bg-muted p-0.5'>
						{ICON_SETS.map((item) => (
							<button
								key={item.id}
								type='button'
								onClick={() => {
									setSetId(item.id);
									setLimit(PAGE);
								}}
								className={cn(
									'h-7 flex-1 rounded-[5px] text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
									item.id === setId &&
										'bg-background text-foreground shadow-sm dark:bg-accent',
								)}
							>
								{item.name}
							</button>
						))}
					</div>
				)}

				<div className='relative'>
					<Search className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
					<Input
						autoFocus
						placeholder='Search icons… (rocket, github, heart)'
						value={query}
						onChange={(event) => {
							setQuery(event.currentTarget.value);
							setLimit(PAGE);
						}}
						className='pl-8'
					/>
				</div>

				<div
					className='grid max-h-80 min-h-40 grid-cols-8 content-start gap-1 overflow-y-auto pr-1'
					onScroll={(event) => {
						const element = event.currentTarget;
						if (
							element.scrollTop + element.clientHeight >
							element.scrollHeight - 80
						) {
							setLimit((current) => current + PAGE);
						}
					}}
				>
					{icons?.id !== setId && (
						<p className='col-span-8 py-8 text-center text-xs text-muted-foreground'>
							Loading icons…
						</p>
					)}
					{icons?.id === setId && filtered.length === 0 && (
						<p className='col-span-8 py-8 text-center text-xs text-muted-foreground'>
							No icons match &ldquo;{query}&rdquo;
						</p>
					)}
					{filtered.slice(0, limit).map((icon) => (
						<button
							key={icon.name}
							type='button'
							title={icon.name.slice(set.prefix.length)}
							onClick={() => {
								onPick(icon.name);
								onOpenChange(false);
							}}
							className={cn(
								'flex aspect-square items-center justify-center rounded-control text-xl text-foreground transition-colors hover:bg-accent',
								icon.name === value && 'bg-accent ring-1 ring-ring',
							)}
						>
							{React.createElement(icon.icon)}
						</button>
					))}
				</div>

				<p className='text-[11px] text-muted-foreground'>
					{filtered.length} icons
				</p>
			</DialogContent>
		</Dialog>
	);
};

/** Property-panel field that shows the chosen icon and opens the picker. */
export const IconPickerField: React.FC<{
	value: string;
	onChange: (name: string) => void;
	className?: string;
}> = ({ value, onChange, className }) => {
	const [open, setOpen] = useState(false);
	const name = normalizeIconName(value);

	return (
		<>
			<button
				type='button'
				onClick={() => setOpen(true)}
				className={cn(
					'flex h-7 min-w-0 flex-1 items-center gap-2 rounded-control border border-input px-1.5 text-left transition-colors hover:border-ring/60',
					className,
				)}
			>
				<span className='flex size-4 shrink-0 items-center justify-center text-foreground'>
					<FaIcon icon={name} className='size-3.5' />
				</span>
				<span className='truncate text-xs text-foreground'>
					{name.slice(iconSetOf(name)?.prefix.length ?? 0) || 'Choose…'}
				</span>
			</button>
			<IconPickerDialog
				open={open}
				onOpenChange={setOpen}
				value={name}
				onPick={onChange}
			/>
		</>
	);
};
