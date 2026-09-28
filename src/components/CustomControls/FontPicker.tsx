import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, SearchIcon, Type } from 'lucide-react';
import { cn } from '@/components/lib/utils';
import { Button } from '../ui/button';
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
import {
	type FontRow,
	buildFontRows,
	nextFontRow,
	scrollToRow,
	visibleRange,
} from '@/lib/fonts/font-list';
import type { BrandFont, BrandFontRole } from '@/lib/brand/brand-kit';
import { useBrandStore } from '@/stores/brand-store';

const ROLE_LABELS: Record<BrandFontRole, string> = {
	heading: 'headings',
	body: 'body',
	code: 'code',
};

interface Props {
	family: string;
	onChange: (family: string, source: FontSource | 'default') => void;
}

/** Height of every row of the list, headings included (`h-9`). */
const ROW = 36;
/** Height of the list (`max-h-80`). */
const VIEWPORT = 320;
/** How long the list has to stay still before the previews on screen load. */
const PREVIEW_DELAY = 120;

/**
 * Font chooser for text blocks: the fonts installed on the machine and the
 * whole Google Fonts catalog, each name shown in its own font.
 *
 * The catalog is some two thousand families. The list is virtualized, so all
 * of them can be scrolled through while only the rows on screen are rendered,
 * and only the names on screen are fetched for the preview.
 */
export const FontPicker: React.FC<Props> = ({ family, onChange }) => {
	const [open, setOpen] = useState(false);
	const [systemFonts, setSystemFonts] = useState<string[]>([]);
	const [catalog, setCatalog] = useState<GoogleFont[]>([]);
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState<FontCategory | 'all'>('all');
	const [scrollTop, setScrollTop] = useState(0);
	const [active, setActive] = useState(-1);
	const listRef = useRef<HTMLDivElement>(null);
	const previewed = useRef(new Set<string>());
	const listId = useId();

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

	const brandFontMap = useBrandStore((state) => state.kit.fonts);

	const rows = useMemo<FontRow[]>(() => {
		const needle = query.trim().toLowerCase();
		const matches = (name: string) =>
			needle === '' || name.toLowerCase().includes(needle);
		const brand = (
			Object.entries(brandFontMap) as Array<[BrandFontRole, BrandFont]>
		).filter(([, font]) => matches(font.family));

		return buildFontRows([
			{
				label: 'Brand',
				fonts: brand.map(([role, font]) => ({
					family: font.family,
					label: `${font.family} · ${ROLE_LABELS[role]}`,
					source: font.source,
				})),
			},
			{
				label: 'App',
				fonts:
					needle === ''
						? [
								{
									family: DEFAULT_FONT_FAMILY,
									label: 'Default',
									source: 'default',
								},
							]
						: [],
			},
			{
				label: 'Installed',
				fonts: systemFonts
					.filter(matches)
					.map((name) => ({ family: name, source: 'system' })),
			},
			{
				label:
					catalog.length === 0
						? 'Google Fonts'
						: `Google Fonts (${catalog.length})`,
				fonts: filterFonts(catalog, query, category, Infinity).map((font) => ({
					family: font.family,
					source: 'google',
				})),
			},
		]);
	}, [brandFontMap, systemFonts, catalog, query, category]);

	const [first, last] = visibleRange(scrollTop, VIEWPORT, ROW, rows.length);

	const scrollTo = (index: number) => {
		const list = listRef.current;
		if (!list || index < 0) return;
		const next = scrollToRow(index, list.scrollTop, list.clientHeight, ROW);
		if (next !== null) list.scrollTop = next;
	};

	/** -1 (nothing picked with the keys or the pointer yet) means the first match. */
	const current =
		rows[active]?.kind === 'font' ? active : nextFontRow(rows, -1, 1);

	// A new search or category starts at the top, on the first match.
	const resetList = () => {
		if (listRef.current) listRef.current.scrollTop = 0;
		setScrollTop(0);
		setActive(-1);
	};

	// Opening the picker shows the current font, once the lists are there.
	const revealed = useRef(false);
	useEffect(() => {
		if (!open) {
			revealed.current = false;
			return;
		}
		if (revealed.current || catalog.length === 0) return;
		const index = rows.findIndex(
			(row) => row.kind === 'font' && row.family === family,
		);
		revealed.current = true;
		if (index < 0) return;
		requestAnimationFrame(() => {
			const list = listRef.current;
			if (!list) return;
			setActive(index);
			list.scrollTop = Math.max(0, index * ROW - VIEWPORT / 2 + ROW / 2);
			setScrollTop(list.scrollTop);
		});
	}, [open, catalog.length, rows, family]);

	/* Only the Google names in front of the reader are fetched, and only their
	   glyphs, once the list stops moving: a screenful costs a few kilobytes. */
	useEffect(() => {
		if (!open) return;
		const timer = window.setTimeout(() => {
			const families = rows
				.slice(first, last + 1)
				.filter(
					(row): row is Extract<FontRow, { kind: 'font' }> =>
						row.kind === 'font' &&
						row.source === 'google' &&
						!previewed.current.has(row.family),
				)
				.map((row) => row.family);
			if (families.length === 0) return;
			families.forEach((name) => previewed.current.add(name));
			void loadGoogleFontPreviews(families);
		}, PREVIEW_DELAY);
		return () => window.clearTimeout(timer);
	}, [open, rows, first, last]);

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

	const move = (index: number) => {
		setActive(index);
		scrollTo(index);
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		const page = Math.floor(VIEWPORT / ROW) - 1;
		switch (event.key) {
			case 'ArrowDown':
				move(nextFontRow(rows, current, 1));
				break;
			case 'ArrowUp':
				move(nextFontRow(rows, current, -1));
				break;
			case 'PageDown':
				move(nextFontRow(rows, Math.min(rows.length, current + page) - 1, 1));
				break;
			case 'PageUp':
				move(nextFontRow(rows, Math.max(0, current - page) + 1, -1));
				break;
			case 'Home':
				move(nextFontRow(rows, -1, 1));
				break;
			case 'End':
				move(nextFontRow(rows, rows.length, -1));
				break;
			case 'Enter': {
				const row = rows[current];
				if (row?.kind === 'font') select(row.family, row.source);
				break;
			}
			default:
				return;
		}
		event.preventDefault();
	};

	const optionId = (index: number) => `${listId}-${index}`;

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

					<div className='flex h-full w-full flex-col overflow-hidden bg-popover text-popover-foreground'>
						<div className='flex h-12 items-center gap-2.5 border-b border-border px-4'>
							<SearchIcon className='size-4 shrink-0 text-muted-foreground' />
							<input
								className='h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground'
								placeholder='Search fonts…'
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									resetList();
								}}
								onKeyDown={onKeyDown}
								role='combobox'
								aria-expanded
								aria-controls={listId}
								aria-activedescendant={
									active >= 0 ? optionId(active) : undefined
								}
								aria-autocomplete='list'
								autoFocus
							/>
						</div>

						<div className='px-3 pt-2'>
							<ToggleGroup
								type='single'
								variant='outline'
								size='sm'
								className='w-full'
								value={category}
								onValueChange={(value) => {
									if (!value) return;
									setCategory(value as FontCategory | 'all');
									resetList();
								}}
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

						<div
							ref={listRef}
							id={listId}
							role='listbox'
							aria-label='Fonts'
							className='relative my-1.5 max-h-80 overflow-y-auto overflow-x-hidden px-1.5'
							style={{
								height: Math.min(VIEWPORT, Math.max(rows.length, 1) * ROW),
							}}
							onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
						>
							{rows.length === 0 ? (
								<p className='py-10 text-center text-[13px] text-muted-foreground'>
									No fonts found.
								</p>
							) : (
								<div className='relative' style={{ height: rows.length * ROW }}>
									{rows.slice(first, last + 1).map((row, offset) => {
										const index = first + offset;
										const style = { top: index * ROW, height: ROW };
										if (row.kind === 'heading') {
											return (
												<div
													key={row.key}
													role='presentation'
													className='absolute inset-x-0 flex items-end px-2 pb-1 text-[11px] font-medium text-muted-foreground'
													style={style}
												>
													{row.label}
												</div>
											);
										}
										return (
											<div
												key={row.key}
												id={optionId(index)}
												role='option'
												aria-selected={index === current}
												className={cn(
													'absolute inset-x-0 flex cursor-default select-none items-center gap-2.5 rounded-control px-2 text-[13px] text-foreground',
													index === current && 'bg-accent',
												)}
												style={style}
												onMouseMove={() =>
													index !== current && setActive(index)
												}
												onClick={() => select(row.family, row.source)}
											>
												<span
													className='flex flex-auto truncate'
													style={{ fontFamily: fontStack(row.family) }}
												>
													{row.label}
												</span>
												{family === row.family && (
													<Check className='size-4 shrink-0 text-muted-foreground' />
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};
