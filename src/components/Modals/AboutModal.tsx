import { ArrowUpRight } from 'lucide-react';
import {
	IconBrandGithub,
	IconBrandTelegram,
	IconBrandX,
} from '@tabler/icons-react';
import React from 'react';
import {
	Dialog,
	DialogBar,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import karbonized from '../../assets/logo.svg';
import { version } from '../../../package.json';

interface Props {
	open: boolean;
	onClose?: () => void;
}

const links = [
	{
		label: 'Source code',
		detail: 'github.com/yossthedev/karbonized',
		href: 'https://github.com/yossthedev/karbonized',
		icon: IconBrandGithub,
	},
	{
		label: 'Updates',
		detail: '@karbonized_app',
		href: 'https://twitter.com/karbonized_app',
		icon: IconBrandX,
	},
	{
		label: 'Community',
		detail: 't.me/karbonized',
		href: 'https://t.me/karbonized',
		icon: IconBrandTelegram,
	},
];

export const AboutModal: React.FC<Props> = ({ open, onClose }) => {
	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-sm'>
				<div className='flex items-center gap-3 pr-8'>
					<div className='flex size-11 shrink-0 items-center justify-center rounded-surface border border-border bg-card'>
						<img className='size-7' src={karbonized} alt='' />
					</div>
					<div className='min-w-0'>
						<div className='flex items-center gap-2'>
							<DialogTitle>Karbonized</DialogTitle>
							<span className='rounded-[4px] border border-border px-1 font-mono text-[10px] leading-4 text-muted-foreground'>
								v{version}
							</span>
						</div>
						<DialogDescription className='mt-1'>
							Image generator for code snippets and mockups
						</DialogDescription>
					</div>
				</div>

				<ul className='-mx-2 flex flex-col'>
					{links.map((link) => (
						<li key={link.href}>
							<a
								href={link.href}
								target='_blank'
								rel='noreferrer'
								className='group flex items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-accent'
							>
								<link.icon className='size-4 shrink-0 text-muted-foreground' />
								<span className='text-[13px] text-foreground'>
									{link.label}
								</span>
								<span className='ml-auto truncate text-xs text-muted-foreground'>
									{link.detail}
								</span>
								<ArrowUpRight className='size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
							</a>
						</li>
					))}
				</ul>

				<DialogBar className='justify-between text-xs text-muted-foreground'>
					<span>
						Made by{' '}
						<a
							target='_blank'
							className='text-foreground underline-offset-4 hover:underline'
							href='https://twitter.com/yossthedev'
							rel='noreferrer'
						>
							@yossthedev
						</a>
					</span>
					<span>Apache-2.0</span>
				</DialogBar>
			</DialogContent>
		</Dialog>
	);
};

export default AboutModal;
