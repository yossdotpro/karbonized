import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { SearchIcon } from 'lucide-react';

import { cn } from '@/components/lib/utils';

function Command({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			data-slot='command'
			className={cn(
				'flex h-full w-full flex-col overflow-hidden bg-popover text-popover-foreground',
				className,
			)}
			{...props}
		/>
	);
}

function CommandInput({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div
			data-slot='command-input-wrapper'
			className='flex h-12 items-center gap-2.5 border-b border-border px-4'
		>
			<SearchIcon className='size-4 shrink-0 text-muted-foreground' />
			<CommandPrimitive.Input
				data-slot='command-input'
				className={cn(
					'h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground',
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function CommandList({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			data-slot='command-list'
			className={cn(
				'max-h-[min(420px,60vh)] scroll-py-1 overflow-y-auto overflow-x-hidden p-1.5',
				className,
			)}
			{...props}
		/>
	);
}

function CommandEmpty(
	props: React.ComponentProps<typeof CommandPrimitive.Empty>,
) {
	return (
		<CommandPrimitive.Empty
			data-slot='command-empty'
			className='py-10 text-center text-[13px] text-muted-foreground'
			{...props}
		/>
	);
}

function CommandGroup({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot='command-group'
			className={cn(
				'overflow-hidden text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
				className,
			)}
			{...props}
		/>
	);
}

function CommandSeparator({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			data-slot='command-separator'
			className={cn('-mx-1.5 my-1 h-px bg-border', className)}
			{...props}
		/>
	);
}

function CommandItem({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			data-slot='command-item'
			className={cn(
				"relative flex h-9 cursor-default items-center gap-2.5 rounded-control px-2 text-[13px] text-foreground outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
};
