import * as React from 'react';

import { cn } from '@/components/lib/utils';
import { shortcutKeys } from '@/lib/commands/shortcuts';

/** Renders a shortcut such as `Mod+Shift+Z` as individual key caps. */
function Kbd({
	shortcut,
	className,
}: {
	shortcut?: string | string[];
	className?: string;
}) {
	const first = Array.isArray(shortcut) ? shortcut[0] : shortcut;
	if (!first) return null;

	return (
		<span
			data-slot='kbd'
			className={cn('inline-flex items-center gap-0.5', className)}
		>
			{shortcutKeys(first).map((key, index) => (
				<kbd key={`${key}-${index}`} className='kbd'>
					{key}
				</kbd>
			))}
		</span>
	);
}

export { Kbd };
