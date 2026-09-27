import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ImportedComponent } from '@/models/KComponent';
import { sizedSvg } from '@/lib/icons/icons';

/** Renders a stored (sanitized) pack icon. */
export const PackIconView: React.FC<{ svg: string; className?: string }> = ({
	svg,
	className,
}) => (
	<span
		className={className}
		style={{ display: 'inline-flex' }}
		dangerouslySetInnerHTML={{ __html: sizedSvg(svg) }}
	/>
);

/** First icons of a pack, for its card in the library. */
export const PackPreview: React.FC<{ pack: ImportedComponent }> = ({
	pack,
}) => {
	const icons = Object.values(pack.component.icons ?? {}).slice(0, 12);

	return (
		<div className='grid grid-cols-6 gap-2 p-3 text-foreground'>
			{icons.map((svg, index) => (
				<PackIconView key={index} svg={svg} className='size-5' />
			))}
		</div>
	);
};

/** Every icon of a pack, searchable; picking one adds it to the canvas. */
export const IconPackBrowser: React.FC<{
	pack: ImportedComponent;
	onBack: () => void;
	onPick: (name: string) => void;
}> = ({ pack, onBack, onPick }) => {
	const [query, setQuery] = useState('');
	const { manifest, icons = {} } = pack.component;

	const filtered = useMemo(() => {
		const words = query
			.toLowerCase()
			.split(/[\s-]+/)
			.filter(Boolean);
		return Object.entries(icons).filter(([name]) =>
			words.every((word) => name.includes(word)),
		);
	}, [icons, query]);

	return (
		<div className='flex h-full min-h-0 flex-col'>
			<div className='flex items-center gap-2 border-b border-border px-3 py-2.5'>
				<Button
					size='icon-sm'
					variant='ghost'
					aria-label='Back to the library'
					onClick={onBack}
				>
					<ArrowLeft className='size-4' />
				</Button>
				<div className='min-w-0'>
					<p className='truncate text-[13px] font-medium text-foreground'>
						{manifest.name}
					</p>
					<p className='truncate text-xs text-muted-foreground'>
						{Object.keys(icons).length} icons · names like{' '}
						<code>{manifest.prefix}:name</code>
						{manifest.license && ` · ${manifest.license}`}
						{manifest.author && ` · by ${manifest.author}`}
					</p>
				</div>
				<div className='relative ml-auto w-48 shrink-0'>
					<Search className='pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
					<Input
						autoFocus
						placeholder='Search icons…'
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						className='h-7 pl-7 text-xs md:text-xs'
					/>
				</div>
			</div>

			<ScrollArea className='min-h-0 flex-1'>
				{filtered.length === 0 ? (
					<p className='px-6 py-16 text-center text-xs text-muted-foreground'>
						No icons match &ldquo;{query}&rdquo;
					</p>
				) : (
					<ul className='grid grid-cols-6 gap-1 p-3 sm:grid-cols-8'>
						{filtered.map(([name, svg]) => (
							<li key={name}>
								<button
									type='button'
									title={`Add ${name} to the canvas`}
									onClick={() => onPick(`${manifest.prefix}:${name}`)}
									className='flex w-full flex-col items-center gap-1.5 rounded-control px-1 py-2.5 text-foreground transition-colors hover:bg-accent'
								>
									<PackIconView svg={svg} className='size-6' />
									<span className='w-full truncate text-center text-[10px] text-muted-foreground'>
										{name}
									</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</ScrollArea>
		</div>
	);
};
