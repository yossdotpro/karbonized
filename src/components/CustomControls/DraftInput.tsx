import React, { useState } from 'react';
import { cn } from '@/components/lib/utils';

/**
 * A text field that commits on Enter or when it loses focus, not on every
 * key: each commit is one undo step and one re-render of the block. Escape
 * brings the value back. It follows the value when it changes elsewhere
 * (undo, the code editor, Agent).
 */
export const DraftInput: React.FC<
	Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
		value: string;
		onCommit: (value: string) => void;
		/** Called after Enter commits, e.g. to move on to the next field. */
		onEnter?: () => void;
	}
> = ({ value, onCommit, onEnter, className, onKeyDown, onBlur, ...props }) => {
	const [draft, setDraft] = useState(value);
	const [synced, setSynced] = useState(value);
	if (value !== synced) {
		setSynced(value);
		setDraft(value);
	}

	const commit = () => {
		if (draft !== value) onCommit(draft);
	};

	return (
		<input
			{...props}
			value={draft}
			onChange={(event) => setDraft(event.currentTarget.value)}
			onBlur={(event) => {
				commit();
				onBlur?.(event);
			}}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (event.key === 'Enter') {
					event.preventDefault();
					commit();
					onEnter?.();
				} else if (event.key === 'Escape') {
					setDraft(value);
					event.currentTarget.blur();
				}
			}}
			className={cn(
				'h-7 w-full min-w-0 rounded-control border border-input bg-transparent px-2 text-xs text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground hover:border-ring/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20',
				className,
			)}
		/>
	);
};
