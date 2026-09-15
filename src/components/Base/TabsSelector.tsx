import React, { type ReactNode } from 'react';

interface Props {
	isActive: boolean;
	children: ReactNode;
	onClick: () => void;
	onDoubleClick?: () => void;
}

export const TabSelector: React.FC<Props> = ({
	isActive,
	children,
	onClick,
	onDoubleClick,
}) => {
	return (
		<button
			className={
				isActive
					? 'flex w-40 select-none rounded-control bg-muted/60 p-2 text-xs font-bold text-foreground md:max-h-full'
					: 'flex w-40 select-none rounded-control p-2 text-xs text-muted-foreground md:max-h-full'
			}
			onClick={onClick}
			onDoubleClick={onDoubleClick && onDoubleClick}
		>
			<div className='mx-auto my-auto'>{children}</div>
		</button>
	);
};
