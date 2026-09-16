import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useKComponentStore } from '@/stores/kcomponent-store';
import {
	ImportedComponent,
	KComponent,
	UNCATEGORIZED,
	getComponentCategory,
} from '@/models/KComponent';
import {
	ArrowDownWideNarrow,
	Download,
	PackageOpen,
	Plus,
	Puzzle,
	Search,
	Sparkles,
	Star,
	Trash2,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { downloadKComponent } from '@/utils/kcomponentFile';
import { STARTER_PACK_SIZE, loadStarterPack } from '@/utils/starterPack';
import { cn } from '@/components/lib/utils';
import { Tooltip } from '../CustomControls/Tooltip';

interface ComponentsGalleryProps {
	onAddToCanvas: (component: KComponent, importedId?: string) => void;
}

type SortMode = 'recent' | 'name' | 'used';

const SORT_LABELS: Record<SortMode, string> = {
	recent: 'Recently imported',
	name: 'Name',
	used: 'Most used',
};

const FAVORITES = '__favorites__';

const matchesQuery = (item: ImportedComponent, query: string): boolean => {
	const { name, author, description, category, tags } = item.component.manifest;

	return [name, author, description, category, ...(tags ?? [])]
		.filter((value): value is string => Boolean(value))
		.some((value) => value.toLowerCase().includes(query));
};

export const ComponentsGallery: React.FC<ComponentsGalleryProps> = ({
	onAddToCanvas,
}) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [filter, setFilter] = useState<string>('');
	const [sort, setSort] = useState<SortMode>('recent');
	const [pendingDelete, setPendingDelete] = useState<string | null>(null);
	const [isLoadingPack, setIsLoadingPack] = useState(false);

	const importedComponents = useKComponentStore(
		(state) => state.importedComponents,
	);
	const removeImportedComponent = useKComponentStore(
		(state) => state.removeImportedComponent,
	);
	const toggleFavorite = useKComponentStore((state) => state.toggleFavorite);
	const importComponents = useKComponentStore(
		(state) => state.importComponents,
	);

	const categories = useMemo(
		() =>
			Array.from(
				new Set(
					importedComponents.map((item) =>
						getComponentCategory(item.component),
					),
				),
			).sort((a, b) =>
				a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b),
			),
		[importedComponents],
	);

	const hasFavorites = importedComponents.some((item) => item.favorite);

	const filteredComponents = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		const result = importedComponents.filter((item) => {
			if (filter === FAVORITES && !item.favorite) return false;
			if (filter && filter !== FAVORITES)
				return (
					getComponentCategory(item.component) === filter &&
					(!query || matchesQuery(item, query))
				);

			return !query || matchesQuery(item, query);
		});

		return result.sort((a, b) => {
			if (sort === 'name')
				return a.component.manifest.name.localeCompare(
					b.component.manifest.name,
				);
			if (sort === 'used') return b.usageCount - a.usageCount;
			return (b.updatedAt ?? b.importedAt).localeCompare(
				a.updatedAt ?? a.importedAt,
			);
		});
	}, [importedComponents, searchQuery, filter, sort]);

	const handleLoadStarterPack = async () => {
		setIsLoadingPack(true);
		try {
			importComponents(await loadStarterPack(), { replace: true });
		} finally {
			setIsLoadingPack(false);
		}
	};

	const handleDelete = (id: string) => {
		if (pendingDelete !== id) {
			setPendingDelete(id);
			return;
		}

		removeImportedComponent(id);
		setPendingDelete(null);
	};

	return (
		<div className='flex h-full min-h-0 flex-col'>
			{/* Search and sort */}
			<div className='flex items-center gap-2 border-b border-border px-5 py-2.5'>
				<div className='relative min-w-0 flex-1'>
					<Search className='pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder='Search components…'
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						className='pl-7'
					/>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' size='sm' className='shrink-0'>
							<ArrowDownWideNarrow className='size-3.5' />
							{SORT_LABELS[sort]}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end'>
						{(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
							<DropdownMenuItem key={mode} onClick={() => setSort(mode)}>
								{SORT_LABELS[mode]}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Category filters */}
			{(categories.length > 1 || hasFavorites) && (
				<div className='flex gap-1 overflow-x-auto border-b border-border px-5 py-2'>
					<Button
						size='xs'
						variant={filter === '' ? 'secondary' : 'ghost'}
						onClick={() => setFilter('')}
					>
						All
					</Button>
					{hasFavorites && (
						<Button
							size='xs'
							variant={filter === FAVORITES ? 'secondary' : 'ghost'}
							onClick={() => setFilter(FAVORITES)}
						>
							<Star className='size-3' />
							Favorites
						</Button>
					)}
					{categories.map((category) => (
						<Button
							key={category}
							size='xs'
							variant={filter === category ? 'secondary' : 'ghost'}
							onClick={() => setFilter(category)}
							className='shrink-0'
						>
							{category}
						</Button>
					))}
				</div>
			)}

			{/* Components */}
			<ScrollArea className='min-h-0 flex-1'>
				{filteredComponents.length === 0 ? (
					<div className='flex flex-col items-center justify-center gap-1 px-6 py-16 text-center'>
						<PackageOpen className='mb-2 size-6 text-muted-foreground' />
						<p className='text-[13px] text-foreground'>
							{importedComponents.length
								? 'No components found'
								: 'No components yet'}
						</p>
						<p className='text-xs text-muted-foreground'>
							{importedComponents.length
								? 'Try a different name, tag or category.'
								: 'Import .kcomponent files from File → Import components.'}
						</p>
						{!importedComponents.length && (
							<Button
								size='sm'
								variant='outline'
								className='mt-3'
								disabled={isLoadingPack}
								onClick={handleLoadStarterPack}
							>
								<Sparkles className='size-3.5' />
								{isLoadingPack
									? 'Loading…'
									: `Load starter pack (${STARTER_PACK_SIZE})`}
							</Button>
						)}
					</div>
				) : (
					<ul className='grid grid-cols-1 gap-2 p-3 sm:grid-cols-2'>
						{filteredComponents.map((imported) => {
							const { manifest } = imported.component;
							const isPendingDelete = pendingDelete === imported.id;

							return (
								<li
									key={imported.id}
									className='group relative flex flex-col overflow-hidden rounded-surface border border-border bg-card'
								>
									{/* Preview */}
									<button
										type='button'
										onClick={() =>
											onAddToCanvas(imported.component, imported.id)
										}
										title={`Add ${manifest.name} to the canvas`}
										className='flex aspect-[16/9] w-full items-center justify-center overflow-hidden border-b border-border bg-muted/40 transition-colors hover:bg-accent/60'
									>
										{manifest.thumbnail ? (
											<img
												src={manifest.thumbnail}
												alt=''
												loading='lazy'
												className='size-full object-cover'
											/>
										) : (
											<Puzzle className='size-5 text-muted-foreground' />
										)}
									</button>

									{/* Meta */}
									<div className='flex min-w-0 flex-col gap-1 px-3 py-2'>
										<div className='flex items-center gap-1.5'>
											<p className='truncate text-[13px] font-medium text-foreground'>
												{manifest.name}
											</p>
											{manifest.version && (
												<span className='shrink-0 text-xs text-muted-foreground'>
													v{manifest.version.replace(/^v/i, '')}
												</span>
											)}
										</div>

										{(manifest.author || manifest.description) && (
											<p className='line-clamp-2 text-xs text-muted-foreground'>
												{manifest.author && <>by {manifest.author}</>}
												{manifest.author && manifest.description && ' · '}
												{manifest.description}
											</p>
										)}

										{manifest.tags && manifest.tags.length > 0 && (
											<div className='flex flex-wrap gap-1'>
												{manifest.tags.slice(0, 3).map((tag) => (
													<Badge key={tag} variant='outline'>
														{tag}
													</Badge>
												))}
												{manifest.tags.length > 3 && (
													<Badge variant='outline'>
														+{manifest.tags.length - 3}
													</Badge>
												)}
											</div>
										)}

										<div className='mt-1 flex items-center gap-1'>
											<Button
												size='xs'
												variant='outline'
												onClick={() =>
													onAddToCanvas(imported.component, imported.id)
												}
											>
												<Plus className='size-3' />
												Add
											</Button>

											<div className='ml-auto flex items-center gap-0.5'>
												<Tooltip
													message={
														imported.favorite
															? 'Remove from favorites'
															: 'Add to favorites'
													}
												>
													<Button
														size='icon-xs'
														variant='ghost'
														aria-label='Toggle favorite'
														aria-pressed={imported.favorite}
														onClick={() => toggleFavorite(imported.id)}
													>
														<Star
															className={cn(
																'size-3',
																imported.favorite &&
																	'fill-amber-400 text-amber-400',
															)}
														/>
													</Button>
												</Tooltip>

												<Tooltip message='Export .kcomponent'>
													<Button
														size='icon-xs'
														variant='ghost'
														aria-label={`Export ${manifest.name}`}
														onClick={() =>
															downloadKComponent(imported.component)
														}
													>
														<Download className='size-3' />
													</Button>
												</Tooltip>

												<Tooltip
													message={
														isPendingDelete ? 'Click again to delete' : 'Delete'
													}
												>
													<Button
														size='icon-xs'
														variant={isPendingDelete ? 'destructive' : 'ghost'}
														aria-label={`Remove ${manifest.name}`}
														onClick={() => handleDelete(imported.id)}
														onBlur={() => setPendingDelete(null)}
													>
														<Trash2 className='size-3' />
													</Button>
												</Tooltip>
											</div>
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</ScrollArea>
		</div>
	);
};

export default ComponentsGallery;
