import React from 'react';
import { cn } from '@/components/lib/utils';
import {
	type ActivitySource,
	isSourceActive,
	useCanvasActivity,
} from '@/lib/agent/activity';
import { useAgentUI } from '@/lib/agent/ui-store';

const LABELS: Record<ActivitySource, string> = {
	agent: 'Agent is working on the canvas',
	mcp: 'An MCP client is working on the canvas',
};

/**
 * Shows that Agent or an MCP client is using the canvas: a moving glow around
 * the canvas area and a pill with the tool that runs. It lies over the canvas
 * without taking clicks, so the user can still look around, and it is outside
 * the workspace, so exports never include it.
 */
export const CanvasActivity: React.FC = () => {
	const agentWorking = useAgentUI((state) => state.working);
	const source = useCanvasActivity((state): ActivitySource | null =>
		isSourceActive(state, 'mcp')
			? 'mcp'
			: agentWorking || isSourceActive(state, 'agent')
				? 'agent'
				: null,
	);
	const tool = useCanvasActivity((state) =>
		source ? state.tool[source] : null,
	);

	// Keep the last label while it fades out.
	const [shown, setShown] = React.useState<ActivitySource>('agent');
	if (source && source !== shown) setShown(source);

	return (
		<div
			aria-hidden={source === null}
			className={cn(
				'canvas-activity pointer-events-none absolute inset-0 z-40 transition-opacity duration-500',
				source ? 'opacity-100' : 'opacity-0',
			)}
		>
			<div className='canvas-activity-glow' />
			<div className='canvas-activity-ring' />

			<div
				role='status'
				className={cn(
					'absolute left-1/2 top-3 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-popover/90 py-1 pl-2.5 pr-3 text-[12px] text-foreground shadow-lg shadow-black/20 backdrop-blur transition-transform duration-500',
					source ? 'translate-y-0' : '-translate-y-12',
				)}
			>
				<span className='canvas-activity-dot size-2 shrink-0 rounded-full bg-primary' />
				<span className='truncate font-medium'>{LABELS[shown]}</span>
				{tool && (
					<span className='truncate text-muted-foreground'>· {tool}</span>
				)}
			</div>
		</div>
	);
};

export default CanvasActivity;
