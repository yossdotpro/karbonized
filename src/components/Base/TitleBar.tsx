import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../../AppContext';
import './TitleBar.css';
import { Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { KarbonizedLogoFlat } from '../Icons/Icons';
import { ContextualMenuBar } from './ContextualMenuBar';
import { CommandPaletteTrigger } from '../CommandPalette';

export const TitleBar: React.FC = () => {
	const [maximized, setMaximized] = useState(false);
	const { theme, toggleTheme } = useContext(AppContext);

	useEffect(() => {
		(window as any).electron.ipcRenderer.on(
			'maximizedStatus',
			(
				event: any,
				isMaximized: boolean | ((prevState: boolean) => boolean),
			) => {
				setMaximized(isMaximized);
			},
		);
	}, []);

	return (
		<div
			id='titlebar'
			className='draggable z-1000 flex h-10 min-h-10 w-screen items-stretch border-b border-border bg-sidebar'
			onContextMenu={(e) => {
				e.preventDefault();
			}}
		>
			{/* Menu Bar */}
			<div className='not-draggable flex max-w-[80%] items-center gap-2 overflow-x-hidden pl-3'>
				<KarbonizedLogoFlat className='size-4 min-w-4' />

				<ContextualMenuBar></ContextualMenuBar>
			</div>

			{/* Actions */}
			<div className='not-draggable pointer-events-auto z-10 ml-auto flex items-stretch'>
				<CommandPaletteTrigger className='my-auto mr-2' />

				<Button
					size={'icon-sm'}
					variant={'ghost'}
					className='my-auto mr-2'
					onClick={() => {
						toggleTheme();
					}}
				>
					{theme === 'light' ? (
						<Moon className='size-3.5'></Moon>
					) : (
						<Sun className='size-3.5'></Sun>
					)}
				</Button>

				<button
					className='flex w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/70'
					onClick={() =>
						(window as any).electron.ipcRenderer.sendMessage('minimizeApp')
					}
				>
					<svg
						className='size-2.5'
						viewBox='0 0 412 41'
						version='1.1'
						xmlns='http://www.w3.org/2000/svg'
					>
						<path
							d='M0 0L412 0L412 41L0 41L0 0Z'
							id='Rectangle-2'
							fillRule='evenodd'
							fill='currentColor'
							stroke='none'
						/>
					</svg>
				</button>

				<button
					className='flex w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/70'
					onClick={() =>
						(window as any).electron.ipcRenderer.sendMessage('maximizeApp')
					}
				>
					{maximized ? (
						<svg
							className='size-2.5'
							width='412px'
							viewBox='0 0 412 416'
							version='1.1'
							xmlns='http://www.w3.org/2000/svg'
						>
							<path
								d='M371 0L412 0L412 416L0 416L0 -1.90735e-05L41 0L371 0ZM371 41L41 41L41 375L371 375L371 41Z'
								id='Rectangle-2-Union'
								fillRule='evenodd'
								fill='currentColor'
								stroke='none'
							/>
						</svg>
					) : (
						<svg
							className='size-2.5'
							viewBox='0 0 412 412.5'
							version='1.1'
							xmlns='http://www.w3.org/2000/svg'
						>
							<path
								d='M368 0.00012207L368 0L412 0L412 331L368 331L329 331L329 412L42.2462 412L42.2462 412.5L0.246216 412.5L0.246216 412L0 412L0 370L0.246212 370L0.246178 125L0 125L0 83.0001L81 83.0001L81 0.00012207L368 0.00012207ZM42.2462 125L42.2462 370L287 370L287 125L42.2462 125ZM287 83.0001L329 83.0001L329 125L329 288L368 288L368 41.0001L125 41.0001L125 83.0001L287 83.0001Z'
								id='Rectangle-2-Union'
								fillRule='evenodd'
								fill='currentColor'
								stroke='none'
							/>
						</svg>
					)}
				</button>

				<button
					className='group flex w-11 items-center justify-center text-muted-foreground hover:bg-[#e81123] hover:text-white active:bg-[#c50f1f]'
					onClick={() =>
						(window as any).electron.ipcRenderer.sendMessage('closeApp')
					}
				>
					<svg
						className='size-2.5'
						viewBox='0 0 411.34656 402.79956'
						version='1.1'
						xmlns='http://www.w3.org/2000/svg'
					>
						<path
							d='M27.5772 0L0 27.5772L179.385 206.962L11.1242 375.222L38.7013 402.8L206.962 234.539L372.645 400.222L400.222 372.645L234.539 206.962L411.347 30.1543L383.769 2.57716L206.962 179.385L27.5772 0Z'
							id='Rectangle-2-Union'
							fillRule='evenodd'
							fill='currentColor'
							stroke='none'
						/>
					</svg>
				</button>
			</div>
		</div>
	);
};

export default TitleBar;
