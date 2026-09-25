import React, { useState } from 'react';
import { Check, ChevronRight, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { editorTools } from '@/lib/agent/tools';
import { type ToolCallView, summarizeArgs } from '@/lib/agent/transcript';

const formatDuration = (ms: number) =>
	ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

const prettyJson = (value: unknown): string => {
	if (typeof value === 'string') {
		try {
			return JSON.stringify(JSON.parse(value), null, 2);
		} catch {
			return value;
		}
	}
	return JSON.stringify(value ?? {}, null, 2);
};

export const ToolCallCard: React.FC<{ call: ToolCallView }> = ({ call }) => {
	const [open, setOpen] = useState(false);
	const title =
		editorTools.find((tool) => tool.name === call.name)?.title ?? call.name;
	const summary = summarizeArgs(call.args);
	const pending = call.status === 'streaming' || call.status === 'running';

	return (
		<div
			className={cn(
				'overflow-hidden rounded-control border bg-background/40',
				call.status === 'error' ? 'border-destructive/30' : 'border-border',
			)}
		>
			<button
				type='button'
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
				className='flex h-7 w-full items-center gap-2 px-2 text-left text-[12px] transition-colors hover:bg-accent/60'
			>
				<span className='flex size-3.5 shrink-0 items-center justify-center'>
					{pending ? (
						<Spinner className='size-3' />
					) : call.status === 'error' ? (
						<CircleAlert className='size-3.5 text-destructive' />
					) : (
						<Check className='size-3.5 text-emerald-500' />
					)}
				</span>
				<span className='shrink-0 text-foreground'>{title}</span>
				{summary && (
					<span className='min-w-0 truncate font-mono text-[11px] text-muted-foreground'>
						{summary}
					</span>
				)}
				<span className='ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground'>
					{call.durationMs !== undefined && (
						<span className='tabular-nums'>
							{formatDuration(call.durationMs)}
						</span>
					)}
					<ChevronRight
						className={cn('size-3.5 transition-transform', open && 'rotate-90')}
					/>
				</span>
			</button>

			{open && (
				<div className='flex flex-col gap-2 border-t border-border px-2 py-2'>
					<div className='flex flex-col gap-1'>
						<span className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
							Arguments
						</span>
						<pre className='max-h-40 overflow-auto rounded-[4px] bg-muted/50 p-1.5 font-mono text-[11px] leading-relaxed text-foreground/80'>
							{prettyJson(call.argsText ?? call.args)}
						</pre>
					</div>

					{call.result && (
						<div className='flex flex-col gap-1'>
							<span className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
								{call.result.isError ? 'Error' : 'Result'}
							</span>
							{call.result.content.map((item, index) =>
								item.type === 'image' ? (
									<img
										key={index}
										src={`data:${item.mimeType};base64,${item.data}`}
										alt='Canvas snapshot'
										className='max-h-48 rounded-[4px] border border-border object-contain'
									/>
								) : (
									<pre
										key={index}
										className={cn(
											'max-h-48 overflow-auto rounded-[4px] bg-muted/50 p-1.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all',
											call.result?.isError
												? 'text-destructive'
												: 'text-foreground/80',
										)}
									>
										{prettyJson(item.text)}
									</pre>
								),
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
