import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Editor, { type OnMount } from '@monaco-editor/react';
import {
	ArrowLeft,
	Boxes,
	Braces,
	ChevronDown,
	ChevronRight,
	Circle,
	Code2,
	Eye,
	Files,
	FileCode2,
	Hash,
	Palette,
	Play,
	RefreshCw,
	Save,
	ShieldCheck,
	X,
	type LucideIcon,
} from 'lucide-react';
import { AppContext } from '@/AppContext';
import { cn } from '@/components/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useControlsStore, useWorkspaceStore } from '@/stores';
import {
	type CustomAction,
	scopeCSS,
	parseJavaScript,
	generateActionRegistrations,
	generateCompiledSource,
	updateCSSVariable,
	updateJSVariable,
	createSafeDOM,
	fileHandler,
	fileUtils,
} from '@/lib/blocks-api';
import {
	defaultHTMLContent,
	defaultCSSContent,
	defaultJSContent,
} from '@/lib/blocks-api/default-content';
import {
	EDITOR_THEME_DARK,
	EDITOR_THEME_LIGHT,
	registerEditorThemes,
} from '@/lib/theme/editor-theme';
import { stringifyKComponent } from '@/utils/kcomponentParser';
import { useHTMLBlockBindings } from '@/hooks/useHTMLBlockBindings';
import {
	HTMLBlockActionsControls,
	HTMLBlockCSSVariablesControls,
	HTMLBlockJSVariablesControls,
} from '@/components/Blocks/HTMLBlockBindingsPanel';
import { useCommands } from '@/lib/commands/registry';
import { shortcutLabel } from '@/lib/commands/shortcuts';

interface BlockEditorState {
	htmlContent: string;
	cssContent: string;
	jsContent: string;
	allowScriptExecution: boolean;
}

type CodeTab = 'html' | 'css' | 'js';
type PreviewTab = 'preview' | 'css' | 'js' | 'actions';

const IconButton: React.FC<{
	label: string;
	shortcut?: string;
	onClick: () => void;
	active?: boolean;
	className?: string;
	children: React.ReactNode;
}> = ({ label, shortcut, onClick, active, className, children }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button
				variant='ghost'
				size='icon-sm'
				onClick={onClick}
				aria-label={label}
				className={cn(
					'size-7 [&_svg]:size-3.5',
					active && 'bg-accent text-foreground',
					className,
				)}
			>
				{children}
			</Button>
		</TooltipTrigger>
		<TooltipContent side='bottom'>
			{label}
			{shortcut && <span className='kbd ml-1'>{shortcutLabel(shortcut)}</span>}
		</TooltipContent>
	</Tooltip>
);

const ActivityButton: React.FC<{
	label: string;
	shortcut?: string;
	icon: LucideIcon;
	active?: boolean;
	onClick: () => void;
}> = ({ label, shortcut, icon: Icon, active, onClick }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<button
				type='button'
				onClick={onClick}
				aria-label={label}
				className={cn(
					'relative flex h-10 w-full items-center justify-center text-muted-foreground transition-colors hover:text-foreground',
					active &&
						'text-foreground before:absolute before:inset-y-2 before:left-0 before:w-[2px] before:rounded-r before:bg-foreground',
				)}
			>
				<Icon className='size-[18px]' strokeWidth={1.6} />
			</button>
		</TooltipTrigger>
		<TooltipContent side='right'>
			{label}
			{shortcut && <span className='kbd ml-1'>{shortcutLabel(shortcut)}</span>}
		</TooltipContent>
	</Tooltip>
);

const SectionHeader: React.FC<{
	label: string;
	open: boolean;
	onToggle: () => void;
	trailing?: React.ReactNode;
}> = ({ label, open, onToggle, trailing }) => (
	<button
		type='button'
		onClick={onToggle}
		className='group flex h-6 w-full items-center gap-1 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground'
	>
		{open ? (
			<ChevronDown className='size-3.5' />
		) : (
			<ChevronRight className='size-3.5' />
		)}
		<span className='truncate'>{label}</span>
		{trailing && <span className='ml-auto'>{trailing}</span>}
	</button>
);

const EmptyState: React.FC<{ title: string; hint: React.ReactNode }> = ({
	title,
	hint,
}) => (
	<div className='flex flex-col items-center justify-center gap-1 px-6 py-10 text-center'>
		<p className='text-[13px] text-foreground'>{title}</p>
		<p className='text-xs leading-relaxed text-muted-foreground'>{hint}</p>
	</div>
);

const BlockEditor: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const shadowHostRef = useRef<HTMLDivElement>(null);
	const shadowRootRef = useRef<ShadowRoot | null>(null);
	const actionHandlersRef = useRef<Map<string, () => void>>(new Map());
	const { theme } = useContext(AppContext);
	const blockId =
		(location.state as { blockId?: string } | null)?.blockId ?? null;

	const [editorState, setEditorState] = useState<BlockEditorState>({
		htmlContent: defaultHTMLContent,
		cssContent: defaultCSSContent,
		jsContent: defaultJSContent,
		allowScriptExecution: false,
	});
	const [savedState, setSavedState] = useState<BlockEditorState>(editorState);

	const [activeTab, setActiveTab] = useState<CodeTab>('html');
	const [showPreview, setShowPreview] = useState(true);
	const [isDirty, setIsDirty] = useState(false);
	const [showExplorer, setShowExplorer] = useState(true);
	const [activePreviewTab, setActivePreviewTab] =
		useState<PreviewTab>('preview');
	const [openSections, setOpenSections] = useState({
		files: true,
		bindings: true,
	});
	const [cursor, setCursor] = useState({ line: 1, column: 1 });

	const ControlProperties = useControlsStore(
		(state) => state.ControlProperties,
	);
	const addControlProperty = useControlsStore(
		(state) => state.addControlProperty,
	);
	const currentWorkspaceID = useWorkspaceStore(
		(state) => state.currentWorkspaceID,
	);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const { cssVariables, jsVariables, customActions } = useHTMLBlockBindings(
		editorState.cssContent,
		editorState.jsContent,
	);

	const files = [
		{
			id: 'html' as const,
			label: 'index.html',
			language: 'html',
			languageLabel: 'HTML',
			iconClassName: 'text-[#e38b62]',
			content: editorState.htmlContent,
			saved: savedState.htmlContent,
		},
		{
			id: 'css' as const,
			label: 'styles.css',
			language: 'css',
			languageLabel: 'CSS',
			iconClassName: 'text-[#6fa8e8]',
			content: editorState.cssContent,
			saved: savedState.cssContent,
		},
		{
			id: 'js' as const,
			label: 'main.js',
			language: 'javascript',
			languageLabel: 'JavaScript',
			iconClassName: 'text-[#d9bd62]',
			content: editorState.jsContent,
			saved: savedState.jsContent,
		},
	];

	const activeFile = files.find((file) => file.id === activeTab) ?? files[0];
	const isFileDirty = (file: (typeof files)[number]) =>
		file.content !== file.saved;

	const bindings: Array<{
		id: Exclude<PreviewTab, 'preview'>;
		label: string;
		icon: LucideIcon;
		count: number;
	}> = [
		{
			id: 'css',
			label: 'CSS variables',
			icon: Palette,
			count: cssVariables.length,
		},
		{
			id: 'js',
			label: 'JS variables',
			icon: Braces,
			count: jsVariables.length,
		},
		{
			id: 'actions',
			label: 'Actions',
			icon: Boxes,
			count: customActions.length,
		},
	];

	const handleUpdateCSSVariable = (
		varName: string,
		newValue: string | number | boolean,
	) => {
		const nextCSS = updateCSSVariable(
			editorState.cssContent,
			varName,
			newValue,
			cssVariables,
		);
		setEditorState((previousState) => ({
			...previousState,
			cssContent: nextCSS,
		}));
		setIsDirty(true);
	};

	const handleUpdateJSVariable = (varName: string, newValue: any) => {
		const nextJS = updateJSVariable(
			editorState.jsContent,
			varName,
			newValue,
			jsVariables,
		);
		setEditorState((previousState) => ({
			...previousState,
			jsContent: nextJS,
		}));
		setIsDirty(true);
	};

	useEffect(() => {
		if (blockId) {
			const findProp = (suffix: string) =>
				ControlProperties.find((p) => p.id === `${blockId}-${suffix}`)?.value;

			const newState = {
				htmlContent: findProp('html') || defaultHTMLContent,
				cssContent: findProp('css') || defaultCSSContent,
				jsContent: findProp('js') || defaultJSContent,
				allowScriptExecution: findProp('allow-scripts') || false,
			};

			setEditorState(newState);
			setSavedState(newState);
			setTimeout(() => setIsDirty(false), 100);
		}
	}, [blockId, ControlProperties]);

	const createScopedDocument = (
		shadowRoot: ShadowRoot,
		host: HTMLDivElement,
	): Document & ShadowRoot => {
		const globalDocument = window.document;

		return new Proxy(globalDocument, {
			get(target, prop) {
				switch (prop) {
					case 'querySelector':
						return shadowRoot.querySelector.bind(shadowRoot);
					case 'querySelectorAll':
						return shadowRoot.querySelectorAll.bind(shadowRoot);
					case 'getElementById':
						return shadowRoot.getElementById?.bind(shadowRoot);
					case 'body':
						return shadowRoot;
					case 'head':
						return shadowRoot;
					case 'documentElement':
						return host;
					case 'activeElement':
						return shadowRoot.activeElement;
					case 'addEventListener':
						return shadowRoot.addEventListener.bind(shadowRoot);
					case 'removeEventListener':
						return shadowRoot.removeEventListener.bind(shadowRoot);
					case 'dispatchEvent':
						return shadowRoot.dispatchEvent.bind(shadowRoot);
					default:
						return Reflect.get(target, prop, target);
				}
			},
		}) as Document & ShadowRoot;
	};

	const updatePreview = () => {
		if (!shadowHostRef.current || !showPreview) return;

		if (!shadowRootRef.current) {
			shadowRootRef.current =
				shadowHostRef.current.shadowRoot ??
				shadowHostRef.current.attachShadow({
					mode: 'open',
				});
		}

		const shadowRoot = shadowRootRef.current;
		actionHandlersRef.current.clear();
		const scopedCSS = scopeCSS(editorState.cssContent, ':host');
		const processedCSS = `
		@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&family=Outfit:wght@100..900&display=swap');
		:host {
			display: block;
			font-family:'Noto Sans', sans-serif;
			font-weight: 400;
			all: initial;
			font-family: 'Noto Sans', sans-serif;
		}
		:host * { box-sizing: border-box; }
		${scopedCSS}
		`;

		shadowRoot.innerHTML = '';

		const styleElement = document.createElement('style');
		styleElement.textContent = processedCSS;
		shadowRoot.appendChild(styleElement);

		const container = document.createElement('div');
		container.style.display = 'flex';
		container.style.width = '100%';
		container.style.height = '100%';
		container.innerHTML = editorState.htmlContent;
		shadowRoot.appendChild(container);

		if (editorState.allowScriptExecution && editorState.jsContent.trim()) {
			try {
				const host = shadowHostRef.current;
				const scopedDocument = createScopedDocument(shadowRoot, host);
				const safeQuerySelector = (selector: string) => {
					try {
						return shadowRoot.querySelector(selector);
					} catch (error) {
						console.error('Error selecting element:', selector, error);
						return null;
					}
				};
				const safeDOM = createSafeDOM(shadowRoot);

				const htmlBlockAPI = {
					refresh: updatePreview,
					log: (message: unknown) => {
						console.log('Block Editor:', message);
					},
					warn: (message: unknown) => {
						console.warn('Block Editor:', message);
					},
					error: (message: unknown) => {
						console.error('Block Editor:', message);
					},
					host,
					root: container,
					shadowRoot,
					document: scopedDocument,
					globalDocument: window.document,
					registerAction: (actionId: string, handler: () => void) => {
						actionHandlersRef.current.set(actionId, handler);
						console.log(`Action registered: ${actionId}`);
					},
					safeDOM,
					uploadFile: fileHandler.uploadFile,
					removeFile: fileHandler.removeFile,
					getFile: fileHandler.getFile,
					getAllFiles: fileHandler.getAllFiles,
					clearFiles: fileHandler.clearFiles,
					validateFile: fileHandler.validateFile,
					convertToDataUrl: fileHandler.convertToDataUrl,
					optimizeImage: fileHandler.optimizeImage,
					fileUtils,
				};

				(
					window as Window & {
						htmlBlockAPI?: typeof htmlBlockAPI;
						safeQuerySelector?: typeof safeQuerySelector;
					}
				).htmlBlockAPI = htmlBlockAPI;
				(
					window as Window & {
						htmlBlockAPI?: typeof htmlBlockAPI;
						safeQuerySelector?: typeof safeQuerySelector;
					}
				).safeQuerySelector = safeQuerySelector;

				const parsedJavaScript = parseJavaScript(editorState.jsContent);
				const actionRegistrations = generateActionRegistrations(
					parsedJavaScript.actions,
				);
				const compiledSource = generateCompiledSource(
					parsedJavaScript,
					actionRegistrations,
				);

				const executeUserCode = new Function(
					'window',
					'console',
					'alert',
					compiledSource,
				);

				executeUserCode(window, console, window.alert.bind(window));
			} catch (error) {
				console.error('Error executing Block Editor script:', error);
			}
		}
	};

	useEffect(() => {
		const timeoutId = setTimeout(updatePreview, 400);
		return () => clearTimeout(timeoutId);
	}, [editorState, showPreview, activePreviewTab]);

	// The shadow root lives on the host element; a new host (after hiding the
	// preview or switching tabs) needs a fresh shadow root.
	useEffect(() => {
		shadowRootRef.current = null;
	}, [showPreview, activePreviewTab]);

	const handleSave = () => {
		if (blockId) {
			const props = [
				{ id: 'html', value: editorState.htmlContent },
				{ id: 'css', value: editorState.cssContent },
				{ id: 'js', value: editorState.jsContent },
				{ id: 'allow-scripts', value: editorState.allowScriptExecution },
			];

			props.forEach((prop) => {
				addControlProperty(
					{ id: `${blockId}-${prop.id}`, value: prop.value },
					currentWorkspaceID,
				);
			});

			setSavedState(editorState);
			setIsDirty(false);

			setTimeout(() => {
				import('@/stores').then((m) => {
					const { setControlState } = m.useHistoryStore.getState();

					props.forEach((prop) => {
						setControlState({ id: `${blockId}-${prop.id}`, value: prop.value });
					});

					navigate('/editor');
				});
			}, 100);
		}
	};

	const handleExportKComponent = () => {
		const componentName = (
			currentWorkspace?.workspaceName != null
				? `${currentWorkspace.workspaceName} Block`
				: (blockId ?? 'custom-block')
		).trim();

		const yamlContent = stringifyKComponent({
			manifest: {
				name: componentName,
				description: `Exported from block ${blockId ?? 'editor'} in Karbonized`,
				version: '1.0.0',
				category: 'HTML Blocks',
				tags: ['karbonized', 'html-block'],
			},
			html: editorState.htmlContent,
			css: editorState.cssContent,
			js: editorState.jsContent,
		});

		const filename = componentName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');

		const blob = new Blob([yamlContent], {
			type: 'text/yaml;charset=utf-8',
		});
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${filename || 'custom-block'}.kcomponent`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		window.URL.revokeObjectURL(url);
	};

	const executeCustomAction = (action: CustomAction) => {
		if (!editorState.allowScriptExecution) return;

		const handler = actionHandlersRef.current.get(action.id);
		if (handler != null) {
			handler();
			return;
		}

		updatePreview();
		setTimeout(() => {
			const refreshedHandler = actionHandlersRef.current.get(action.id);
			refreshedHandler?.();
		}, 50);
	};

	const toggleRuntime = (checked?: boolean) => {
		setEditorState((previousState) => ({
			...previousState,
			allowScriptExecution: checked ?? !previousState.allowScriptExecution,
		}));
		setIsDirty(true);
	};

	const openBinding = (tab: PreviewTab) => {
		setShowPreview(true);
		setActivePreviewTab(tab);
	};

	const codeTabs: Array<[CodeTab, string, string]> = [
		['html', 'Open index.html', 'Alt+1'],
		['css', 'Open styles.css', 'Alt+2'],
		['js', 'Open main.js', 'Alt+3'],
	];
	const panelTabs: Array<[PreviewTab, string, string | undefined]> = [
		['preview', 'Show preview', 'Alt+4'],
		['css', 'Show CSS variables', undefined],
		['js', 'Show JS variables', undefined],
		['actions', 'Show actions', undefined],
	];

	useCommands([
		{
			id: 'block.save',
			title: 'Save block and return to canvas',
			group: 'Block Editor',
			icon: Save,
			shortcut: 'Mod+S',
			allowInInput: true,
			when: () => blockId !== null,
			run: handleSave,
		},
		{
			id: 'block.refresh',
			title: 'Refresh preview',
			group: 'Block Editor',
			icon: RefreshCw,
			shortcut: 'Mod+Enter',
			allowInInput: true,
			keywords: ['run', 'reload'],
			run: () => {
				setShowPreview(true);
				updatePreview();
			},
		},
		{
			id: 'block.toggle-explorer',
			title: showExplorer ? 'Hide explorer' : 'Show explorer',
			group: 'Block Editor',
			icon: Files,
			shortcut: 'Mod+B',
			allowInInput: true,
			keywords: ['sidebar', 'files'],
			run: () => setShowExplorer((current) => !current),
		},
		{
			id: 'block.toggle-panel',
			title: showPreview ? 'Hide preview panel' : 'Show preview panel',
			group: 'Block Editor',
			icon: Eye,
			shortcut: 'Mod+J',
			allowInInput: true,
			run: () => setShowPreview((current) => !current),
		},
		{
			id: 'block.toggle-runtime',
			title: editorState.allowScriptExecution
				? 'Disable JS runtime'
				: 'Enable JS runtime',
			group: 'Block Editor',
			icon: editorState.allowScriptExecution ? ShieldCheck : Play,
			keywords: ['scripts', 'javascript', 'sandbox'],
			run: () => toggleRuntime(),
		},
		{
			id: 'block.export-component',
			title: 'Export as component',
			group: 'Block Editor',
			icon: Boxes,
			keywords: ['kcomponent', 'download'],
			run: handleExportKComponent,
		},
		...codeTabs.map(([tab, title, shortcut]) => ({
			id: `block.open-${tab}`,
			title,
			group: 'Block Editor' as const,
			icon: FileCode2,
			shortcut,
			allowInInput: true,
			run: () => setActiveTab(tab),
		})),
		...panelTabs.map(([tab, title, shortcut]) => ({
			id: `block.panel-${tab}`,
			title,
			group: 'Block Editor' as const,
			icon: tab === 'preview' ? Eye : tab === 'actions' ? Boxes : Palette,
			shortcut,
			allowInInput: true,
			run: () => openBinding(tab),
		})),
		{
			id: 'block.back',
			title: 'Back to canvas',
			group: 'Block Editor',
			icon: ArrowLeft,
			shortcut: 'Escape',
			keywords: ['close', 'exit'],
			run: () => navigate('/editor'),
		},
	]);

	const editorOptions = {
		wordWrap: 'on' as const,
		minimap: { enabled: false },
		fontSize: 13,
		lineHeight: 20,
		fontFamily:
			"'Geist Mono Variable', 'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
		fontLigatures: false,
		automaticLayout: true,
		scrollBeyondLastLine: false,
		padding: { top: 12, bottom: 12 },
		renderLineHighlight: 'line' as const,
		lineNumbers: 'on' as const,
		lineNumbersMinChars: 3,
		lineDecorationsWidth: 14,
		roundedSelection: false,
		glyphMargin: false,
		folding: true,
		showFoldingControls: 'mouseover' as const,
		tabSize: 2,
		smoothScrolling: true,
		cursorBlinking: 'smooth' as const,
		cursorSmoothCaretAnimation: 'on' as const,
		cursorWidth: 2,
		stickyScroll: { enabled: false },
		overviewRulerLanes: 0,
		hideCursorInOverviewRuler: true,
		guides: { indentation: true, bracketPairs: false },
		scrollbar: {
			verticalScrollbarSize: 10,
			horizontalScrollbarSize: 10,
			useShadows: false,
		},
	};

	const currentMonacoTheme =
		theme === 'dark' ? EDITOR_THEME_DARK : EDITOR_THEME_LIGHT;

	const handleEditorMount: OnMount = (editor, monaco) => {
		editor.onDidChangeCursorPosition((event) => {
			setCursor({
				line: event.position.lineNumber,
				column: event.position.column,
			});
		});

		// Geist Mono is loaded through CSS; re-measure once it is ready so the
		// cursor and selections line up with the glyphs.
		document.fonts?.ready.then(() => monaco.editor.remeasureFonts());
	};

	const handleFileChange = (nextValue: string) => {
		setEditorState((previousState) => ({
			...previousState,
			...(activeTab === 'html' && { htmlContent: nextValue }),
			...(activeTab === 'css' && { cssContent: nextValue }),
			...(activeTab === 'js' && { jsContent: nextValue }),
		}));
		setIsDirty(true);
	};

	const previewTabs: Array<{ id: PreviewTab; label: string; count?: number }> =
		[
			{ id: 'preview', label: 'Preview' },
			{ id: 'css', label: 'CSS', count: cssVariables.length },
			{ id: 'js', label: 'JS', count: jsVariables.length },
			{ id: 'actions', label: 'Actions', count: customActions.length },
		];

	return (
		<TooltipProvider delayDuration={400}>
			<div className='flex h-full w-full flex-col overflow-hidden bg-background text-foreground'>
				<div className='flex min-h-0 flex-1 overflow-hidden'>
					{/* Activity bar */}
					<nav className='flex w-11 shrink-0 flex-col items-center border-r border-border bg-sidebar py-1'>
						<ActivityButton
							label='Explorer'
							shortcut='Mod+B'
							icon={Files}
							active={showExplorer}
							onClick={() => setShowExplorer((current) => !current)}
						/>
						<ActivityButton
							label='Preview'
							shortcut='Mod+J'
							icon={Eye}
							active={showPreview && activePreviewTab === 'preview'}
							onClick={() =>
								showPreview && activePreviewTab === 'preview'
									? setShowPreview(false)
									: openBinding('preview')
							}
						/>
						<ActivityButton
							label='Bindings'
							icon={Palette}
							active={showPreview && activePreviewTab !== 'preview'}
							onClick={() =>
								showPreview && activePreviewTab !== 'preview'
									? setShowPreview(false)
									: openBinding('css')
							}
						/>

						<div className='mt-auto w-full'>
							<ActivityButton
								label='Back to canvas'
								shortcut='Escape'
								icon={ArrowLeft}
								onClick={() => navigate('/editor')}
							/>
						</div>
					</nav>

					{/* Explorer */}
					{showExplorer && (
						<aside className='flex w-60 shrink-0 flex-col border-r border-border bg-sidebar'>
							<div className='flex h-9 shrink-0 items-center justify-between pl-3 pr-1.5'>
								<span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
									Explorer
								</span>
								<IconButton
									label='Close explorer'
									shortcut='Mod+B'
									onClick={() => setShowExplorer(false)}
								>
									<X />
								</IconButton>
							</div>

							<div className='min-h-0 flex-1 overflow-y-auto pb-2'>
								<SectionHeader
									label={blockId ?? 'html-block'}
									open={openSections.files}
									onToggle={() =>
										setOpenSections((s) => ({ ...s, files: !s.files }))
									}
								/>
								{openSections.files && (
									<ul className='mb-2'>
										{files.map((file) => {
											const isActive = file.id === activeTab;
											const dirty = isFileDirty(file);

											return (
												<li key={file.id}>
													<button
														type='button'
														onClick={() => setActiveTab(file.id)}
														className={cn(
															'group flex h-6 w-full items-center gap-1.5 pl-6 pr-3 text-left text-[13px] transition-colors',
															isActive
																? 'bg-accent text-foreground'
																: 'text-muted-foreground hover:bg-muted hover:text-foreground',
														)}
													>
														<FileCode2
															className={cn(
																'size-3.5 shrink-0',
																file.iconClassName,
															)}
														/>
														<span className='truncate'>{file.label}</span>
														{dirty && (
															<Circle className='ml-auto size-2 shrink-0 fill-current text-muted-foreground' />
														)}
													</button>
												</li>
											);
										})}
									</ul>
								)}

								<SectionHeader
									label='Bindings'
									open={openSections.bindings}
									onToggle={() =>
										setOpenSections((s) => ({ ...s, bindings: !s.bindings }))
									}
								/>
								{openSections.bindings && (
									<ul>
										{bindings.map((binding) => {
											const isActive =
												showPreview && activePreviewTab === binding.id;

											return (
												<li key={binding.id}>
													<button
														type='button'
														onClick={() => openBinding(binding.id)}
														className={cn(
															'flex h-6 w-full items-center gap-1.5 pl-6 pr-3 text-left text-[13px] transition-colors',
															isActive
																? 'bg-accent text-foreground'
																: 'text-muted-foreground hover:bg-muted hover:text-foreground',
														)}
													>
														<binding.icon className='size-3.5 shrink-0' />
														<span className='truncate'>{binding.label}</span>
														<span className='ml-auto font-mono text-[11px] tabular-nums text-muted-foreground'>
															{binding.count}
														</span>
													</button>
												</li>
											);
										})}
									</ul>
								)}
							</div>

							<div className='shrink-0 border-t border-border px-3 py-2 text-[11px] leading-5 text-muted-foreground'>
								<p className='truncate'>
									<span className='text-muted-foreground/70'>Workspace </span>
									{currentWorkspace?.workspaceName ?? '—'}
								</p>
								<p className='truncate font-mono'>{blockId ?? 'detached'}</p>
							</div>
						</aside>
					)}

					<ResizablePanelGroup
						orientation='horizontal'
						className='min-w-0 flex-1'
					>
						{/* Editor group */}
						<ResizablePanel id='block-editor-code' minSize='30'>
							<section className='flex h-full min-w-0 flex-col overflow-hidden'>
								{/* Tabs */}
								<div className='flex h-9 shrink-0 items-stretch border-b border-border bg-sidebar'>
									<div className='flex min-w-0 items-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none]'>
										{files.map((file) => {
											const isActive = file.id === activeTab;
											const dirty = isFileDirty(file);

											return (
												<button
													key={file.id}
													type='button'
													onClick={() => setActiveTab(file.id)}
													className={cn(
														'group relative flex items-center gap-1.5 border-r border-border px-3 text-[13px] transition-colors',
														isActive
															? 'bg-background text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-background'
															: 'text-muted-foreground hover:text-foreground',
													)}
												>
													<FileCode2
														className={cn('size-3.5', file.iconClassName)}
													/>
													<span className='whitespace-nowrap'>
														{file.label}
													</span>
													<span className='flex size-4 items-center justify-center'>
														{dirty ? (
															<Circle className='size-2 fill-current text-muted-foreground' />
														) : (
															<X
																className={cn(
																	'size-3 opacity-0',
																	isActive && 'opacity-40',
																)}
															/>
														)}
													</span>
												</button>
											);
										})}
									</div>

									<div className='ml-auto flex shrink-0 items-center gap-0.5 px-1.5'>
										<IconButton
											label={showPreview ? 'Hide preview' : 'Show preview'}
											shortcut='Mod+J'
											active={showPreview}
											onClick={() => setShowPreview((current) => !current)}
										>
											<Eye />
										</IconButton>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size='xs'
													onClick={handleSave}
													disabled={!blockId}
													className='ml-1 h-6 gap-1.5 px-2'
												>
													<Save className='size-3' />
													Save
												</Button>
											</TooltipTrigger>
											<TooltipContent side='bottom'>
												Save and return to canvas
												<span className='kbd ml-1'>
													{shortcutLabel('Mod+S')}
												</span>
											</TooltipContent>
										</Tooltip>
									</div>
								</div>

								{/* Breadcrumbs */}
								<div className='flex h-6 shrink-0 items-center gap-1 px-3 text-xs text-muted-foreground'>
									<span className='truncate'>{blockId ?? 'html-block'}</span>
									<ChevronRight className='size-3 shrink-0 opacity-60' />
									<FileCode2
										className={cn('size-3 shrink-0', activeFile.iconClassName)}
									/>
									<span className='truncate text-foreground/80'>
										{activeFile.label}
									</span>
								</div>

								{/* Monaco */}
								<div className='relative min-h-0 flex-1'>
									<Editor
										path={activeFile.label}
										language={activeFile.language}
										theme={currentMonacoTheme}
										value={activeFile.content}
										options={editorOptions}
										beforeMount={registerEditorThemes}
										onMount={handleEditorMount}
										onChange={(value) => handleFileChange(value || '')}
										loading={
											<span className='text-xs text-muted-foreground'>
												Loading editor…
											</span>
										}
									/>
								</div>
							</section>
						</ResizablePanel>

						{showPreview && (
							<>
								<ResizableHandle className='bg-border' />
								<ResizablePanel
									id='block-editor-preview'
									defaultSize='38'
									minSize={300}
									maxSize='65'
								>
									<aside className='flex h-full flex-col overflow-hidden bg-sidebar'>
										{/* Panel tabs */}
										<div className='flex h-9 shrink-0 items-stretch border-b border-border pl-1 pr-1.5'>
											{previewTabs.map((tab) => {
												const isActive = activePreviewTab === tab.id;

												return (
													<button
														key={tab.id}
														type='button'
														onClick={() => setActivePreviewTab(tab.id)}
														className={cn(
															'relative flex items-center gap-1.5 px-2.5 text-xs font-medium uppercase tracking-wide transition-colors',
															isActive
																? 'text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-foreground'
																: 'text-muted-foreground hover:text-foreground',
														)}
													>
														{tab.label}
														{tab.count !== undefined && tab.count > 0 && (
															<span className='rounded-[4px] bg-accent px-1 font-mono text-[10px] leading-4 text-muted-foreground'>
																{tab.count}
															</span>
														)}
													</button>
												);
											})}

											<div className='ml-auto flex items-center gap-0.5'>
												<IconButton
													label='Refresh preview'
													shortcut='Mod+Enter'
													onClick={updatePreview}
												>
													<RefreshCw />
												</IconButton>
												<IconButton
													label='Close panel'
													shortcut='Mod+J'
													onClick={() => setShowPreview(false)}
												>
													<X />
												</IconButton>
											</div>
										</div>

										{/* Runtime toolbar */}
										<div className='flex h-8 shrink-0 items-center justify-between border-b border-border px-3 text-xs text-muted-foreground'>
											<span className='flex items-center gap-1.5'>
												{editorState.allowScriptExecution ? (
													<Play className='size-3 text-emerald-500' />
												) : (
													<ShieldCheck className='size-3' />
												)}
												{editorState.allowScriptExecution
													? 'Scripts running'
													: 'Scripts disabled'}
											</span>
											<label className='flex cursor-pointer items-center gap-2'>
												JS runtime
												<Switch
													checked={editorState.allowScriptExecution}
													onCheckedChange={(checked) => toggleRuntime(checked)}
												/>
											</label>
										</div>

										{activePreviewTab === 'preview' && (
											<div className='canvas-grid min-h-0 flex-1 overflow-auto'>
												<div className='flex min-h-full items-center justify-center p-6'>
													<div className='relative inline-flex max-w-full rounded-[4px] outline outline-1 outline-dashed outline-border'>
														<span className='absolute -top-5 left-0 font-mono text-[10px] text-muted-foreground'>
															{blockId ?? 'html-block'}
														</span>
														<div
															ref={shadowHostRef}
															className='inline-flex min-h-[200px] min-w-[200px] bg-transparent'
														/>
													</div>
												</div>
											</div>
										)}

										{activePreviewTab !== 'preview' && (
											<div className='min-h-0 flex-1 overflow-y-auto'>
												{activePreviewTab === 'css' &&
													(cssVariables.length > 0 ? (
														<div className='p-3'>
															<HTMLBlockCSSVariablesControls
																variables={cssVariables}
																onUpdateVariable={handleUpdateCSSVariable}
															/>
														</div>
													) : (
														<EmptyState
															title='No CSS variables'
															hint={
																<>
																	Declare custom properties in{' '}
																	<code className='font-mono'>styles.css</code>{' '}
																	to edit them here.
																</>
															}
														/>
													))}

												{activePreviewTab === 'js' &&
													(jsVariables.length > 0 ? (
														<div className='p-3'>
															<HTMLBlockJSVariablesControls
																variables={jsVariables}
																onUpdateVariable={handleUpdateJSVariable}
															/>
														</div>
													) : (
														<EmptyState
															title='No JS variables'
															hint={
																<>
																	Export variables from{' '}
																	<code className='font-mono'>main.js</code> to
																	edit them here.
																</>
															}
														/>
													))}

												{activePreviewTab === 'actions' &&
													(customActions.length > 0 ? (
														<div className='p-3'>
															{!editorState.allowScriptExecution && (
																<p className='mb-3 text-xs text-muted-foreground'>
																	Enable the JS runtime to run actions.
																</p>
															)}
															<HTMLBlockActionsControls
																actions={customActions}
																allowScriptExecution={
																	editorState.allowScriptExecution
																}
																onExecuteAction={executeCustomAction}
															/>
														</div>
													) : (
														<EmptyState
															title='No actions'
															hint='Register actions in main.js to trigger them from here.'
														/>
													))}
											</div>
										)}
									</aside>
								</ResizablePanel>
							</>
						)}
					</ResizablePanelGroup>
				</div>

				{/* Status bar */}
				<footer className='flex h-6 shrink-0 items-center justify-between border-t border-border bg-sidebar px-2 text-[11px] text-muted-foreground'>
					<div className='flex min-w-0 items-center'>
						<button
							type='button'
							onClick={() => navigate('/editor')}
							className='flex h-6 items-center gap-1 rounded-[4px] px-1.5 hover:bg-accent hover:text-foreground'
						>
							<ArrowLeft className='size-3' />
							Canvas
						</button>
						<span className='flex h-6 items-center gap-1 px-1.5'>
							<Hash className='size-3' />
							<span className='truncate font-mono'>
								{blockId ?? 'detached'}
							</span>
						</span>
						<span className='flex h-6 items-center gap-1.5 px-1.5'>
							<span
								className={cn(
									'size-1.5 rounded-full',
									isDirty ? 'bg-amber-500' : 'bg-emerald-500',
								)}
							/>
							{isDirty ? 'Unsaved changes' : 'Saved'}
						</span>
					</div>

					<div className='flex items-center tabular-nums'>
						<span className='px-1.5'>
							Ln {cursor.line}, Col {cursor.column}
						</span>
						<span className='px-1.5'>Spaces: 2</span>
						<span className='px-1.5'>UTF-8</span>
						<span className='flex items-center gap-1 px-1.5'>
							<Code2 className='size-3' />
							{activeFile.languageLabel}
						</span>
						<button
							type='button'
							onClick={() => toggleRuntime()}
							className='flex h-6 items-center gap-1 rounded-[4px] px-1.5 hover:bg-accent hover:text-foreground'
						>
							{editorState.allowScriptExecution ? (
								<Play className='size-3 text-emerald-500' />
							) : (
								<ShieldCheck className='size-3' />
							)}
							{editorState.allowScriptExecution ? 'JS on' : 'JS off'}
						</button>
					</div>
				</footer>
			</div>
		</TooltipProvider>
	);
};

export default BlockEditor;
