'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Toggle as TogglePrimitive } from 'radix-ui';

import { cn } from '@/components/lib/utils';

const toggleVariants = cva(
	"group/toggle inline-flex items-center justify-center gap-1 rounded-control text-[13px] font-medium whitespace-nowrap transition-colors outline-none text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-accent aria-pressed:text-foreground dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: 'bg-transparent',
				outline: 'border border-input bg-transparent hover:bg-accent',
			},
			size: {
				default:
					'h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
				sm: 'h-7 min-w-7 px-2 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
				lg: 'h-9 min-w-9 px-3 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

function Toggle({
	className,
	variant = 'default',
	size = 'default',
	...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
	VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive.Root
			data-slot='toggle'
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };
