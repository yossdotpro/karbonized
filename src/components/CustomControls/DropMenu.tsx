import {
	flip,
	offset,
	type Placement,
	shift,
	useFloating,
} from '@floating-ui/react-dom';
import React, {
	createContext,
	type ReactNode,
	useContext,
	useState,
} from 'react';
import { Portal } from 'react-portal';

interface Props {
	id?: string;
	show?: boolean;
	position?: Placement;
	label: string;
	menu: ReactNode;
	showOnEnter?: boolean;
}

const MenuContext = createContext({
	isOpen: false,
	setIsOpen: (value: boolean) => {},
	setIsInside: (value: boolean) => {},
});

export const DropMenu: React.FC<Props> = ({ id, position, label, menu }) => {
	const [show, setShow] = useState(false);
	const [isInside, setIsInside] = useState(false);

	const { x, y, reference, floating, strategy } = useFloating({
		middleware: [offset(4), shift(), flip()],
		placement: 'bottom-start',
	});

	return (
		<MenuContext.Provider
			value={{ isOpen: show, setIsOpen: setShow, setIsInside }}
		>
			<button
				className={`my-auto flex h-6 items-center rounded-[5px] px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${
					show && 'bg-accent text-foreground'
				}`}
				tabIndex={1}
				onBlur={() => {
					if (!isInside) {
						setShow(false);
					}
				}}
				onClick={() => {
					setShow(true);
				}}
				ref={reference}
			>
				<label className='my-auto text-xs hover:cursor-pointer '>{label}</label>
			</button>

			{show && (
				// @ts-ignore
				<Portal>
					<div
						id={id}
						tabIndex={1}
						onBlur={() => !isInside && setShow(false)}
						onMouseEnter={() => {
							setIsInside(true);
						}}
						onMouseLeave={() => {
							setIsInside(false);
						}}
						className='z-30 flex w-52 flex-auto flex-col gap-0.5 overflow-x-hidden rounded-surface border border-border bg-popover p-1 text-popover-foreground shadow-xl shadow-black/20'
						ref={floating}
						style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
					>
						{menu}
					</div>
				</Portal>
			)}
		</MenuContext.Provider>
	);
};

interface MenuItemProps {
	icon: ReactNode;
	label: string;
	shortcut?: string;
	click: () => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({
	icon,
	label,
	click,
	shortcut,
}) => {
	const { setIsOpen, setIsInside } = useContext(MenuContext);

	return (
		<button
			className='flex flex-auto cursor-pointer select-none rounded-[5px] px-2 py-1.5 text-[13px] text-foreground hover:bg-accent active:bg-accent'
			onMouseDown={() => {
				click();
				setIsOpen(false);
				setIsInside(false);
			}}
		>
			{icon}
			<p className='my-auto ml-2 hover:cursor-pointer'>{label}</p>

			<p className='my-auto ml-auto hover:cursor-pointer'>{shortcut}</p>
		</button>
	);
};

export const MenuSeparator: React.FC = () => {
	return <div className='mx-6 flex w-full rounded bg-muted/40 p-0.5'></div>;
};
