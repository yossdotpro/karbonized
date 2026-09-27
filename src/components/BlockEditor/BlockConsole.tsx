import React, { useEffect, useRef } from 'react';
import { Ban, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/components/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export interface ConsoleEntry {
	id: number;
	level: ConsoleLevel;
	time: number;
	text: string;
}

const MAX_ENTRIES = 500;
let nextId = 0;

const formatValue = (value: unknown): string => {
	if (typeof value === 'string') return value;
	if (value instanceof Error) return `${value.name}: ${value.message}`;
	if (typeof Node !== 'undefined' && value instanceof Node) {
		return value instanceof Element
			? `<${value.tagName.toLowerCase()}>`
			: value.nodeName;
	}
	if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`;

	try {
		return JSON.stringify(value, null, 2) ?? String(value);
	} catch {
		return String(value);
	}
};

export const createConsoleEntry = (
	level: ConsoleLevel,
	args: unknown[],
): ConsoleEntry => ({
	id: nextId++,
	level,
	time: Date.now(),
	text: args.map(formatValue).join(' '),
});

export const appendConsoleEntry = (
	entries: ConsoleEntry[],
	entry: ConsoleEntry,
): ConsoleEntry[] => [...entries.slice(-(MAX_ENTRIES - 1)), entry];

/**
 * Whether an uncaught error or rejection came from a block script. Compiled
 * scripts are named with `scriptUrl`, which shows up as the error's file name
 * or in its stack.
 */
export const isBlockScriptError = (
	scriptUrl: string,
	reason: unknown,
	filename?: string,
): boolean => {
	if (filename?.includes(scriptUrl)) return true;

	const stack =
		reason instanceof Error
			? reason.stack
			: typeof reason === 'object' && reason !== null && 'stack' in reason
				? String((reason as { stack: unknown }).stack)
				: undefined;

	return stack?.includes(scriptUrl) ?? false;
};

/**
 * A `console` look-alike for user scripts: forwards to the real console and
 * reports every call so it can be shown in the block editor.
 */
export const createScriptConsole = (
	report: (entry: ConsoleEntry) => void,
): Console => {
	const levels: Record<string, ConsoleLevel> = {
		log: 'log',
		debug: 'log',
		info: 'info',
		warn: 'warn',
		error: 'error',
	};

	return new Proxy(console, {
		get(target, prop, receiver) {
			const level = typeof prop === 'string' ? levels[prop] : undefined;
			const original = Reflect.get(target, prop, receiver);

			if (!level || typeof original !== 'function') return original;

			return (...args: unknown[]) => {
				original.apply(target, ['[block]', ...args]);
				report(createConsoleEntry(level, args));
			};
		},
	});
};

const levelStyles: Record<
	ConsoleLevel,
	{ row: string; icon?: React.ComponentType<{ className?: string }> }
> = {
	log: { row: 'text-foreground/90' },
	info: { row: 'text-foreground/90', icon: Info },
	warn: {
		row: 'bg-amber-500/[0.06] text-amber-600 dark:text-amber-400',
		icon: TriangleAlert,
	},
	error: {
		row: 'bg-destructive/[0.07] text-destructive',
		icon: CircleX,
	},
};

interface BlockConsoleProps {
	entries: ConsoleEntry[];
	runtimeEnabled: boolean;
	onClear: () => void;
	onClose: () => void;
}

export const BlockConsole: React.FC<BlockConsoleProps> = ({
	entries,
	runtimeEnabled,
	onClear,
	onClose,
}) => {
	const listRef = useRef<HTMLDivElement>(null);
	const errors = entries.filter((entry) => entry.level === 'error').length;
	const warnings = entries.filter((entry) => entry.level === 'warn').length;

	// Keep the latest output in view.
	useEffect(() => {
		const list = listRef.current;
		if (list) list.scrollTop = list.scrollHeight;
	}, [entries]);

	return (
		<div className='flex h-full flex-col overflow-hidden bg-background'>
			<div className='flex h-8 shrink-0 items-center gap-3 border-b border-t border-border bg-sidebar pl-3 pr-1.5'>
				<span className='text-[11px] font-medium uppercase tracking-wider text-foreground'>
					Console
				</span>
				<span className='flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground'>
					<span className='flex items-center gap-1'>
						<CircleX
							className={cn('size-3', errors > 0 && 'text-destructive')}
						/>
						{errors}
					</span>
					<span className='flex items-center gap-1'>
						<TriangleAlert
							className={cn('size-3', warnings > 0 && 'text-amber-500')}
						/>
						{warnings}
					</span>
				</span>

				<div className='ml-auto flex items-center gap-0.5'>
					<Button
						variant='ghost'
						size='icon-sm'
						className='size-6 [&_svg]:size-3.5'
						onClick={onClear}
						aria-label='Clear console'
						title='Clear console'
					>
						<Ban />
					</Button>
					<Button
						variant='ghost'
						size='icon-sm'
						className='size-6 [&_svg]:size-3.5'
						onClick={onClose}
						aria-label='Close console'
						title='Close console'
					>
						<X />
					</Button>
				</div>
			</div>

			<div
				ref={listRef}
				className='min-h-0 flex-1 overflow-y-auto font-mono text-xs leading-5'
				role='log'
				aria-live='polite'
			>
				{entries.length === 0 ? (
					<div className='flex h-full flex-col items-center justify-center gap-1 px-6 text-center font-sans'>
						<p className='text-[13px] text-foreground'>No output</p>
						<p className='text-xs text-muted-foreground'>
							{runtimeEnabled ? (
								<>
									<code className='font-mono'>console.log</code> and{' '}
									<code className='font-mono'>htmlBlockAPI.log</code> calls from
									main.js appear here.
								</>
							) : (
								'Enable the JS runtime to run main.js.'
							)}
						</p>
						<p className='mt-1 flex items-center gap-1 text-[11px] text-muted-foreground'>
							Toggle with <Kbd shortcut='Mod+Shift+Y' />
						</p>
					</div>
				) : (
					entries.map((entry) => {
						const style = levelStyles[entry.level];
						const Icon = style.icon;

						return (
							<div
								key={entry.id}
								className={cn(
									'flex gap-2 border-b border-border/60 px-3 py-0.5',
									style.row,
								)}
							>
								<span className='flex w-3.5 shrink-0 items-start pt-[3px]'>
									{Icon && <Icon className='size-3.5' />}
								</span>
								<span className='min-w-0 flex-1 whitespace-pre-wrap break-words'>
									{entry.text}
								</span>
								<span className='shrink-0 tabular-nums text-muted-foreground/70'>
									{new Date(entry.time).toLocaleTimeString([], {
										hour12: false,
									})}
								</span>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};
