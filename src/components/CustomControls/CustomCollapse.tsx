import { IconChevronDown } from '@tabler/icons-react';
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
		<div>
			<button
				onClick={() => {
					setOpen(!open);
				}}
				className='group my-auto flex h-9 max-h-9 w-full select-none items-center border-b border-border px-2 text-muted-foreground transition-colors hover:text-foreground [&_label]:text-[13px] [&_label]:font-medium [&_svg]:size-3.5'
			>
				{menu}
				<div className='ml-auto'>
					<motion.div
						animate={{ rotate: open ? 0 : -90 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
					>
						<IconChevronDown size={12}></IconChevronDown>
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
						<div className='flex select-none flex-col gap-3 px-2 pb-3 pt-2.5'>
							{children}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
