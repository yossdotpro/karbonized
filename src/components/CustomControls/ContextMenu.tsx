import {
	flip,
	offset,
	type Placement,
	shift,
	useFloating,
} from '@floating-ui/react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import React, { type ReactNode, useState } from 'react';
import { Portal } from 'react-portal';

interface Props {
	show?: boolean;
	position?: Placement;
	children: ReactNode;
	menu: ReactNode;
	showOnEnter?: boolean;
}
export const ContextMenu: React.FC<Props> = ({
	children,
	position,
	menu,
	showOnEnter = false,
}) => {
	const { x, y, reference, floating, strategy } = useFloating({
		middleware: [offset(10), shift(), flip()],
		placement: position,
	});
	const [show, setShow] = useState(false);

	return (
		<>
			<div
				tabIndex={1}
				onBlur={() => {
					setShow(false);
				}}
				onMouseEnter={() => {
					setShow(true);
				}}
				ref={reference}
			>
				{children}
			</div>

			<AnimatePresence>
				{show && (
					// @ts-ignore
					<Portal>
						<motion.div
							tabIndex={1}
							onBlur={() => {
								setShow(false);
							}}
							initial={{ scale: 0.5, opacity: 0.94 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0, opacity: 0 }}
							className='z-50 flex w-52 flex-auto flex-col gap-0.5 rounded-surface border border-border bg-popover p-1 text-[13px] text-popover-foreground shadow-xl shadow-black/20'
							ref={floating}
							style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
							onMouseLeave={() => {
								setShow(false);
							}}
						>
							{menu}
						</motion.div>
					</Portal>
				)}
			</AnimatePresence>
		</>
	);
};
