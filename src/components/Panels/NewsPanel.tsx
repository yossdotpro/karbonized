import {
	IconBell,
	IconInfoCircle,
	IconLink,
	IconReload,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { isElectron } from '../../utils/isElectron';
import { Tooltip } from '../CustomControls/Tooltip';
import { motion } from 'framer-motion';

const NEWS_URL = 'https://karbon-apps.github.io/news/news.json';

export const NewsPanel: React.FC = () => {
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<any>(null);

	const loadNews = () =>
		fetch(NEWS_URL)
			.then((resp) => resp.json())
			.then((news) => setData(news || null))
			.catch((err) => console.log(err))
			.finally(() => setLoading(false));

	const handleFetch = () => {
		setLoading(true);
		void loadNews();
	};

	useEffect(() => {
		void loadNews();
	}, []);
	return (
		<div className='flex h-full w-full flex-col gap-1 p-2'>
			{/* Header */}
			<div className='flex w-full'>
				<div className='mb-2 flex w-fit gap-1 rounded-surface bg-muted px-3 py-0.5 md:ml-2'>
					<IconBell className='my-auto'></IconBell>
					<p className='borel-font mt-3 text-lg'>News</p>
				</div>

				<Tooltip className='ml-auto' message='Refresh'>
					<button
						onClick={handleFetch}
						className='inline-flex items-center justify-center transition-colors aspect-square rounded-full my-auto ml-auto h-6 hover:bg-accent'
					>
						<IconReload size={18}></IconReload>
					</button>
				</Tooltip>
			</div>

			<div className='flex h-full w-full flex-auto flex-col gap-2 overflow-auto'>
				{loading ? (
					<motion.div
						initial={{ opacity: '0' }}
						animate={{ opacity: '100%' }}
						className='mt-2 flex h-full w-full flex-col gap-4 overflow-hidden'
					>
						<div className='flex h-40 w-full animate-pulse rounded-2xl bg-slate-400/30 dark:bg-slate-400/10'></div>
						<div className='flex h-8 w-80 animate-pulse rounded-2xl bg-slate-400/30 dark:bg-slate-400/10'></div>

						<div className='flex h-40 w-full animate-pulse rounded-2xl bg-slate-400/30 dark:bg-slate-400/10'></div>
						<div className='flex h-8 w-44 animate-pulse rounded-2xl bg-slate-400/30 dark:bg-slate-400/10'></div>

						<div className='flex h-40 w-full animate-pulse rounded-2xl bg-slate-400/30 dark:bg-slate-400/10'></div>
						<div className='flex h-8 w-64 animate-pulse rounded-2xl bg-slate-400/30 dark:bg-slate-400/10'></div>
					</motion.div>
				) : (
					<>
						{data ? (
							<>
								{data.map((item: any, index: any) => (
									<div key={item.title} className='gap-2 p-2'>
										<img
											className='flex rounded-2xl'
											src={
												'https://karbon-apps.github.io/news/news/' + item.img
											}
										></img>
										<h2 className='mt-2 text-lg'>{item.title}</h2>
										<p className='mt-1 text-xs text-muted-foreground'>
											{item.description}
										</p>

										{item.link && (
											<a
												href={item.link}
												className='inline-flex items-center justify-center transition-colors mt-3 flex h-10 gap-3 overflow-hidden rounded-surface bg-muted p-0'
											>
												<div className='mx-auto my-auto flex gap-2'>
													<IconLink className=''></IconLink>

													<p className='my-auto flex w-40 cursor-pointer overflow-clip'>
														{item.link.length > 21
															? item.link.slice(0, 18) + '...'
															: item.link}
													</p>
												</div>
											</a>
										)}

										{index != data.length - 1 && (
											<div className='mx-auto my-4 h-1 w-5/6 rounded-full bg-muted/50 p-0.5'></div>
										)}
									</div>
								))}

								{isElectron() && (
									<div className='flex gap-2 p-1 text-muted-foreground'>
										<IconInfoCircle></IconInfoCircle>
										<p className='text-xs'>
											Some of this information may refer to new version of the
											app. Download the updates{' '}
											<a
												href='https://github.com/karbonized/releases/'
												className='link'
											>
												from here
											</a>
										</p>
									</div>
								)}
							</>
						) : (
							<p className='mx-auto my-auto text-xs text-muted-foreground'>
								No news at this time
							</p>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default NewsPanel;
