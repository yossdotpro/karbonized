import * as React from 'react';

import { cn } from '@/components/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
	return (
		<input
			type={type}
			data-slot='input'
			className={cn(
				'h-8 w-full min-w-0 rounded-control border border-input bg-transparent px-2.5 py-1 text-[13px] transition-[color,box-shadow,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-[13px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
				type === 'file' &&
					'cursor-pointer py-0 pl-1 text-xs text-muted-foreground file:mr-2 file:h-6 file:cursor-pointer file:rounded-[4px] file:bg-accent file:px-2 file:text-xs file:font-medium file:text-foreground md:text-xs',
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
