import React, { useEffect, useState } from 'react';
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
import {
	DEFAULT_FONT_FAMILY,
	GOOGLE_FONTS,
	fontStack,
	listSystemFonts,
	loadGoogleFont,
	loadGoogleFontPreviews,
} from '@/lib/fonts/fonts';
import type { FontSource } from '@/lib/fonts/fonts';

interface Props {
	family: string;
	onChange: (family: string, source: FontSource | 'default') => void;
}

/**
 * Font chooser for text blocks: the fonts installed on the machine plus a
 * selection of Google Fonts, each name shown in its own font.
 */
export const FontPicker: React.FC<Props> = ({ family, onChange }) => {
	const [open, setOpen] = useState(false);
	const [systemFonts, setSystemFonts] = useState<string[]>([]);

	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		void listSystemFonts().then((fonts) => {
			if (!cancelled) setSystemFonts(fonts);
		});
		// Names are previewed with a tiny subset of each family.
		void loadGoogleFontPreviews();

		return () => {
			cancelled = true;
		};
	}, [open]);

	const select = (next: string, source: FontSource | 'default') => {
		if (source === 'google') void loadGoogleFont(next);
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

					<Command loop>
						<CommandInput placeholder='Search fonts…' />
						<CommandList className='max-h-80'>
							<CommandEmpty>No fonts found.</CommandEmpty>

							<CommandGroup heading='App'>
								{item(DEFAULT_FONT_FAMILY, 'Default', 'default')}
							</CommandGroup>

							{systemFonts.length > 0 && (
								<CommandGroup heading='Installed'>
									{systemFonts.map((name) => item(name, name, 'system'))}
								</CommandGroup>
							)}

							<CommandGroup heading='Google Fonts'>
								{GOOGLE_FONTS.map((name) => item(name, name, 'google'))}
							</CommandGroup>
						</CommandList>
					</Command>
				</DialogContent>
			</Dialog>
		</>
	);
};
