import React, { Suspense, useEffect, useRef, useState } from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useLocation,
} from 'react-router-dom';
import './App.css';
import { AppContext } from './AppContext';
import { useScreenDirection } from './hooks/useScreenDirection';
import { useTheme } from './hooks/useTheme';
import './utils.css';
import { isElectron } from './utils/isElectron';
import { Spinner } from '@/components/ui/spinner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { KarbonizedLogoFlat } from './components/Icons/Icons';
import {
	CommandPalette,
	CommandPaletteTrigger,
	ShortcutManager,
} from './components/CommandPalette';
import { useSessionAutosave } from './lib/persistence/autosave';

const Editor = React.lazy(async () => await import('./pages/Editor'));
const NewProject = React.lazy(async () => await import('./pages/NewProject'));
const BlockEditor = React.lazy(async () => await import('./pages/BlockEditor'));
const TitleBar = React.lazy(
	async () => await import('./components/Base/TitleBar'),
);
const ContextualMenuBar = React.lazy(
	async () => await import('./components/Base/ContextualMenuBar'),
);

const AppShell: React.FC<{
	isHorizontal: boolean;
}> = ({ isHorizontal }) => {
	return (
		<>
			{isHorizontal ? (
				<>
					{isElectron() ? (
						Boolean(
							(window as any).electron.ipcRenderer.isLinuxOrWindows(),
						) && (
							<Suspense>
								<TitleBar></TitleBar>
							</Suspense>
						)
					) : (
						<header className='flex h-10 shrink-0 items-center gap-2 border-b border-border bg-sidebar pl-3 pr-2'>
							<Suspense>
								<KarbonizedLogoFlat className='size-4 shrink-0' />

								<ContextualMenuBar></ContextualMenuBar>
							</Suspense>

							<CommandPaletteTrigger className='ml-auto shrink-0' />
						</header>
					)}

					<div
						className='relative flex h-full w-full flex-auto overflow-hidden'
						id='body'
					>
						<Routes>
							<Route
								path='/new'
								element={
									<Suspense
										fallback={
											<div className='flex h-full w-full items-center justify-center'>
												<Spinner className='size-5 text-muted-foreground' />
											</div>
										}
									>
										<NewProject />
									</Suspense>
								}
							/>
							<Route
								path='/editor'
								element={
									<Suspense
										fallback={
											<div className='flex h-full w-full items-center justify-center'>
												<Spinner className='size-5 text-muted-foreground' />
											</div>
										}
									>
										<Editor />
									</Suspense>
								}
							/>
							<Route
								path='/block-editor'
								element={
									<Suspense
										fallback={
											<div className='flex h-full w-full items-center justify-center'>
												<Spinner className='size-5 text-muted-foreground' />
											</div>
										}
									>
										<BlockEditor />
									</Suspense>
								}
							/>
							<Route path='*' element={<Navigate to='/new' replace />} />
						</Routes>
					</div>
				</>
			) : (
				<div
					className='relative flex h-full w-full flex-auto flex-col overflow-hidden'
					id='body'
				>
					<p>Open In Desktop</p>
				</div>
			)}
		</>
	);
};

/** Waits for the previous session to be restored before showing the app. */
const SessionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { ready, restored } = useSessionAutosave();
	const location = useLocation();
	const [initialPath] = useState(() => location.pathname);
	const [landed, setLanded] = useState(false);

	useEffect(() => {
		if (ready && location.pathname === '/editor') setLanded(true);
	}, [ready, location.pathname]);

	if (!ready) {
		return (
			<div className='flex h-full w-full items-center justify-center'>
				<Spinner className='size-5 text-muted-foreground' />
			</div>
		);
	}

	// A restored session opens straight in the editor instead of "New project".
	if (
		restored &&
		!landed &&
		['/', '/new'].includes(initialPath) &&
		location.pathname !== '/editor'
	) {
		return <Navigate to='/editor' replace />;
	}

	return <>{children}</>;
};

const App: React.FC = () => {
	const [theme, toggleTheme] = useTheme();
	const isHorizontal = useScreenDirection();
	const viewerRef = useRef(null);

	return (
		<Router>
			<TooltipProvider delayDuration={400} skipDelayDuration={200}>
				<AppContext.Provider
					value={{
						viewerRef,
						theme,
						toggleTheme,
					}}
				>
					<div
						onContextMenu={(event) => {
							event.preventDefault();
						}}
						className='flex h-screen w-screen flex-auto flex-col overflow-hidden bg-background text-foreground'
					>
						<SessionGate>
							<AppShell isHorizontal={isHorizontal} />
						</SessionGate>
					</div>

					<ShortcutManager />
					<CommandPalette />
				</AppContext.Provider>
			</TooltipProvider>
		</Router>
	);
};

export default App;
