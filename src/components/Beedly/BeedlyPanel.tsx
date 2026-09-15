import React from 'react';
import {
	History,
	Settings2,
	Sparkles,
	SquarePen,
	Trash2,
	X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanel } from '@/components/ui/resizable';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/CustomControls/Tooltip';
import { useBeedlyConversation } from '@/lib/beedly/conversation-store';
import {
	getActiveProfile,
	profileProblem,
	useBeedlySettings,
} from '@/lib/beedly/settings';
import { useBeedlyUI } from '@/lib/beedly/ui-store';
import { Composer } from './Composer';
import { Transcript } from './Transcript';

const SUGGESTIONS = [
	'Create a TypeScript snippet on a soft gradient background',
	'Turn this into a 1080×1080 post and center everything',
	'Add a title above the code and align it',
	'Put a phone mockup next to the code',
];

const formatDate = (timestamp: number) => {
	const date = new Date(timestamp);
	const today = new Date();
	return date.toDateString() === today.toDateString()
		? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		: date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const HistoryMenu: React.FC = () => {
	const conversations = useBeedlyConversation((state) => state.conversations);
	const currentId = useBeedlyConversation((state) => state.current.id);
	const openConversation = useBeedlyConversation(
		(state) => state.openConversation,
	);
	const deleteConversation = useBeedlyConversation(
		(state) => state.deleteConversation,
	);

	return (
		<DropdownMenu>
			<Tooltip message='Chat history' placement='bottom'>
				<DropdownMenuTrigger asChild>
					<Button variant='ghost' size='icon-sm' aria-label='Chat history'>
						<History />
					</Button>
				</DropdownMenuTrigger>
			</Tooltip>
			<DropdownMenuContent
				align='end'
				className='max-h-80 w-72 overflow-y-auto'
			>
				<DropdownMenuLabel>Recent chats</DropdownMenuLabel>
				{conversations.length === 0 && (
					<p className='px-2 py-1.5 text-xs text-muted-foreground'>
						No saved chats yet.
					</p>
				)}
				{conversations.map((conversation) => (
					<DropdownMenuItem
						key={conversation.id}
						onSelect={() => void openConversation(conversation.id)}
						className='group/chat flex items-center gap-2'
					>
						<span
							className={`min-w-0 flex-1 truncate ${conversation.id === currentId ? 'font-medium text-foreground' : ''}`}
						>
							{conversation.title}
						</span>
						<span className='shrink-0 text-[11px] text-muted-foreground group-hover/chat:hidden'>
							{formatDate(conversation.updatedAt)}
						</span>
						<button
							type='button'
							aria-label={`Delete ${conversation.title}`}
							className='hidden shrink-0 text-muted-foreground group-hover/chat:block hover:text-destructive'
							onPointerDown={(event) => event.stopPropagation()}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								void deleteConversation(conversation.id);
							}}
						>
							<Trash2 className='size-3.5' />
						</button>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

const EmptyState: React.FC = () => {
	const send = useBeedlyConversation((state) => state.send);
	const ready = useBeedlySettings((state) => {
		const profile = getActiveProfile(state);
		const hasKey =
			!state.keysChecked ||
			(profile !== undefined && state.profilesWithKey.includes(profile.id));
		return profileProblem(profile, hasKey) === null;
	});

	return (
		<div className='flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-y-auto px-3 pb-3'>
			<div className='flex flex-col gap-1'>
				<span className='flex size-8 items-center justify-center rounded-control border border-border bg-background text-foreground'>
					<Sparkles className='size-4' />
				</span>
				<p className='mt-2 text-[13px] font-medium text-foreground'>
					Design with Beedly
				</p>
				<p className='text-[12px] leading-relaxed text-muted-foreground'>
					Describe what you want. Beedly edits the canvas for you, and you can
					undo everything it did in one step.
				</p>
			</div>
			<div className='flex flex-col gap-1'>
				{SUGGESTIONS.map((suggestion) => (
					<button
						key={suggestion}
						type='button'
						onClick={() => send(suggestion)}
						disabled={!ready}
						className='rounded-control border border-border px-2.5 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50'
					>
						{suggestion}
					</button>
				))}
			</div>
		</div>
	);
};

export const BeedlyPanel: React.FC = () => {
	const title = useBeedlyConversation((state) => state.current.title);
	const empty = useBeedlyConversation(
		(state) => state.current.messages.length === 0,
	);
	const newConversation = useBeedlyConversation(
		(state) => state.newConversation,
	);
	const setPanelOpen = useBeedlyUI((state) => state.setPanelOpen);
	const openSettings = useBeedlyUI((state) => state.openSettings);

	return (
		<ResizablePanel
			id='beedly'
			className='min-w-72'
			defaultSize={380}
			minSize={300}
			maxSize={640}
		>
			<section
				aria-label='Beedly'
				className='pointer-events-auto flex h-full w-full flex-col border-l border-border bg-sidebar text-foreground'
			>
				<header className='flex h-11 shrink-0 items-center gap-1 border-b border-border px-2'>
					<Sparkles className='mx-1 size-4 shrink-0 text-muted-foreground' />
					<span className='text-[13px] font-medium'>Beedly</span>
					{!empty && (
						<span className='min-w-0 truncate text-[12px] text-muted-foreground'>
							<span className='mx-1.5 text-border'>/</span>
							{title}
						</span>
					)}
					<div className='ml-auto flex shrink-0 items-center gap-0.5'>
						<Tooltip message='New chat' placement='bottom'>
							<Button
								variant='ghost'
								size='icon-sm'
								aria-label='New chat'
								onClick={newConversation}
							>
								<SquarePen />
							</Button>
						</Tooltip>
						<HistoryMenu />
						<Tooltip message='Beedly settings' placement='bottom'>
							<Button
								variant='ghost'
								size='icon-sm'
								aria-label='Beedly settings'
								onClick={() => openSettings()}
							>
								<Settings2 />
							</Button>
						</Tooltip>
						<Tooltip message='Close' shortcut='Mod+L' placement='bottom'>
							<Button
								variant='ghost'
								size='icon-sm'
								aria-label='Close Beedly'
								onClick={() => setPanelOpen(false)}
							>
								<X />
							</Button>
						</Tooltip>
					</div>
				</header>

				{empty ? <EmptyState /> : <Transcript />}
				<Composer />
			</section>
		</ResizablePanel>
	);
};

export default BeedlyPanel;
