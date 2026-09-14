import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useKComponentStore } from '@/stores/kcomponent-store';
import { KComponent } from '@/models/KComponent';
import { PackageOpen, Plus, Search, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ComponentsGalleryProps {
	onAddToCanvas: (component: KComponent) => void;
}

export const ComponentsGallery: React.FC<ComponentsGalleryProps> = ({
	onAddToCanvas,
}) => {
	const [searchQuery, setSearchQuery] = useState('');
	const { importedComponents, removeImportedComponent } = useKComponentStore();

	const filteredComponents = useMemo(() => {
		if (!searchQuery.trim()) return importedComponents;

		const query = searchQuery.toLowerCase();
		return importedComponents.filter((item) => {
			const { name, author, description, category, tags } =
				item.component.manifest;
			return (
				name.toLowerCase().includes(query) ||
				author?.toLowerCase().includes(query) ||
				description?.toLowerCase().includes(query) ||
				category?.toLowerCase().includes(query) ||
				tags?.some((tag) => tag.toLowerCase().includes(query))
			);
		});
	}, [importedComponents, searchQuery]);

	const handleDelete = (id: string) => {
		removeImportedComponent(id);
	};

	return (
		<div className='flex h-full min-h-0 flex-col'>
			{/* Search */}
			<div className='relative border-b border-border px-5 py-2.5'>
				<Search className='pointer-events-none absolute left-7 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
				<Input
					placeholder='Search components…'
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className='pl-7'
				/>
			</div>

			{/* Components */}
			<ScrollArea className='min-h-0 flex-1'>
				{filteredComponents.length === 0 ? (
					<div className='flex flex-col items-center justify-center gap-1 px-6 py-16 text-center'>
						<PackageOpen className='mb-2 size-6 text-muted-foreground' />
						<p className='text-[13px] text-foreground'>
							{searchQuery ? 'No components found' : 'No components yet'}
						</p>
						<p className='text-xs text-muted-foreground'>
							{searchQuery
								? 'Try a different name, tag or category.'
								: 'Import .kcomponent files from File → Import components.'}
						</p>
					</div>
				) : (
					<ul className='flex flex-col p-2'>
						{filteredComponents.map((imported) => {
							const { manifest } = imported.component;

							return (
								<li
									key={imported.id}
									className='group flex items-start gap-3 rounded-control px-3 py-2.5 transition-colors hover:bg-accent/60'
								>
									<div className='min-w-0 flex-1'>
										<div className='flex items-center gap-2'>
											<p className='truncate text-[13px] font-medium text-foreground'>
												{manifest.name}
											</p>
											{manifest.category && (
												<Badge variant='secondary' className='shrink-0'>
													{manifest.category}
												</Badge>
											)}
										</div>
										{(manifest.author || manifest.description) && (
											<p className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>
												{manifest.author && <>by {manifest.author}</>}
												{manifest.author && manifest.description && ' · '}
												{manifest.description}
											</p>
										)}
										{manifest.tags && manifest.tags.length > 0 && (
											<div className='mt-1.5 flex flex-wrap gap-1'>
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
									</div>
									<div className='flex shrink-0 items-center gap-1'>
										<Button
											size='icon-sm'
											variant='ghost'
											aria-label={`Remove ${manifest.name}`}
											onClick={() => handleDelete(imported.id)}
											className='opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
										>
											<Trash2 className='size-3.5' />
										</Button>
										<Button
											size='sm'
											variant='outline'
											onClick={() => onAddToCanvas(imported.component)}
										>
											<Plus className='size-3.5' />
											Add
										</Button>
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
