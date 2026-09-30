import ReactMarkdown from 'react-markdown';
import React from 'react';
import { APP_CHANGELOG } from '@/lib/changelog';
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

interface Props {
	open: boolean;
	onClose?: () => void;
}

const markdownComponents = {
	h2: ({ children }: { children?: React.ReactNode }) => (
		<h2 className='sticky top-0 z-10 -mx-5 mt-5 border-b border-border bg-popover px-5 pb-1.5 pt-1 font-mono text-xs font-medium text-foreground first:mt-0'>
			{children}
		</h2>
	),
	ul: ({ children }: { children?: React.ReactNode }) => (
		<ul className='mt-2 flex flex-col gap-1'>{children}</ul>
	),
	li: ({ children }: { children?: React.ReactNode }) => (
		<li className='relative pl-3.5 text-[13px] leading-relaxed text-muted-foreground before:absolute before:left-0 before:top-[0.6em] before:size-1 before:rounded-full before:bg-border'>
			{children}
		</li>
	),
	p: ({ children }: { children?: React.ReactNode }) => (
		<p className='mt-2 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground'>
			{children}
		</p>
	),
};

export const ChangelogModal: React.FC<Props> = ({ open, onClose }) => {
	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='flex max-h-[80vh] flex-col overflow-hidden sm:max-w-xl'>
				<DialogHeader>
					<DialogTitle>Changelog</DialogTitle>
					<DialogDescription>What&apos;s new in Karbonized</DialogDescription>
				</DialogHeader>

				<DialogBody className='-mb-5 border-t border-border pb-5'>
					<ReactMarkdown components={markdownComponents}>
						{APP_CHANGELOG}
					</ReactMarkdown>
				</DialogBody>
			</DialogContent>
		</Dialog>
	);
};

export default ChangelogModal;
