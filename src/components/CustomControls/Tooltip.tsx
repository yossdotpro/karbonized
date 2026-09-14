import type { Placement } from '@floating-ui/react-dom';
import React, { type ReactNode } from 'react';
import {
	Tooltip as TooltipRoot,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';

interface Props {
	message?: string;
	/** Shortcut shown as key caps, e.g. `Mod+B`. */
	shortcut?: string | string[];
	className?: string;
	children: ReactNode;
	placement?: Placement;
}

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';

/**
 * Simple message tooltip. Kept for its compact API; renders the shared Radix
 * tooltip so every tooltip in the app looks and behaves the same.
 */
export const Tooltip: React.FC<Props> = ({
	children,
	message,
	shortcut,
	className,
	placement = 'right',
}) => {
	const [side, align = 'center'] = placement.split('-') as [Side, Align?];

	if (!message) return <div className={className}>{children}</div>;

	return (
		<TooltipRoot>
			<TooltipTrigger asChild>
				<div className={className}>{children}</div>
			</TooltipTrigger>
			<TooltipContent side={side} align={align}>
				{message}
				{shortcut && <Kbd shortcut={shortcut} className='ml-1' />}
			</TooltipContent>
		</TooltipRoot>
	);
};
