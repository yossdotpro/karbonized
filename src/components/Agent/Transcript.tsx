import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, RotateCcw, TriangleAlert, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAgentConversation } from '@/lib/agent/conversation-store';
import { undo } from '@/lib/editor/history';
import { useHistoryStore } from '@/stores';
import {
	type AssistantPart,
	type TranscriptItem,
	buildTranscript,
} from '@/lib/agent/transcript';
import { Markdown } from './Markdown';
import { ToolCallCard } from './ToolCallCard';

const Reasoning: React.FC<{ text: string; active: boolean }> = ({
	text,
	active,
}) => {
	const [open, setOpen] = useState(false);

	return (
		<div className='text-[12px] text-muted-foreground'>
			<button
				type='button'
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
				className='flex items-center gap-1 hover:text-foreground'
			>
				<ChevronRight
					className={cn('size-3 transition-transform', open && 'rotate-90')}
				/>
				<span className={cn(active && 'animate-pulse')}>
					{active ? 'Thinking…' : 'Thought'}
				</span>
			</button>
			{open && (
				<p className='mt-1 border-l border-border pl-2 leading-relaxed whitespace-pre-wrap'>
					{text}
				</p>
			)}
		</div>
	);
};

const AssistantParts: React.FC<{
	parts: AssistantPart[];
	streaming: boolean;
}> = ({ parts, streaming }) => (
	<div className='flex flex-col gap-2'>
		{parts.map((part, index) => {
			const last = index === parts.length - 1;
			switch (part.type) {
				case 'text':
					return <Markdown key={index}>{part.text}</Markdown>;
				case 'reasoning':
					return (
						<Reasoning
							key={index}
							text={part.text}
							active={streaming && last}
						/>
					);
				case 'tool':
					return <ToolCallCard key={part.call.id} call={part.call} />;
			}
		})}
		{streaming && parts.length === 0 && (
			<span className='flex h-5 items-center gap-1' aria-label='Working'>
				{[0, 1, 2].map((dot) => (
					<span
						key={dot}
						className='size-1 animate-pulse rounded-full bg-muted-foreground'
						style={{ animationDelay: `${dot * 150}ms` }}
					/>
				))}
			</span>
		)}
	</div>
);

export const Transcript: React.FC = () => {
	const current = useAgentConversation((state) => state.current);
	const running = useAgentConversation(
		(state) =>
			state.running && state.runningConversationId === state.current.id,
	);
	const draft = useAgentConversation((state) => state.draft);
	const runningToolId = useAgentConversation((state) => state.runningToolId);
	const retry = useAgentConversation((state) => state.retry);
	const anyRunning = useAgentConversation((state) => state.running);
	const lastRun = useAgentConversation((state) => state.lastRun);
	const lastStep = useHistoryStore((state) => state.pastHistory.at(-1));
	// Offer to undo the response while its step is still the latest one.
	const canUndo =
		lastRun !== null &&
		lastRun.conversationId === current.id &&
		lastRun.entry === lastStep;

	const items = useMemo<TranscriptItem[]>(
		() =>
			buildTranscript(current.messages, current.toolMeta, {
				draft: running ? draft : null,
				runningToolId: running ? runningToolId : null,
			}),
		[current.messages, current.toolMeta, draft, running, runningToolId],
	);

	// A response without content yet still shows the working indicator.
	const lastItem = items[items.length - 1];
	const showPending = running && lastItem?.kind !== 'assistant';

	const scrollRef = useRef<HTMLDivElement>(null);
	const stickToBottom = useRef(true);

	useLayoutEffect(() => {
		const element = scrollRef.current;
		if (element && stickToBottom.current) {
			element.scrollTop = element.scrollHeight;
		}
	}, [items, current.error, showPending]);

	return (
		<div
			ref={scrollRef}
			onScroll={(event) => {
				const element = event.currentTarget;
				stickToBottom.current =
					element.scrollHeight - element.scrollTop - element.clientHeight < 48;
			}}
			className='min-h-0 flex-1 overflow-y-auto px-3 py-3'
		>
			<div className='flex flex-col gap-4'>
				{items.map((item, index) =>
					item.kind === 'user' ? (
						<div
							key={item.key}
							className='rounded-surface border border-border bg-background/60 px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words text-foreground'
						>
							{item.text}
						</div>
					) : (
						<AssistantParts
							key={item.key}
							parts={item.parts}
							streaming={running && index === items.length - 1}
						/>
					),
				)}

				{showPending && <AssistantParts parts={[]} streaming />}

				{current.error && !running && (
					<div className='flex flex-col gap-2 rounded-control border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-[12px] text-destructive'>
						<span className='flex items-start gap-1.5'>
							<TriangleAlert className='mt-px size-3.5 shrink-0' />
							<span className='break-words'>{current.error}</span>
						</span>
						<Button
							variant='outline'
							size='xs'
							className='self-start border-destructive/30 text-destructive hover:text-destructive'
							onClick={retry}
							disabled={anyRunning}
						>
							<RotateCcw />
							Retry
						</Button>
					</div>
				)}

				{!running && !current.error && lastItem?.kind === 'assistant' && (
					<div className='-mt-2 flex gap-1'>
						{canUndo && (
							<Button
								variant='ghost'
								size='xs'
								className='text-muted-foreground'
								onClick={() => undo()}
							>
								<Undo2 />
								Undo changes
							</Button>
						)}
						<Button
							variant='ghost'
							size='xs'
							className='text-muted-foreground'
							onClick={retry}
							disabled={anyRunning}
						>
							<RotateCcw />
							Retry
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
