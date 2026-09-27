import React, { useContext } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { AppContext } from '@/AppContext';

/** App-wide toasts, styled with the design tokens. */
function Toaster(props: ToasterProps) {
	const { theme } = useContext(AppContext);

	return (
		<Sonner
			theme={theme === 'light' ? 'light' : 'dark'}
			position='bottom-center'
			offset={48}
			gap={8}
			toastOptions={{
				classNames: {
					toast:
						'!rounded-surface !border !border-border !bg-popover !text-popover-foreground !shadow-xl !shadow-black/20 !text-[13px] !py-2.5 !px-3 !gap-2.5',
					description: '!text-muted-foreground !text-xs',
					actionButton:
						'!rounded-control !bg-primary !text-primary-foreground !text-xs !h-6',
					cancelButton: '!rounded-control !bg-muted !text-xs !h-6',
				},
			}}
			{...props}
		/>
	);
}

export { Toaster };
