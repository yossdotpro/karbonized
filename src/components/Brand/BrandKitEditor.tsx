import React, { useRef } from 'react';
import { toast } from 'sonner';
import {
	Image as ImageIcon,
	ImagePlus,
	NotebookPen,
	Palette,
	Plus,
	Tag,
	Trash2,
	Type,
	type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/components/lib/utils';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { FontPicker } from '../CustomControls/FontPicker';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { useBrandStore } from '@/stores/brand-store';
import {
	type BrandFontRole,
	type BrandKit,
	type BrandLogo,
	type LogoVariant,
	BRAND_FONT_ROLES,
	BRAND_LIMITS,
	LOGO_VARIANTS,
	normalizeBrandKit,
} from '@/lib/brand/brand-kit';
import { DEFAULT_FONT_FAMILY } from '@/lib/fonts/fonts';

const ROLE_LABELS: Record<BrandFontRole, string> = {
	heading: 'Headings',
	body: 'Body',
	code: 'Code',
};

const VARIANT_LABELS: Record<LogoVariant, string> = {
	primary: 'Primary',
	light: 'For dark backgrounds',
	dark: 'For light backgrounds',
	mark: 'Mark / icon',
};

export const BRAND_FILE_EXTENSION = '.kbrand';

/** Starting points for new colors, named by the role they usually play. */
const COLOR_ROLES = ['Primary', 'Ink', 'Background', 'Accent'];
const NEW_COLORS = ['#6366f1', '#111318', '#f7f7f8', '#f43f5e', '#10b981'];

const readAsDataUrl = (file: File) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});

const naturalSize = (src: string) =>
	new Promise<{ width: number; height: number }>((resolve, reject) => {
		const image = new Image();
		image.onload = () =>
			resolve({
				width: image.naturalWidth || 512,
				height: image.naturalHeight || 512,
			});
		image.onerror = () => reject(new Error('Not an image.'));
		image.src = src;
	});

/** Download the kit as a `.kbrand` file. */
export const exportBrandKitFile = (kit: BrandKit): void => {
	const blob = new Blob([JSON.stringify(kit, null, 2)], {
		type: 'application/json',
	});
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = `${kit.name.trim() || 'brand'}${BRAND_FILE_EXTENSION}`;
	link.click();
	setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

/** Replace the kit with the one in a `.kbrand` file. */
export const importBrandKitFile = async (
	file: File | undefined,
): Promise<void> => {
	if (!file) return;
	try {
		const next = normalizeBrandKit(JSON.parse(await file.text()));
		useBrandStore.getState().setKit(next);
		toast.success(`Brand kit ${next.name || file.name} imported`);
	} catch {
		toast.error('That file is not a brand kit');
	}
};

/** The panel shows the kit in collapsible sections, the dialog in one page. */
const CompactContext = React.createContext(false);

const Section: React.FC<{
	title: string;
	icon: LucideIcon;
	/** Shown next to the title of a collapsed section. */
	count?: number;
	/** Open when the panel shows the kit. */
	open?: boolean;
	hint?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}> = ({ title, icon: Icon, count, open = false, hint, action, children }) => {
	const compact = React.useContext(CompactContext);

	if (compact) {
		return (
			<CustomCollapse
				isOpen={open}
				menu={
					<div className='flex items-center gap-2'>
						<Icon size={16} />
						<Label className='text-sm font-semibold text-foreground'>
							{title}
						</Label>
						{count !== undefined && count > 0 && (
							<span className='text-xs text-muted-foreground'>{count}</span>
						)}
					</div>
				}
			>
				{hint && (
					<p className='text-[11px] leading-relaxed text-muted-foreground'>
						{hint}
					</p>
				)}
				{children}
				{action && <div className='flex [&>button]:w-full'>{action}</div>}
			</CustomCollapse>
		);
	}

	return (
		<section className='flex flex-col gap-2'>
			<div className='flex items-end justify-between gap-2'>
				<div className='flex flex-col'>
					<Label className='text-[13px] text-foreground'>{title}</Label>
					{hint && (
						<span className='text-[11px] text-muted-foreground'>{hint}</span>
					)}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
};

/**
 * Edit the brand kit: colors, fonts, logos and guidelines for Agent. The
 * brand dialog shows it in columns; the properties panel, `compact`, in one.
 */
export const BrandKitEditor: React.FC<{ compact?: boolean }> = ({
	compact = false,
}) => {
	const kit = useBrandStore((state) => state.kit);
	const updateKit = useBrandStore((state) => state.updateKit);
	const logoInput = useRef<HTMLInputElement>(null);

	const addLogos = async (files: FileList | null) => {
		if (!files) return;
		const added: BrandLogo[] = [];
		for (const file of Array.from(files)) {
			if (kit.logos.length + added.length >= BRAND_LIMITS.logos) {
				toast.error(`A brand kit holds up to ${BRAND_LIMITS.logos} logos`);
				break;
			}
			if (file.size > BRAND_LIMITS.logoBytes) {
				toast.error(`${file.name} is larger than 2 MB`);
				continue;
			}
			try {
				const src = await readAsDataUrl(file);
				const size = await naturalSize(src);
				added.push({
					id: `logo-${Date.now().toString(36)}-${added.length}`,
					name: file.name.replace(/\.[^.]+$/, ''),
					variant: kit.logos.length + added.length === 0 ? 'primary' : 'mark',
					src,
					...size,
				});
			} catch {
				toast.error(`Could not read ${file.name}`);
			}
		}
		if (added.length) updateKit({ logos: [...kit.logos, ...added] });
	};

	const updateLogo = (id: string, patch: Partial<BrandLogo>) =>
		updateKit({
			logos: kit.logos.map((logo) =>
				logo.id === id ? { ...logo, ...patch } : logo,
			),
		});

	return (
		<CompactContext.Provider value={compact}>
			<div className={cn('flex flex-col', !compact && 'gap-6')}>
				<Section title='Brand name' icon={Tag} open>
					<Input
						value={kit.name}
						placeholder='Acme'
						maxLength={BRAND_LIMITS.name}
						onChange={(event) => updateKit({ name: event.target.value })}
					/>
				</Section>

				<Section
					title='Colors'
					icon={Palette}
					count={kit.colors.length}
					open
					hint='Name them by role: Primary, Accent, Ink, Background…'
					action={
						<Button
							variant='outline'
							size='sm'
							disabled={kit.colors.length >= BRAND_LIMITS.colors}
							onClick={() =>
								updateKit({
									colors: [
										...kit.colors,
										{
											name: COLOR_ROLES[kit.colors.length] ?? '',
											value: NEW_COLORS[kit.colors.length % NEW_COLORS.length],
										},
									],
								})
							}
						>
							<Plus />
							Add color
						</Button>
					}
				>
					{kit.colors.length === 0 ? (
						<p className='text-xs text-muted-foreground'>No colors yet.</p>
					) : (
						<div className={cn('grid gap-2', !compact && 'sm:grid-cols-2')}>
							{kit.colors.map((color, index) => (
								<div key={index} className='flex items-center gap-1.5'>
									<div className={compact ? 'w-28 shrink-0' : 'w-32 shrink-0'}>
										<ColorPicker
											label=''
											type='HexAlpha'
											isGradientEnable={false}
											color={color.value}
											onColorChange={(value) =>
												updateKit({
													colors: kit.colors.map((item, position) =>
														position === index ? { ...item, value } : item,
													),
												})
											}
										/>
									</div>
									<Input
										aria-label='Color name'
										placeholder='Name'
										value={color.name}
										className='h-7 min-w-0 flex-1 text-xs md:text-xs'
										onChange={(event) =>
											updateKit({
												colors: kit.colors.map((item, position) =>
													position === index
														? { ...item, name: event.target.value }
														: item,
												),
											})
										}
									/>
									<Button
										variant='ghost'
										size='icon-xs'
										aria-label={`Remove ${color.name || color.value}`}
										onClick={() =>
											updateKit({
												colors: kit.colors.filter(
													(_, position) => position !== index,
												),
											})
										}
									>
										<Trash2 />
									</Button>
								</div>
							))}
						</div>
					)}
				</Section>

				<Section
					title='Fonts'
					icon={Type}
					count={Object.keys(kit.fonts).length}
					open
				>
					<div className={cn('grid gap-2', !compact && 'sm:grid-cols-3')}>
						{BRAND_FONT_ROLES.map((role) => (
							<div key={role} className='flex min-w-0 flex-col gap-1'>
								<span className='text-[11px] text-muted-foreground'>
									{ROLE_LABELS[role]}
								</span>
								<FontPicker
									family={kit.fonts[role]?.family ?? DEFAULT_FONT_FAMILY}
									onChange={(family, source) => {
										const fonts = { ...kit.fonts };
										if (source === 'default' || family === '') {
											delete fonts[role];
										} else {
											fonts[role] = { family, source };
										}
										updateKit({ fonts });
									}}
								/>
							</div>
						))}
					</div>
				</Section>

				<Section
					title='Logos'
					icon={ImageIcon}
					count={kit.logos.length}
					open={kit.logos.length > 0}
					hint='PNG, SVG, JPEG or WebP, up to 2 MB. Mark which one goes on dark and on light backgrounds.'
					action={
						<Button
							variant='outline'
							size='sm'
							disabled={kit.logos.length >= BRAND_LIMITS.logos}
							onClick={() => logoInput.current?.click()}
						>
							<ImagePlus />
							Add logo
						</Button>
					}
				>
					<input
						ref={logoInput}
						type='file'
						multiple
						accept='image/png,image/svg+xml,image/jpeg,image/webp'
						className='hidden'
						onChange={(event) => {
							void addLogos(event.target.files);
							event.target.value = '';
						}}
					/>
					{kit.logos.length === 0 ? (
						<p className='text-xs text-muted-foreground'>No logos yet.</p>
					) : (
						<div className={cn('grid gap-2', !compact && 'sm:grid-cols-2')}>
							{kit.logos.map((logo) => (
								<div
									key={logo.id}
									className='flex gap-2 rounded-control border border-border p-2'
								>
									<div
										className='flex size-16 shrink-0 items-center justify-center rounded-control p-1.5'
										style={{
											background:
												logo.variant === 'light'
													? '#111318'
													: logo.variant === 'dark'
														? '#ffffff'
														: 'repeating-conic-gradient(#8882 0 25%, transparent 0 50%) 0 0 / 12px 12px',
										}}
									>
										<img
											src={logo.src}
											alt={logo.name}
											className='max-h-full max-w-full object-contain'
										/>
									</div>
									<div className='flex min-w-0 flex-1 flex-col gap-1.5'>
										<div className='flex items-center gap-1'>
											<Input
												aria-label='Logo name'
												value={logo.name}
												className='h-7 min-w-0 flex-1 text-xs md:text-xs'
												onChange={(event) =>
													updateLogo(logo.id, { name: event.target.value })
												}
											/>
											<Button
												variant='ghost'
												size='icon-xs'
												aria-label={`Remove ${logo.name}`}
												onClick={() =>
													updateKit({
														logos: kit.logos.filter(
															(item) => item.id !== logo.id,
														),
													})
												}
											>
												<Trash2 />
											</Button>
										</div>
										<Select
											value={logo.variant}
											onValueChange={(variant) =>
												updateLogo(logo.id, {
													variant: variant as LogoVariant,
												})
											}
										>
											<SelectTrigger
												className='h-7 text-xs'
												aria-label='Logo use'
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{LOGO_VARIANTS.map((variant) => (
													<SelectItem key={variant} value={variant}>
														{VARIANT_LABELS[variant]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							))}
						</div>
					)}
				</Section>

				<Section
					title='Guidelines'
					icon={NotebookPen}
					open={kit.notes.trim() !== ''}
					hint='For Agent: tone of voice, what to avoid, how the logo is used.'
				>
					<Textarea
						value={kit.notes}
						maxLength={BRAND_LIMITS.notes}
						rows={4}
						placeholder='Headlines in sentence case. Never put the logo on the accent color. Friendly, precise, no emoji.'
						className='text-xs md:text-xs'
						onChange={(event) => updateKit({ notes: event.target.value })}
					/>
				</Section>
			</div>
		</CompactContext.Provider>
	);
};
