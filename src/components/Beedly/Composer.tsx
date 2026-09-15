import React, { useRef, useState } from 'react';
import { ArrowUp, Check, ChevronDown, Settings2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBeedlyConversation } from '@/lib/beedly/conversation-store';
import {
	getActiveProfile,
	profileProblem,
	useBeedlySettings,
} from '@/lib/beedly/settings';
import { useBeedlyUI } from '@/lib/beedly/ui-store';

const MAX_TEXTAREA_HEIGHT = 200;

const ModelPicker: React.FC = () => {
	const profiles = useBeedlySettings((state) => state.profiles);
	const activeProfileId = useBeedlySettings((state) => state.activeProfileId);
	const setActiveProfile = useBeedlySettings((state) => state.setActiveProfile);
	const openSettings = useBeedlyUI((state) => state.openSettings);
	const active = getActiveProfile({ profiles, activeProfileId });

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					size='xs'
					className='min-w-0 max-w-[75%] justify-start text-muted-foreground'
				>
					<span className='truncate'>
						{active
							? `${active.name}${active.model ? ` · ${active.model}` : ''}`
							: 'No model'}
					</span>
					<ChevronDown className='shrink-0' />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' side='top' className='w-64'>
				{profiles.length > 0 && <DropdownMenuLabel>Model</DropdownMenuLabel>}
				{profiles.map((profile) => (
					<DropdownMenuItem
						key={profile.id}
						onSelect={() => setActiveProfile(profile.id)}
						className='flex items-center gap-2'
					>
						<span className='flex min-w-0 flex-col'>
							<span className='truncate text-[13px]'>{profile.name}</span>
							<span className='truncate font-mono text-[11px] text-muted-foreground'>
								{profile.model || 'No model selected'}
							</span>
						</span>
						{profile.id === active?.id && (
							<Check className='ml-auto size-3.5' />
						)}
					</DropdownMenuItem>
				))}
				{profiles.length > 0 && <DropdownMenuSeparator />}
				<DropdownMenuItem onSelect={() => openSettings('providers')}>
					<Settings2 />
					Manage providers…
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export const Composer: React.FC = () => {
	const [text, setText] = useState('');
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const running = useBeedlyConversation((state) => state.running);
	const send = useBeedlyConversation((state) => state.send);
	const stop = useBeedlyConversation((state) => state.stop);
	const openSettings = useBeedlyUI((state) => state.openSettings);

	const problem = useBeedlySettings((state) => {
		const profile = getActiveProfile(state);
		const hasKey =
			!state.keysChecked ||
			(profile !== undefined && state.profilesWithKey.includes(profile.id));
		return profileProblem(profile, hasKey);
	});

	const resize = (element: HTMLTextAreaElement) => {
		element.style.height = 'auto';
		element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
	};

	const submit = () => {
		if (running || problem || text.trim() === '') return;
		send(text);
		setText('');
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
		}
	};

	return (
		<div className='shrink-0 border-t border-border p-2'>
			{problem && (
				<div className='mb-2 flex items-center gap-2 rounded-control border border-border bg-background/60 px-2.5 py-1.5 text-[12px] text-muted-foreground'>
					<span className='min-w-0 flex-1'>{problem}</span>
					<Button
						variant='outline'
						size='xs'
						onClick={() => openSettings('providers')}
					>
						Open settings
					</Button>
				</div>
			)}

			<div className='rounded-surface border border-input bg-background transition-colors focus-within:border-ring'>
				<textarea
					ref={textareaRef}
					autoFocus
					rows={2}
					value={text}
					placeholder='Ask Beedly to design something…'
					aria-label='Message Beedly'
					className='block max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground'
					onChange={(event) => {
						setText(event.target.value);
						resize(event.target);
					}}
					onKeyDown={(event) => {
						if (
							event.key === 'Enter' &&
							!event.shiftKey &&
							!event.nativeEvent.isComposing
						) {
							event.preventDefault();
							submit();
						}
					}}
				/>
				<div className='flex items-center gap-1 px-1.5 pb-1.5'>
					<ModelPicker />
					<div className='ml-auto'>
						{running ? (
							<Button
								size='icon-sm'
								variant='secondary'
								onClick={stop}
								aria-label='Stop'
								title='Stop'
							>
								<Square className='size-3 fill-current' />
							</Button>
						) : (
							<Button
								size='icon-sm'
								onClick={submit}
								disabled={problem !== null || text.trim() === ''}
								aria-label='Send'
								title='Send (Enter)'
							>
								<ArrowUp />
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
