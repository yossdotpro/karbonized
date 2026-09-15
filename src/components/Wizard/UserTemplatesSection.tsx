import { Spinner } from '@/components/ui/spinner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserTemplatesSectionProps {
	userTemplates: any[];
	loadingUserTemplates: boolean;
	current: any;
	setCurrent: (item: any) => void;
	onDeleteUserTemplate: (id: string) => void;
}

export const UserTemplatesSection: React.FC<UserTemplatesSectionProps> = ({
	userTemplates,
	loadingUserTemplates,
	current,
	setCurrent,
	onDeleteUserTemplate,
}) => {
	return (
		<>
			{!loadingUserTemplates ? (
				<div className='flex h-full w-full flex-row flex-wrap gap-4 overflow-auto'>
					{userTemplates?.length > 0 ? (
						userTemplates.map((item: any) => (
							<button
								key={item.workspace.id}
								onClick={() => {
									setCurrent(item);
								}}
								className={`relative flex h-fit w-fit min-w-fit flex-col rounded-2xl border-2 bg-muted p-2 transition-all active:scale-90 ${
									current?.workspace.id === item.workspace.id
										? 'border-border shadow-xl'
										: 'border-border'
								}`}
							>
								<img
									className='flex h-36 w-full rounded-2xl'
									src={item.thumb}
									alt={item.workspace.name}
								/>

								{current?.workspace.id === item.workspace.id && (
									<Button
										size='icon'
										variant='outline'
										className='absolute -left-1 -top-1 h-8 w-8 rounded-full border-none bg-muted'
										onClick={() => {
											onDeleteUserTemplate(item.workspace.id);
										}}
									>
										<X size={16} />
									</Button>
								)}
							</button>
						))
					) : (
						<p className='text-muted-foreground mx-auto my-auto text-center text-xs'>
							You haven&apos;t saved any template yet
						</p>
					)}
				</div>
			) : (
				<Spinner className='mx-auto my-auto size-5 text-muted-foreground' />
			)}
		</>
	);
};
