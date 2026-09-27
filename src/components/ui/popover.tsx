import * as React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';

import { cn } from '@/components/lib/utils';

function Popover({
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root data-slot='popover' {...props} />;
}

function PopoverTrigger({
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
	return <PopoverPrimitive.Trigger data-slot='popover-trigger' {...props} />;
}

function PopoverAnchor({
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
	return <PopoverPrimitive.Anchor data-slot='popover-anchor' {...props} />;
}

function PopoverContent({
	className,
	align = 'center',
	sideOffset = 6,
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				data-slot='popover-content'
				align={align}
				sideOffset={sideOffset}
				collisionPadding={8}
				className={cn(
					'z-50 w-64 rounded-surface border border-border bg-popover p-3 text-[13px] text-popover-foreground shadow-xl shadow-black/20 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
