import React, { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SizeItem, Sizes } from '@/constants/sizes';
import { cn } from '@/components/lib/utils';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultName: string;
	onCreate: (name: string, width: number, height: number) => void;
}

/** Name + size form, with every preset and a custom size. */
export const NewProjectDialog: React.FC<Props> = ({
	open,
	onOpenChange,
	defaultName,
	onCreate,
}) => {
	const [projectName, setProjectName] = useState('');
	const [selectedPreset, setSelectedPreset] = useState<SizeItem | null>(null);
	const [customWidth, setCustomWidth] = useState('1920');
	const [customHeight, setCustomHeight] = useState('1080');
	const [useCustomSize, setUseCustomSize] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const width = useCustomSize
		? parseInt(customWidth)
		: selectedPreset?.width || 1920;
	const height = useCustomSize
		? parseInt(customHeight)
		: selectedPreset?.height || 1080;
	const isValid = width > 0 && height > 0;

	const handleCreate = () => {
		if (!isValid) return;
		onCreate(projectName.trim() || defaultName, width, height);
	};

	const filteredSizes = Sizes.filter(
		(size) =>
			size.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
			size.description?.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='gap-4 sm:max-w-2xl'>
				<DialogHeader>
					<DialogTitle>New project</DialogTitle>
					<DialogDescription>
						Name your project and pick a canvas size.
					</DialogDescription>
				</DialogHeader>

				<div className='grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
					{/* Details */}
					<div className='flex flex-col gap-4'>
						<div className='flex flex-col gap-1.5'>
							<Label
								htmlFor='project-name'
								className='text-xs font-normal text-muted-foreground'
							>
								Project name
							</Label>
							<Input
								id='project-name'
								placeholder={defaultName}
								value={projectName}
								autoFocus
								onChange={(e) => setProjectName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') handleCreate();
								}}
							/>
						</div>

						<div className='flex flex-col gap-1.5'>
							<div className='flex items-center justify-between'>
								<Label className='text-xs font-normal text-muted-foreground'>
									Canvas size
								</Label>
								<button
									type='button'
									onClick={() => {
										setUseCustomSize(!useCustomSize);
										setSelectedPreset(null);
									}}
									className='text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
								>
									{useCustomSize ? 'Use a preset' : 'Custom size'}
								</button>
							</div>
							<div className='grid grid-cols-2 gap-2'>
								{[
									{
										id: 'custom-width',
										prefix: 'W',
										label: 'Width in pixels',
										value: useCustomSize ? customWidth : String(width),
										onChange: setCustomWidth,
									},
									{
										id: 'custom-height',
										prefix: 'H',
										label: 'Height in pixels',
										value: useCustomSize ? customHeight : String(height),
										onChange: setCustomHeight,
									},
								].map((field) => (
									<div key={field.id} className='relative'>
										<span className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground'>
											{field.prefix}
										</span>
										<Input
											id={field.id}
											type='number'
											aria-label={field.label}
											value={field.value}
											disabled={!useCustomSize}
											onChange={(e) => field.onChange(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') handleCreate();
											}}
											className='pl-7 font-mono tabular-nums disabled:bg-muted/50 disabled:opacity-100'
										/>
									</div>
								))}
							</div>
							<p className='text-xs text-muted-foreground'>
								{useCustomSize
									? 'Enter the size in pixels.'
									: selectedPreset
										? `${selectedPreset.label} preset`
										: 'Full HD by default — choose a preset or set a custom size.'}
							</p>
						</div>

						{/* Preview */}
						<div className='hidden flex-1 items-center justify-center rounded-surface border border-dashed border-border bg-muted/40 p-4 sm:flex'>
							{isValid && (
								<div
									className='rounded-[4px] border border-border bg-background shadow-sm'
									style={{
										aspectRatio: `${width} / ${height}`,
										width: width >= height ? '100%' : 'auto',
										height: width >= height ? 'auto' : '120px',
										maxHeight: '120px',
										maxWidth: '100%',
									}}
								/>
							)}
						</div>
					</div>

					{/* Presets */}
					<div className='flex min-h-0 flex-col rounded-surface border border-border'>
						<div className='relative border-b border-border p-1.5'>
							<Search className='pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
							<Input
								placeholder='Search sizes…'
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className='h-7 border-0 pl-7 text-xs focus-visible:ring-0 md:text-xs'
							/>
						</div>
						<ul className='max-h-[320px] overflow-y-auto p-1'>
							{filteredSizes.map((preset) => {
								const isSelected =
									selectedPreset?.label === preset.label && !useCustomSize;

								return (
									<li key={preset.label}>
										<button
											type='button'
											onClick={() => {
												setSelectedPreset(preset);
												setUseCustomSize(false);
											}}
											onDoubleClick={() =>
												onCreate(
													projectName.trim() || defaultName,
													preset.width,
													preset.height,
												)
											}
											className={cn(
												'flex w-full items-center gap-3 rounded-control px-2.5 py-1.5 text-left transition-colors [&_svg]:size-4',
												isSelected
													? 'bg-accent text-foreground'
													: 'text-muted-foreground hover:bg-muted hover:text-foreground',
											)}
										>
											<span className='shrink-0'>{preset.icon}</span>
											<span className='min-w-0 flex-1'>
												<span className='block truncate text-[13px] text-foreground'>
													{preset.label}
												</span>
												<span className='block truncate text-xs text-muted-foreground'>
													{preset.description}
												</span>
											</span>
											<span className='shrink-0 font-mono text-xs tabular-nums text-muted-foreground'>
												{preset.width} × {preset.height}
											</span>
											<Check
												className={`shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
											/>
										</button>
									</li>
								);
							})}
							{filteredSizes.length === 0 && (
								<li className='px-3 py-8 text-center text-[13px] text-muted-foreground'>
									No sizes match &ldquo;{searchQuery}&rdquo;
								</li>
							)}
						</ul>
					</div>
				</div>

				<DialogFooter>
					<Button variant='ghost' onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={!isValid}>
						Create project
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default NewProjectDialog;
