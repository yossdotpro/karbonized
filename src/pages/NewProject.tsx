import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
	ArrowRight,
	Clock,
	FolderOpen,
	ImageIcon,
	MoreHorizontal,
	Plus,
	Sparkles,
	X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { KarbonizedLogoFlat } from '@/components/Icons/Icons';
import { NewProjectDialog } from '@/components/Modals/NewProjectDialog';
import { cn } from '@/components/lib/utils';
import { commandRegistry } from '@/lib/commands/registry';
import {
	createProject,
	nextUntitledName,
	reopenProject,
} from '@/lib/persistence/projects';
import {
	loadRecents,
	removeRecent,
	useRecentProjects,
	type RecentProject,
} from '@/lib/persistence/recents';
import { useWorkspaceStore } from '@/stores';
import { version } from '../../package.json';

const QUICK_STARTS = [
	{ label: 'Widescreen', hint: 'Slides, desktop', width: 1920, height: 1080 },
	{ label: 'Square', hint: 'Instagram, avatars', width: 1080, height: 1080 },
	{ label: 'Portrait', hint: 'Instagram feed', width: 1080, height: 1350 },
	{ label: 'Story', hint: 'Stories, reels', width: 1080, height: 1920 },
	{ label: 'Open Graph', hint: 'Link previews', width: 1200, height: 630 },
	{ label: 'Post', hint: 'X, LinkedIn', width: 1600, height: 900 },
];

const relativeTime = (timestamp: number): string => {
	const seconds = Math.round((timestamp - Date.now()) / 1000);
	const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
	const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
		['year', 31536000],
		['month', 2592000],
		['week', 604800],
		['day', 86400],
		['hour', 3600],
		['minute', 60],
	];

	for (const [unit, size] of units) {
		if (Math.abs(seconds) >= size) {
			return format.format(Math.round(seconds / size), unit);
		}
	}
	return 'just now';
};

/** Rectangle with the aspect ratio of a canvas size, fitted in a box. */
const RatioShape: React.FC<{
	width: number;
	height: number;
	className?: string;
}> = ({ width, height, className }) => {
	const ratio = width / height;

	return (
		<span
			className={cn(
				'block rounded-[4px] border border-foreground/25 bg-foreground/[0.04] transition-colors',
				className,
			)}
			style={{
				aspectRatio: `${width} / ${height}`,
				width: ratio >= 1 ? '100%' : 'auto',
				height: ratio >= 1 ? 'auto' : '100%',
			}}
		/>
	);
};

const SectionTitle: React.FC<{
	icon: React.ReactNode;
	children: React.ReactNode;
	action?: React.ReactNode;
}> = ({ icon, children, action }) => (
	<div className='mb-3 flex items-center gap-2 text-[13px] font-medium text-foreground [&_svg]:size-3.5 [&_svg]:text-muted-foreground'>
		{icon}
		{children}
		{action && <div className='ml-auto'>{action}</div>}
	</div>
);

const RecentCard: React.FC<{
	item: RecentProject;
	isOpen: boolean;
	onOpen: () => void;
	onRemove: () => void;
}> = ({ item, isOpen, onOpen, onRemove }) => (
	<div className='group relative'>
		<button
			type='button'
			onClick={onOpen}
			className='flex w-full flex-col overflow-hidden rounded-surface border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-ring/60 hover:shadow-lg hover:shadow-black/10 focus-visible:outline-2 focus-visible:outline-ring'
		>
			<div className='canvas-grid flex aspect-[16/10] w-full items-center justify-center overflow-hidden border-b border-border p-3'>
				{item.thumbnail ? (
					<img
						src={item.thumbnail}
						alt=''
						draggable={false}
						className='max-h-full max-w-full rounded-[3px] object-contain shadow-md shadow-black/20'
					/>
				) : (
					<div className='flex h-full w-full items-center justify-center p-4'>
						<RatioShape
							width={item.width || 16}
							height={item.height || 10}
							className='max-h-full max-w-full'
						/>
					</div>
				)}
			</div>
			<div className='flex items-center gap-2 px-3 py-2.5'>
				<div className='min-w-0 flex-1'>
					<div className='truncate text-[13px] font-medium text-foreground'>
						{item.name}
					</div>
					<div className='truncate text-xs text-muted-foreground'>
						<span className='font-mono tabular-nums'>
							{item.width} × {item.height}
						</span>
						<span className='mx-1.5'>·</span>
						{relativeTime(item.updatedAt)}
					</div>
				</div>
				{isOpen && (
					<span className='shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
						Open
					</span>
				)}
			</div>
		</button>

		<button
			type='button'
			aria-label={`Remove ${item.name} from recents`}
			title='Remove from recents'
			onClick={onRemove}
			className='absolute right-2 top-2 flex size-6 items-center justify-center rounded-control border border-border bg-popover/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100'
		>
			<X className='size-3.5' />
		</button>
	</div>
);

export const NewProject: React.FC = () => {
	const navigate = useNavigate();
	const workspaces = useWorkspaceStore((state) => state.workspaces);
	const recents = useRecentProjects((state) => state.items);
	const recentsLoaded = useRecentProjects((state) => state.loaded);
	const [dialogOpen, setDialogOpen] = useState(false);

	useEffect(() => {
		void loadRecents();
	}, []);

	const openIds = new Set(workspaces.map((item) => item.id));

	const handleCreate = (name: string, width: number, height: number) => {
		createProject(name, width, height);
		navigate('/editor');
	};

	const handleOpenRecent = (item: RecentProject) => {
		reopenProject(item.project);
		navigate('/editor');
	};

	return (
		<div className='relative flex h-full w-full overflow-y-auto bg-background'>
			{/* Backdrop */}
			<div
				aria-hidden
				className='pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden'
			>
				<div className='canvas-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_0%,black,transparent)]' />
				<div className='absolute left-1/2 top-[-220px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/15 blur-[110px] dark:bg-brand/20' />
			</div>

			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, ease: 'easeOut' }}
				className='relative mx-auto flex w-full max-w-5xl flex-col px-6 pb-16 pt-14'
			>
				{/* Hero */}
				<header className='mb-12 flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between'>
					<div className='flex flex-col gap-4'>
						<button
							type='button'
							onClick={() => commandRegistry.get('help.changelog')?.run()}
							className='flex w-fit items-center gap-1.5 rounded-full border border-border bg-card/80 py-1 pl-1.5 pr-2.5 text-xs text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground'
						>
							<span className='flex items-center gap-1 rounded-full bg-brand px-1.5 py-px text-[10px] font-semibold text-white'>
								<Sparkles className='size-2.5' />v{version}
							</span>
							What&apos;s new
							<ArrowRight className='size-3' />
						</button>

						<div className='flex items-center gap-3'>
							<span className='flex size-11 items-center justify-center rounded-[12px] border border-border bg-card shadow-sm'>
								<KarbonizedLogoFlat className='size-6' />
							</span>
							<div>
								<h1 className='text-2xl font-semibold tracking-tight text-foreground'>
									Karbonized
								</h1>
								<p className='text-[13px] text-muted-foreground'>
									Code shots, mockups and social images — ready in minutes.
								</p>
							</div>
						</div>
					</div>

					<div className='flex flex-wrap items-center gap-2'>
						{workspaces.length > 0 && (
							<Button variant='ghost' onClick={() => navigate('/editor')}>
								Back to editor
								<ArrowRight className='size-3.5' />
							</Button>
						)}
						<Button
							variant='outline'
							onClick={() => commandRegistry.get('file.open')?.run()}
						>
							<FolderOpen className='size-3.5' />
							Open file…
						</Button>
						<Button onClick={() => setDialogOpen(true)}>
							<Plus className='size-3.5' />
							New project
						</Button>
					</div>
				</header>

				{/* Quick start */}
				<section className='mb-12'>
					<SectionTitle
						icon={<Plus />}
						action={
							<button
								type='button'
								onClick={() => setDialogOpen(true)}
								className='flex items-center gap-1 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground'
							>
								More sizes
								<MoreHorizontal className='size-3.5' />
							</button>
						}
					>
						Start from a size
					</SectionTitle>

					<div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
						{QUICK_STARTS.map((item) => (
							<button
								key={item.label}
								type='button'
								onClick={() =>
									handleCreate(nextUntitledName(), item.width, item.height)
								}
								className='group flex flex-col gap-3 rounded-surface border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-ring/60 hover:shadow-lg hover:shadow-black/10 focus-visible:outline-2 focus-visible:outline-ring'
							>
								<span className='flex h-20 w-full items-center justify-center'>
									<span className='flex h-full w-3/4 items-center justify-center'>
										<RatioShape
											width={item.width}
											height={item.height}
											className='max-h-full max-w-full group-hover:border-brand/60 group-hover:bg-brand/10'
										/>
									</span>
								</span>
								<span>
									<span className='block text-[13px] font-medium text-foreground'>
										{item.label}
									</span>
									<span className='block font-mono text-[11px] tabular-nums text-muted-foreground'>
										{item.width} × {item.height}
									</span>
									<span className='block truncate text-[11px] text-muted-foreground'>
										{item.hint}
									</span>
								</span>
							</button>
						))}
					</div>
				</section>

				{/* Recent */}
				<section>
					<SectionTitle icon={<Clock />}>Recent projects</SectionTitle>

					{recentsLoaded && recents.length === 0 ? (
						<div className='flex flex-col items-center justify-center gap-2 rounded-surface border border-dashed border-border px-6 py-12 text-center'>
							<span className='flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground'>
								<ImageIcon className='size-4' />
							</span>
							<p className='text-[13px] font-medium text-foreground'>
								No recent projects yet
							</p>
							<p className='max-w-xs text-xs text-muted-foreground'>
								Projects you work on show up here, even after you close their
								tab.
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
							{recents.map((item) => (
								<RecentCard
									key={item.id}
									item={item}
									isOpen={openIds.has(item.id)}
									onOpen={() => handleOpenRecent(item)}
									onRemove={() => void removeRecent(item.id)}
								/>
							))}
						</div>
					)}
				</section>

				{/* Footer */}
				<footer className='mt-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground'>
					<span className='flex items-center gap-1.5'>
						<Kbd shortcut='Mod+K' /> Command palette
					</span>
					<span className='flex items-center gap-1.5'>
						<Kbd shortcut='Alt+N' /> New project
					</span>
					<span className='flex items-center gap-1.5'>
						<Kbd shortcut='Mod+O' /> Open project
					</span>
				</footer>
			</motion.div>

			<NewProjectDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				defaultName={nextUntitledName()}
				onCreate={handleCreate}
			/>
		</div>
	);
};

export default NewProject;
