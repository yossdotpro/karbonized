import { Clipboard } from '@capacitor/clipboard';
import { ArrowUpRight, Bitcoin, Check, Coins, Copy } from 'lucide-react';
import React, { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import qvapay from '../../assets/qvapay.svg';

interface Props {
	open: boolean;
	onClose?: () => void;
}

const wallets = [
	{
		id: 'btc',
		label: 'Bitcoin',
		address: 'bc1qwr6wltxvpvuqhx94lqjrdr090747yz9rw5mpec',
		icon: Bitcoin,
	},
	{
		id: 'doge',
		label: 'Dogecoin',
		address: 'DFUAWcJLiqYKmZydxFsowdsEZio5ue9JYC',
		icon: Coins,
	},
];

export const DonationsModal: React.FC<Props> = ({ open, onClose }) => {
	const [copied, setCopied] = useState<string | null>(null);

	const copyAddress = async (id: string, address: string) => {
		await Clipboard.write({ string: address });
		setCopied(id);
		setTimeout(
			() => setCopied((current) => (current === id ? null : current)),
			1600,
		);
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Support Karbonized</DialogTitle>
					<DialogDescription>
						Karbonized is free and open source. Donations help keep it going.
					</DialogDescription>
				</DialogHeader>

				<ul className='flex flex-col divide-y divide-border rounded-surface border border-border'>
					{wallets.map((wallet) => (
						<li key={wallet.id} className='flex items-center gap-3 px-3 py-2.5'>
							<wallet.icon className='size-4 shrink-0 text-muted-foreground' />
							<div className='min-w-0 flex-1'>
								<p className='text-[13px] text-foreground'>{wallet.label}</p>
								<p className='truncate font-mono text-[11px] text-muted-foreground'>
									{wallet.address}
								</p>
							</div>
							<Button
								variant='outline'
								size='sm'
								onClick={() => void copyAddress(wallet.id, wallet.address)}
								className='w-20 shrink-0'
							>
								{copied === wallet.id ? (
									<>
										<Check className='size-3.5' />
										Copied
									</>
								) : (
									<>
										<Copy className='size-3.5' />
										Copy
									</>
								)}
							</Button>
						</li>
					))}

					<li>
						<a
							href='https://qvapay.com/payme/yoannisgnw'
							target='_blank'
							rel='noreferrer'
							className='group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent'
						>
							<img className='size-4 shrink-0' src={qvapay} alt='' />
							<div className='min-w-0 flex-1'>
								<p className='text-[13px] text-foreground'>QvaPay</p>
								<p className='truncate text-[11px] text-muted-foreground'>
									qvapay.com/payme/yoannisgnw
								</p>
							</div>
							<ArrowUpRight className='size-3.5 shrink-0 text-muted-foreground' />
						</a>
					</li>
				</ul>
			</DialogContent>
		</Dialog>
	);
};

export default DonationsModal;
