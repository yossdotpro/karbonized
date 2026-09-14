import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
	Check,
	FileImage,
	Layers,
	Plus,
	ArrowLeft,
	Monitor,
	Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspaceStore } from '@/stores';
import { getRandomNumber } from '@/utils/getRandom';
import { SizeItem, Sizes } from '@/constants/sizes';

export const NewProject: React.FC = () => {
	const navigate = useNavigate();
	const addWorkspace = useWorkspaceStore((state) => state.addWorkspace);
	const setCurrentWorkspace = useWorkspaceStore(
		(state) => state.setCurrentWorkspace,
	);

	const [projectName, setProjectName] = useState('');
	const [selectedPreset, setSelectedPreset] = useState<SizeItem | null>(null);
	const [customWidth, setCustomWidth] = useState('1920');
	const [customHeight, setCustomHeight] = useState('1080');
	const [useCustomSize, setUseCustomSize] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const handleCreateProject = () => {
		const width = useCustomSize
			? parseInt(customWidth)
			: selectedPreset?.width || 1920;
		const height = useCustomSize
			? parseInt(customHeight)
			: selectedPreset?.height || 1080;

		if (!projectName.trim()) {
			alert('Please enter a project name');
			return;
		}

		if (width <= 0 || height <= 0) {
			alert('Please enter valid dimensions');
			return;
		}

		const workspaceId = getRandomNumber().toString();
		addWorkspace(workspaceId, projectName);
		setCurrentWorkspace(workspaceId);

		// Update workspace with custom dimensions
		const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
		if (currentWorkspace) {
			useWorkspaceStore.setState((state) => ({
				...state,
				currentWorkspace: {
					...currentWorkspace,
					workspaceWidth: width.toString(),
					workspaceHeight: height.toString(),
				},
			}));
		}

		navigate('/editor');
	};

	const handlePresetSelect = (preset: SizeItem) => {
		setSelectedPreset(preset);
		setUseCustomSize(false);
	};

	const handleCustomSizeToggle = () => {
		setUseCustomSize(true);
		setSelectedPreset(null);
	};

	const filteredSizes = Sizes.filter(
		(size) =>
			size.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
			size.description?.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const currentWidth = useCustomSize
		? customWidth
		: String(selectedPreset?.width || 1920);
	const currentHeight = useCustomSize
		? customHeight
		: String(selectedPreset?.height || 1080);

	return (
		<div className='flex h-full w-full overflow-y-auto bg-background px-6'>
			<motion.div
				initial={{ opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, ease: 'easeOut' }}
				className='mx-auto flex w-full max-w-4xl flex-col py-12'
			>
				{/* Header */}
				<div className='mb-8 flex items-start gap-3'>
					<div className='flex size-9 shrink-0 items-center justify-center rounded-surface border border-border bg-card'>
						<Layers className='size-4 text-muted-foreground' />
					</div>
					<div>
						<h1 className='text-xl font-semibold tracking-tight text-foreground'>
							New project
						</h1>
						<p className='mt-0.5 text-[13px] text-muted-foreground'>
							Name your project and pick a canvas size.
						</p>
					</div>
				</div>

				<div className='grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'>
					{/* Details */}
					<section className='flex h-fit flex-col gap-5 rounded-surface border border-border bg-card p-5'>
						<div className='flex items-center gap-2 text-[13px] font-medium text-foreground'>
							<FileImage className='size-4 text-muted-foreground' />
							Details
						</div>

						<div className='flex flex-col gap-1.5'>
							<Label
								htmlFor='project-name'
								className='text-xs font-normal text-muted-foreground'
							>
								Project name
							</Label>
							<Input
								id='project-name'
								placeholder='My Project'
								value={projectName}
								autoFocus
								onChange={(e) => setProjectName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') handleCreateProject();
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
									onClick={() =>
										useCustomSize
											? setUseCustomSize(false)
											: handleCustomSizeToggle()
									}
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
										value: currentWidth,
										onChange: setCustomWidth,
									},
									{
										id: 'custom-height',
										prefix: 'H',
										label: 'Height in pixels',
										value: currentHeight,
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
					</section>

					{/* Presets */}
					<section className='flex min-h-0 flex-col rounded-surface border border-border bg-card'>
						<div className='flex items-center gap-2 border-b border-border py-2 pl-4 pr-2'>
							<Monitor className='size-4 shrink-0 text-muted-foreground' />
							<span className='text-[13px] font-medium text-foreground'>
								Presets
							</span>
							<div className='relative ml-auto w-48'>
								<Search className='pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
								<Input
									placeholder='Search sizes…'
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className='h-7 pl-7 text-xs md:text-xs'
								/>
							</div>
						</div>
						<ul className='max-h-[380px] overflow-y-auto p-1'>
							{filteredSizes.map((preset) => {
								const isSelected =
									selectedPreset?.label === preset.label && !useCustomSize;

								return (
									<li key={preset.label}>
										<button
											type='button'
											onClick={() => handlePresetSelect(preset)}
											className={`flex w-full items-center gap-3 rounded-control px-2.5 py-1.5 text-left transition-colors [&_svg]:size-4 ${
												isSelected
													? 'bg-accent text-foreground'
													: 'text-muted-foreground hover:bg-muted hover:text-foreground'
											}`}
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
									No sizes match "{searchQuery}"
								</li>
							)}
						</ul>
					</section>
				</div>

				{/* Actions */}
				<div className='mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row'>
					<Button variant='ghost' onClick={() => navigate('/editor')}>
						<ArrowLeft className='size-3.5' />
						Back to editor
					</Button>

					<Button onClick={handleCreateProject}>
						<Plus className='size-3.5' />
						Create project
					</Button>
				</div>
			</motion.div>
		</div>
	);
};

export default NewProject;
