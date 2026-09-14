/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-misused-promises */
import {
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
} from '@/components/ui/menubar';
import CryptoJS from 'crypto-js';
import FileSaver from 'file-saver';
import { toBlob, toPng } from 'html-to-image';
import React, { Suspense, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { type Project } from '../../types';
import {
	useWorkspaceStore,
	useControlsStore,
	useUIStore,
	useProjectStore,
} from '../../stores';
import { ExportImage, export_format } from '../../utils/Exporter';
import { getRandomNumber } from '../../utils/getRandom';
import { PROJECT_KEY } from '../../utils/secrets';
import {
	Eraser,
	FileJson,
	FilePlus2,
	FolderOpen,
	Heart,
	ImageDown,
	Info,
	PackagePlus,
	Plus,
	Save,
	ScrollText,
	Share2,
	SquareDashed,
} from 'lucide-react';
import {
	commandRegistry,
	runCommand,
	useCommandRegistryVersion,
	useCommands,
} from '@/lib/commands/registry';
import { shortcutLabel } from '@/lib/commands/shortcuts';
import TabBar from './TabBar';
import { Button } from '@/components/ui/button';

const AboutModal = React.lazy(async () => await import('../Modals/AboutModal'));
const ChangelogModal = React.lazy(
	async () => await import('../Modals/ChangelogModal'),
);
const DonationsModal = React.lazy(
	async () => await import('../Modals/DonationsModal'),
);
const PreviewModal = React.lazy(
	async () => await import('../Modals/PreviewModal'),
);
const ImportComponentsDialog = React.lazy(
	async () => await import('../Modals/ImportComponentsDialog'),
);

const mergeHistoryById = <T extends { id: string }>(
	current: T[],
	incoming: T[],
): T[] => {
	const byId = new Map(current.map((item) => [item.id, item]));
	incoming.forEach((item) => {
		byId.set(item.id, item);
	});
	return Array.from(byId.values());
};

export const MenuBar: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();

	// Check if we're in the editor
	const isEditor = location.pathname === '/editor';

	const [showAbout, setShowAbout] = useState(false);
	const [showPreview, setShowPreview] = useState(false);
	const [showChangelog, setShowChangelog] = useState(false);
	const [showDonations, setShowDonations] = useState(false);
	const [showImportComponents, setShowImportComponents] = useState(false);

	/* App Store */
	const ControlProperties = useControlsStore(
		(state) => state.ControlProperties,
	);
	const saveProject = useProjectStore((state) => state.saveProject);
	const loadProject = useProjectStore((state) => state.loadProject);

	const cleanWorkspace = useWorkspaceStore((state) => state.cleanWorkspace);
	const setCurrentWorkspace = useWorkspaceStore(
		(state) => state.setCurrentWorkspace,
	);
	const setIsExporting = useUIStore((state) => state.setIsExporting);

	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const currentWorkspaceID = useWorkspaceStore(
		(state) => state.currentWorkspaceID,
	);
	const workspaces = useWorkspaceStore((state) => state.workspaces);

	const exportImage = async (type: export_format) => {
		setIsExporting(true);
		await new Promise((resolve) => setTimeout(resolve, 100));
		ExportImage(
			currentWorkspace?.workspaceName ?? 'workspace',
			document.getElementById('workspace'),
			type,
		);
		setTimeout(() => setIsExporting(false), 500);
	};

	const handleShare = async () => {
		const element = document.getElementById('workspace');
		console.log('share');
		if (element != null) {
			setIsExporting(true);
			await new Promise((resolve) => setTimeout(resolve, 100));
			const newFile = await toBlob(element);
			setIsExporting(false);
			if (newFile != null) {
				const data = {
					files: [
						new File([newFile], 'image.png', {
							type: newFile.type,
						}),
					],
					title: 'Image',
					text: 'image',
				};

				try {
					await navigator.share(data);
				} catch (err) {
					console.log(err);
				}
			}
		}
	};

	const handleLoadProject = () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.kproject';
		input.addEventListener('change', (ev: any) => {
			const target = ev.target as HTMLInputElement;
			if (target.files && target.files.length > 0) {
				if ((target.files[0].name as string).endsWith('.kproject')) {
					const reader = new FileReader();
					reader.addEventListener('load', () => {
						try {
							const text = CryptoJS.AES.decrypt(
								reader.result as string,
								PROJECT_KEY,
							).toString(CryptoJS.enc.Utf8);
							const project = JSON.parse(text) as Project;

							if (project.properties !== null && project.workspace !== null) {
								const loadedProject = loadProject(project);

								useWorkspaceStore.setState((state) => ({
									...state,
									workspaces: [...state.workspaces, loadedProject.newWorkspace],
									currentWorkspaceID: loadedProject.workspaceId,
									currentWorkspace: loadedProject.newWorkspace,
								}));

								useControlsStore.setState((state) => ({
									...state,
									ControlProperties: mergeHistoryById(
										state.ControlProperties,
										loadedProject.initialProperties,
									),
									currentControlID: '',
								}));
							} else {
								alert('Please provide a valid Karbonized Project');
							}
						} catch (err) {
							alert('Invalid Project File');
						}
					});
					reader.readAsText(target.files[0]);
				} else {
					alert('Only Karbonized Projects are allowed');
				}
			}
		});
		input.click();
	};

	const handleSaveProject = async () => {
		const element = document.getElementById('workspace');

		if (element != null) {
			setIsExporting(true);
			await new Promise((resolve) => setTimeout(resolve, 100));
			const data = await toPng(element);
			setIsExporting(false);

			const project = { ...saveProject, thumb: data };

			const blob = new Blob(
				[CryptoJS.AES.encrypt(JSON.stringify(project), PROJECT_KEY).toString()],
				{
					type: 'text/plain;charset=utf-8',
				},
			);

			FileSaver.saveAs(
				blob,
				currentWorkspace?.workspaceName ?? 'workspace' + '.kproject',
			);
		}
	};

	const handleSaveAsJson = async () => {
		const element = document.getElementById('workspace');

		if (element) {
			setIsExporting(true);
			await new Promise((resolve) => setTimeout(resolve, 100));
			const data = await toPng(element);
			setIsExporting(false);

			const project = saveProject({
				currentWorkspace,
				currentWorkspaceID,
				controlProperties: ControlProperties,
			});

			if (project.workspace) {
				project.workspace.id = getRandomNumber().toString();
			}

			const blob = new Blob([JSON.stringify(project)], {
				type: 'text/plain;charset=utf-8',
			});

			FileSaver.saveAs(
				blob,
				currentWorkspace?.workspaceName ?? 'workspace' + '.json',
			);
		}
	};

	const handleNewWorkspace = () => {
		navigate('/new');
	};

	const handleCleanWorkspace = () => {
		cleanWorkspace();
	};

	// Re-render when commands (and their shortcuts) are registered elsewhere.
	useCommandRegistryVersion();
	const shortcut = (id: string) =>
		shortcutLabel(commandRegistry.get(id)?.shortcut);

	useCommands([
		{
			id: 'file.new-project',
			title: 'New project',
			group: 'File',
			icon: FilePlus2,
			shortcut: 'Alt+N',
			keywords: ['create', 'workspace', 'nuevo'],
			run: () => navigate('/new'),
		},
		{
			id: 'file.open',
			title: 'Open project…',
			group: 'File',
			icon: FolderOpen,
			shortcut: 'Mod+O',
			keywords: ['load', 'kproject'],
			run: handleLoadProject,
		},
		{
			id: 'file.save',
			title: 'Save project',
			group: 'File',
			icon: Save,
			shortcut: 'Mod+S',
			allowInInput: true,
			when: () => isEditor,
			run: () => void handleSaveProject(),
		},
		{
			id: 'file.save-template',
			title: 'Save project as template',
			group: 'File',
			icon: FileJson,
			when: () => isEditor,
			run: () => void handleSaveAsJson(),
		},
		{
			id: 'file.export',
			title: 'Export…',
			group: 'File',
			icon: ImageDown,
			shortcut: 'Mod+Shift+E',
			keywords: ['render', 'preview', 'download'],
			when: () => isEditor,
			run: () => setShowPreview(true),
		},
		...(
			[
				['png', 'PNG', export_format.png],
				['jpeg', 'JPEG', export_format.jpeg],
				['svg', 'SVG', export_format.svg],
			] as const
		).map(([id, label, format]) => ({
			id: `file.export-${id}`,
			title: `Export as ${label}`,
			group: 'File' as const,
			icon: ImageDown,
			keywords: ['download', 'image'],
			when: () => isEditor,
			run: () => void exportImage(format),
		})),
		{
			id: 'file.share',
			title: 'Share image',
			group: 'File',
			icon: Share2,
			when: () => isEditor,
			run: () => void handleShare(),
		},
		{
			id: 'file.import-components',
			title: 'Import components…',
			group: 'File',
			icon: PackagePlus,
			keywords: ['kcomponent', 'extension'],
			when: () => isEditor,
			run: () => setShowImportComponents(true),
		},
		{
			id: 'workspace.clean',
			title: 'Clear workspace',
			group: 'Workspaces',
			icon: Eraser,
			keywords: ['clean', 'reset', 'remove all'],
			when: () => isEditor,
			run: handleCleanWorkspace,
		},
		...workspaces.map((workspace) => ({
			id: `workspace.switch-${workspace.id}`,
			title: `Go to ${workspace.workspaceName}`,
			group: 'Workspaces' as const,
			icon: SquareDashed,
			keywords: ['switch', 'tab', 'workspace'],
			when: () =>
				isEditor &&
				useWorkspaceStore.getState().currentWorkspaceID !== workspace.id,
			run: () => setCurrentWorkspace(workspace.id),
		})),
		{
			id: 'help.changelog',
			title: 'Changelog',
			group: 'Help',
			icon: ScrollText,
			keywords: ['news', 'release', 'version'],
			run: () => setShowChangelog(true),
		},
		{
			id: 'help.donations',
			title: 'Support Karbonized',
			group: 'Help',
			icon: Heart,
			keywords: ['donate', 'donations'],
			run: () => setShowDonations(true),
		},
		{
			id: 'help.about',
			title: 'About Karbonized',
			group: 'Help',
			icon: Info,
			run: () => setShowAbout(true),
		},
	]);

	return (
		<>
			<div className='z-10 flex h-full min-w-0 items-center gap-1 overflow-hidden text-foreground'>
				<Menubar>
					{/* File */}
					<MenubarMenu>
						<MenubarTrigger>File</MenubarTrigger>
						<MenubarContent>
							<MenubarItem onClick={() => navigate('/new')}>
								New Project{' '}
								<MenubarShortcut>
									{shortcut('file.new-project')}
								</MenubarShortcut>
							</MenubarItem>

							<MenubarItem
								onClick={() => {
									handleLoadProject();
								}}
							>
								Load Project
								<MenubarShortcut>{shortcut('file.open')}</MenubarShortcut>
							</MenubarItem>

							<MenubarItem
								disabled={!isEditor}
								onClick={async () => {
									if (isEditor) await handleSaveProject();
								}}
							>
								Save Project
								<MenubarShortcut>{shortcut('file.save')}</MenubarShortcut>
							</MenubarItem>

							<MenubarItem
								disabled={!isEditor}
								onClick={async () => {
									if (isEditor) await handleSaveAsJson();
								}}
							>
								Save Project as Template
							</MenubarItem>

							<MenubarItem
								disabled={!isEditor}
								onClick={async () => {
									if (isEditor) setShowPreview(true);
								}}
							>
								Render
								<MenubarShortcut>{shortcut('file.export')}</MenubarShortcut>
							</MenubarItem>

							<MenubarSub>
								<MenubarSubTrigger disabled={!isEditor}>
									Export as
								</MenubarSubTrigger>
								<MenubarSubContent>
									<MenubarItem
										disabled={!isEditor}
										onClick={() => {
											if (isEditor) exportImage(export_format.png);
										}}
									>
										Export as PNG
									</MenubarItem>

									<MenubarItem
										disabled={!isEditor}
										onClick={() => {
											if (isEditor) exportImage(export_format.jpeg);
										}}
									>
										Export as JPEG
									</MenubarItem>

									<MenubarItem
										disabled={!isEditor}
										onClick={() => {
											if (isEditor) exportImage(export_format.svg);
										}}
									>
										Export as SVG
									</MenubarItem>
								</MenubarSubContent>
							</MenubarSub>

							<MenubarSeparator />
							<MenubarItem
								disabled={!isEditor}
								onClick={async () => {
									if (isEditor) await handleShare();
								}}
							>
								Share
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* Edit */}
					<MenubarMenu>
						<MenubarTrigger disabled={!isEditor}>Edit</MenubarTrigger>
						<MenubarContent>
							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									runCommand('edit.undo');
								}}
							>
								Undo
								<MenubarShortcut>{shortcut('edit.undo')}</MenubarShortcut>
							</MenubarItem>
							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									runCommand('edit.redo');
								}}
							>
								Redo
								<MenubarShortcut>{shortcut('edit.redo')}</MenubarShortcut>
							</MenubarItem>

							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									runCommand('edit.duplicate');
								}}
							>
								Duplicate
								<MenubarShortcut>{shortcut('edit.duplicate')}</MenubarShortcut>
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* Components */}
					<MenubarMenu>
						<MenubarTrigger disabled={!isEditor}>Components</MenubarTrigger>
						<MenubarContent>
							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									if (isEditor) setShowImportComponents(true);
								}}
							>
								Import Components
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* Workspace */}
					<MenubarMenu>
						<MenubarTrigger disabled={!isEditor}>Workspace</MenubarTrigger>
						<MenubarContent>
							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									if (isEditor) handleNewWorkspace();
								}}
							>
								New Workspace
								<MenubarShortcut>
									{shortcut('file.new-project')}
								</MenubarShortcut>
							</MenubarItem>
							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									if (isEditor) handleCleanWorkspace();
								}}
							>
								Clean Workspace
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* View */}
					<MenubarMenu>
						<MenubarTrigger disabled={!isEditor}>View</MenubarTrigger>
						<MenubarContent>
							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									runCommand('view.zoom-in');
								}}
							>
								Zoom In
								<MenubarShortcut>{shortcut('view.zoom-in')}</MenubarShortcut>
							</MenubarItem>

							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									runCommand('view.zoom-out');
								}}
							>
								Zoom Out
								<MenubarShortcut>{shortcut('view.zoom-out')}</MenubarShortcut>
							</MenubarItem>

							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									runCommand('view.zoom-reset');
								}}
							>
								Zoom Reset
								<MenubarShortcut>{shortcut('view.zoom-reset')}</MenubarShortcut>
							</MenubarItem>

							<MenubarSeparator></MenubarSeparator>

							<MenubarItem
								disabled={!isEditor}
								onClick={() => {
									runCommand('view.fit');
								}}
							>
								Center View
								<MenubarShortcut>{shortcut('view.fit')}</MenubarShortcut>
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* About */}
					<MenubarMenu>
						<MenubarTrigger>About</MenubarTrigger>
						<MenubarContent>
							<MenubarItem onClick={() => setShowDonations(true)}>
								Donations
							</MenubarItem>

							<MenubarItem onClick={() => setShowChangelog(true)}>
								Changelog
							</MenubarItem>

							<MenubarItem onClick={() => setShowAbout(true)}>
								About
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>
				</Menubar>

				{isEditor && <div className='mx-1.5 h-4 w-px shrink-0 bg-border' />}

				{isEditor && <TabBar></TabBar>}

				{isEditor && (
					<Button
						className='shrink-0'
						onClick={handleNewWorkspace}
						size={'icon-sm'}
						variant={'ghost'}
						aria-label='New workspace'
					>
						<Plus className='size-3.5'></Plus>
					</Button>
				)}
			</div>

			{showAbout && (
				<Suspense>
					<AboutModal
						open={showAbout}
						onClose={() => {
							setShowAbout(false);
						}}
					></AboutModal>
				</Suspense>
			)}

			{showPreview && (
				<Suspense>
					<PreviewModal
						onClose={() => {
							setShowPreview(false);
						}}
						open={showPreview}
					></PreviewModal>
				</Suspense>
			)}

			{showChangelog && (
				<Suspense>
					<ChangelogModal
						onClose={() => {
							setShowChangelog(false);
						}}
						open={showChangelog}
					></ChangelogModal>
				</Suspense>
			)}

			{showDonations && (
				<Suspense>
					<DonationsModal
						onClose={() => {
							setShowDonations(false);
						}}
						open={showDonations}
					></DonationsModal>
				</Suspense>
			)}

			{showImportComponents && (
				<Suspense>
					<ImportComponentsDialog
						open={showImportComponents}
						onOpenChange={setShowImportComponents}
						onAddToCanvas={() => {}}
					/>
				</Suspense>
			)}
		</>
	);
};

export default MenuBar;
