import React from 'react';
import { Plug, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip } from '@/components/CustomControls/Tooltip';
import { runCommand, useCommandShortcut } from '@/lib/commands/registry';
import { useMcpStatus } from '@/lib/beedly/mcp/use-mcp-status';
import { useBeedlyUI } from '@/lib/beedly/ui-store';

const statusButtonClass =
	'h-5 gap-1 rounded-[4px] px-1.5 text-[11px] font-normal';

/** Opens and closes Beedly; shows when a response is in progress. */
export const BeedlyStatusButton: React.FC = () => {
	const open = useBeedlyUI((state) => state.panelOpen);
	const working = useBeedlyUI((state) => state.working);
	const shortcut = useCommandShortcut('view.toggle-beedly');

	return (
		<Tooltip
			message={
				working ? 'Beedly is working' : open ? 'Hide Beedly' : 'Show Beedly'
			}
			shortcut={shortcut}
			placement='top'
		>
			<Button
				variant='ghost'
				aria-pressed={open}
				className={cn(statusButtonClass, open && 'bg-accent text-foreground')}
				onClick={() => runCommand('view.toggle-beedly')}
			>
				<Sparkles className='size-3' />
				<span>Beedly</span>
				{working && (
					<span
						className='size-1.5 animate-pulse rounded-full bg-emerald-500'
						aria-label='Working'
					/>
				)}
			</Button>
		</Tooltip>
	);
};

const timeAgo = (timestamp: number) => {
	const minutes = Math.round((Date.now() - timestamp) / 60000);
	return minutes < 1 ? 'just now' : `${minutes} min ago`;
};

/** MCP server state (desktop app, while it is on); opens its settings. */
export const McpStatusIndicator: React.FC = () => {
	const status = useMcpStatus();
	if (!status?.enabled) return null;

	const message = status.error
		? `MCP server: ${status.error}`
		: status.running
			? `MCP server on ${status.url}${
					status.lastClientAt
						? ` · last request ${timeAgo(status.lastClientAt)}`
						: ''
				}`
			: 'MCP server starting…';

	return (
		<>
			<Tooltip message={message} placement='top'>
				<Button
					variant='ghost'
					className={statusButtonClass}
					aria-label={message}
					onClick={() => runCommand('beedly.mcp-settings')}
				>
					<Plug className='size-3' />
					<span>MCP</span>
					<span
						className={cn(
							'size-1.5 rounded-full',
							status.error
								? 'bg-destructive'
								: status.running
									? 'bg-emerald-500'
									: 'animate-pulse bg-muted-foreground',
						)}
					/>
				</Button>
			</Tooltip>
			<Separator orientation='vertical' className='h-3' />
		</>
	);
};
