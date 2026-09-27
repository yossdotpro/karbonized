import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, type ReactNode } from 'react';

interface Props {
	isOpen?: boolean;
	menu?: ReactNode;
	children?: ReactNode;
}

export const CustomCollapse: React.FC<Props> = ({
	children,
	menu,
	isOpen = false,
}) => {
	const [open, setOpen] = useState(isOpen);

	return (
		<div className='border-b border-border'>
			<button
				type='button'
				aria-expanded={open}
				onClick={() => {
					setOpen(!open);
				}}
				className={`group my-auto flex h-9 max-h-9 w-full select-none items-center gap-2 px-2 transition-colors hover:text-foreground [&_label]:cursor-pointer [&_label]:text-xs [&_label]:font-medium [&_label]:text-current [&_svg]:size-3.5 [&_svg]:text-current [&>div]:text-current ${
					open ? 'text-foreground' : 'text-muted-foreground'
				}`}
			>
				{menu}
				<div className='ml-auto text-muted-foreground'>
					<motion.div
						animate={{ rotate: open ? 0 : -90 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
					>
						<ChevronDown size={12}></ChevronDown>
					</motion.div>
				</div>
			</button>
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.18, ease: 'easeOut' }}
						className='overflow-hidden'
					>
						<div className='flex select-none flex-col gap-2 px-2 pb-3 pt-0.5'>
							{children}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
