import React, { useEffect, useMemo, useState } from 'react';
import { Check, Type } from 'lucide-react';
import { Button } from '../ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '../ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import {
	DEFAULT_FONT_FAMILY,
	FONT_CATEGORIES,
	type FontCategory,
	type GoogleFont,
	filterFonts,
	fontStack,
	listSystemFonts,
	loadGoogleCatalog,
	loadGoogleFont,
	loadGoogleFontPreviews,
} from '@/lib/fonts/fonts';
import type { FontSource } from '@/lib/fonts/fonts';

interface Props {
	family: string;
	onChange: (family: string, source: FontSource | 'default') => void;
}

/** How many families of the catalog are listed at a time. */
const PAGE = 60;

/**
 * Font chooser for text blocks: the fonts installed on the machine and the
 * whole Google Fonts catalog, each name shown in its own font.
 *
 * The catalog is some two thousand families, so it is searched and filtered
 * here and only the names on screen are fetched for the preview.
 */
export const FontPicker: React.FC<Props> = ({ family, onChange }) => {
	const [open, setOpen] = useState(false);
	const [systemFonts, setSystemFonts] = useState<string[]>([]);
	const [catalog, setCatalog] = useState<GoogleFont[]>([]);
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState<FontCategory | 'all'>('all');

	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		void listSystemFonts().then((fonts) => {
			if (!cancelled) setSystemFonts(fonts);
		});
		void loadGoogleCatalog().then((fonts) => {
			if (!cancelled) setCatalog(fonts);
		});

		return () => {
			cancelled = true;
		};
	}, [open]);

	const googleFonts = useMemo(
		() => filterFonts(catalog, query, category, PAGE),
		[catalog, query, category],
	);

	const systemMatches = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return systemFonts
			.filter((name) => needle === '' || name.toLowerCase().includes(needle))
			.slice(0, PAGE);
	}, [systemFonts, query]);

	/* Only the names in front of the reader are fetched, and only their
	   glyphs: a page of the picker costs a few kilobytes. */
	useEffect(() => {
		if (!open || googleFonts.length === 0) return;
		void loadGoogleFontPreviews(googleFonts.map((font) => font.family));
	}, [open, googleFonts]);

	const select = (next: string, source: FontSource | 'default') => {
		if (source === 'google') {
			void loadGoogleFont(
				next,
				catalog.find((font) => font.family === next)?.weights,
			);
		}
		onChange(next, source);
		setOpen(false);
	};

	const item = (
		name: string,
		label: string,
		source: FontSource | 'default',
	) => (
		<CommandItem
			key={`${source}-${name || 'default'}`}
			value={`${label} ${source}`}
			onSelect={() => {
				select(name, source);
			}}
		>
			<span
				className='flex flex-auto truncate'
				style={{ fontFamily: fontStack(name) }}
			>
				{label}
			</span>
			{family === name && <Check className='size-4 shrink-0' />}
		</CommandItem>
	);

	const hasMore = googleFonts.length === PAGE;

	return (
		<>
			<Button
				variant='outline'
				className='h-8 w-full justify-start gap-2 text-sm'
				onClick={() => {
					setOpen(true);
				}}
			>
				<Type className='size-4 shrink-0 text-muted-foreground' />
				<span className='truncate' style={{ fontFamily: fontStack(family) }}>
					{family === DEFAULT_FONT_FAMILY ? 'Default' : family}
				</span>
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className='overflow-hidden p-0'>
					<DialogHeader className='px-4 pt-4'>
						<DialogTitle>Font</DialogTitle>
					</DialogHeader>

					{/* The list is filtered here, not by the command palette, so the
					    catalog can be paged and previewed a page at a time */}
					<Command loop shouldFilter={false}>
						<CommandInput
							placeholder='Search fonts…'
							value={query}
							onValueChange={setQuery}
						/>

						<div className='px-3 pt-2'>
							<ToggleGroup
								type='single'
								variant='outline'
								size='sm'
								className='w-full'
								value={category}
								onValueChange={(value) =>
									value && setCategory(value as FontCategory | 'all')
								}
							>
								{FONT_CATEGORIES.map((option) => (
									<ToggleGroupItem
										key={option.value}
										value={option.value}
										className='flex-1 text-xs'
									>
										{option.label}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</div>

						<CommandList className='max-h-80'>
							<CommandEmpty>No fonts found.</CommandEmpty>

							{query.trim() === '' && (
								<CommandGroup heading='App'>
									{item(DEFAULT_FONT_FAMILY, 'Default', 'default')}
								</CommandGroup>
							)}

							{systemMatches.length > 0 && (
								<CommandGroup heading='Installed'>
									{systemMatches.map((name) => item(name, name, 'system'))}
								</CommandGroup>
							)}

							<CommandGroup
								heading={
									catalog.length === 0
										? 'Google Fonts'
										: `Google Fonts (${catalog.length})`
								}
							>
								{googleFonts.map((font) =>
									item(font.family, font.family, 'google'),
								)}
								{hasMore && (
									<div className='px-2 py-1.5 text-[11px] text-muted-foreground'>
										Showing the first {PAGE}. Keep typing to narrow it down.
									</div>
								)}
							</CommandGroup>
						</CommandList>
					</Command>
				</DialogContent>
			</Dialog>
		</>
	);
};
