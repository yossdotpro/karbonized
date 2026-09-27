import { KarbonizedLogoFlat } from '../Icons/Icons';

export const WizardHeader: React.FC = () => {
	return (
		<div className='flex h-fit w-full items-center justify-between border-b border-border p-4'>
			<div className='flex items-center gap-2'>
				<p className='text-lg text-foreground font-heading'>New Project</p>
			</div>

			<div className='flex items-center gap-2 rounded-full border-2 border-border px-3 py-2 shadow-sm'>
				<KarbonizedLogoFlat className='size-6 text-foreground dark:text-white' />
				<p className='font-brand text-base font-semibold text-foreground'>
					Karbonized
				</p>
			</div>
		</div>
	);
};
