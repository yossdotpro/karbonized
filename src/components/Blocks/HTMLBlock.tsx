import { IconCode, IconWorld } from '@tabler/icons-react';
import React, { useEffect, useRef, useState } from 'react';
import { ControlTemplate } from './ControlTemplate';
import { useControlState } from '../../hooks/useControlState';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Info, Play, RefreshCw, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
	CustomAction,
	parseJavaScript,
	generateActionRegistrations,
	generateCompiledSource,
	updateCSSVariable,
	updateJSVariable,
	scopeCSS,
	createSafeDOM,
	fileHandler,
	fileUtils,
} from '../../lib/blocks-api';
import {
	defaultHTMLContent,
	defaultCSSContent,
	defaultJSContent,
} from '../../lib/blocks-api/default-content';
import { useHTMLBlockBindings } from '@/hooks/useHTMLBlockBindings';
import {
	HTMLBlockActionsControls,
	HTMLBlockCSSVariablesControls,
	HTMLBlockJSVariablesControls,
} from './HTMLBlockBindingsPanel';

interface Props {
	id: string;
}

export const HTMLBlock: React.FC<Props> = ({ id }) => {
	const navigate = useNavigate();
	const shadowHostRef = useRef<HTMLDivElement>(null);
	const shadowRootRef = useRef<ShadowRoot | null>(null);
	const actionHandlersRef = useRef<Map<string, () => void>>(new Map());
	const [devLogs, setDevLogs] = useState<
		Array<{ timestamp: Date; type: 'log' | 'warn' | 'error'; message: string }>
	>([]);

	// Component States
	const [htmlContent, setHTMLContent] = useControlState(
		defaultHTMLContent,
		`${id}-html`,
	);
	const [cssContent, setCSSContent] = useControlState(
		defaultCSSContent,
		`${id}-css`,
	);
	const [jsContent, setJSContent] = useControlState(
		defaultJSContent,
		`${id}-js`,
	);
	const [autoRefresh, setAutoRefresh] = useControlState(
		true,
		`${id}-auto-refresh`,
	);
	const [showDevTools, setShowDevTools] = useControlState(
		false,
		`${id}-devtools`,
	);
	const [allowScriptExecution, setAllowScriptExecution] = useControlState(
		false,
		`${id}-allow-scripts`,
	);
	const { cssVariables, jsVariables, customActions } = useHTMLBlockBindings(
		cssContent,
		jsContent,
	);

	// Function to add dev logs
	const addDevLog = (type: 'log' | 'warn' | 'error', message: string) => {
		setDevLogs((prev) => [...prev, { timestamp: new Date(), type, message }]);
	};

	// Clear dev logs
	const clearDevLogs = () => {
		setDevLogs([]);
	};

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

	// Update CSS content when variables change
	const handleUpdateCSSVariable = (
		varName: string,
		newValue: string | number | boolean,
	) => {
		const newCSS = updateCSSVariable(
			cssContent,
			varName,
			newValue,
			cssVariables,
		);
		setCSSContent(newCSS);
	};

	// Update JS content when variables change
	const handleUpdateJSVariable = (varName: string, newValue: any) => {
		const newJS = updateJSVariable(jsContent, varName, newValue, jsVariables);
		setJSContent(newJS);
	};

	// Generate ShadowDOM content
	const generateShadowDOMContent = () => {
		const scopedCSS = scopeCSS(cssContent, ':host');
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

		return { processedCSS };
	};

	// Refresh ShadowDOM
	const refreshShadowDOM = () => {
		console.log('Refreshing ShadowDOM...');
		if (shadowHostRef.current) {
			// Create or get shadow root
			if (!shadowRootRef.current) {
				console.log('Creating new shadow root');
				shadowRootRef.current = shadowHostRef.current.attachShadow({
					mode: 'open',
				});
			}

			const shadowRoot = shadowRootRef.current;
			const { processedCSS } = generateShadowDOMContent();
			const parsedJavaScript = parseJavaScript(jsContent);
			console.log(
				`Parsed ${parsedJavaScript.actions.length} actions from JavaScript`,
			);

			// Only clear action handlers if we're going to re-register them
			if (allowScriptExecution && parsedJavaScript.actions.length > 0) {
				console.log(
					`Clearing ${actionHandlersRef.current.size} existing action handlers for re-registration`,
				);
				actionHandlersRef.current.clear();
			} else {
				console.log(
					'Skipping action handler clear - script execution disabled or no actions to register',
				);
			}

			// Clear existing content
			shadowRoot.innerHTML = '';

			// Add styles
			const styleElement = document.createElement('style');
			styleElement.textContent = processedCSS;
			shadowRoot.appendChild(styleElement);

			// Add HTML content
			const container = document.createElement('div');
			container.style.display = 'flex';
			container.style.width = '100%';
			container.style.height = '100%';
			container.innerHTML = htmlContent;
			shadowRoot.appendChild(container);

			// Execute JavaScript only if allowed
			if (allowScriptExecution) {
				console.log('Script execution is allowed, processing JavaScript...');
				try {
					const host = shadowHostRef.current;
					if (!host) return;

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
						refresh: refreshShadowDOM,
						log: (message: unknown) => {
							const messageStr = String(message);
							console.log('HTML Block:', message);
							addDevLog('log', messageStr);
							if (window.parent !== window) {
								window.parent.postMessage(
									{ type: 'html-block-log', message },
									'*',
								);
							}
						},
						warn: (message: unknown) => {
							const messageStr = String(message);
							console.warn('HTML Block:', message);
							addDevLog('warn', messageStr);
						},
						error: (message: unknown) => {
							const messageStr = String(message);
							console.error('HTML Block:', message);
							addDevLog('error', messageStr);
						},
						host,
						root: container,
						shadowRoot,
						document: scopedDocument,
						globalDocument: window.document,
						registerAction: (actionId: string, handler: () => void) => {
							console.log(`Registering action handler: ${actionId}`);
							addDevLog('log', `Action registered: ${actionId}`);
							actionHandlersRef.current.set(actionId, handler);
							console.log(
								`Total registered actions: ${actionHandlersRef.current.size}`,
							);
						},
						safeDOM,
						// File handling utilities
						uploadFile: fileHandler.uploadFile,
						removeFile: fileHandler.removeFile,
						getFile: fileHandler.getFile,
						getAllFiles: fileHandler.getAllFiles,
						clearFiles: fileHandler.clearFiles,
						validateFile: fileHandler.validateFile,
						convertToDataUrl: fileHandler.convertToDataUrl,
						optimizeImage: fileHandler.optimizeImage,
						// File utilities
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
					console.log('JavaScript execution completed successfully');
				} catch (error) {
					console.error('Error executing HTML block script:', error);
				}
			} else {
				console.log(
					'Script execution is disabled, skipping JavaScript execution',
				);
			}
		} else {
			console.log('Shadow host is not available');
		}
	};

	// Auto-refresh when content changes
	useEffect(() => {
		if (autoRefresh && shadowHostRef.current) {
			const timeoutId = setTimeout(() => {
				refreshShadowDOM();
			}, 500); // Debounce refresh
			return () => clearTimeout(timeoutId);
		}
	}, [htmlContent, cssContent, jsContent, autoRefresh, allowScriptExecution]);

	// Initial load
	useEffect(() => {
		refreshShadowDOM();
	}, [allowScriptExecution]);

	// Open advanced editor
	const openAdvancedEditor = () => {
		// Navigate to the block editor with the block ID
		navigate('/block-editor', { state: { blockId: id } });
	};

	// Execute custom action
	const executeCustomAction = (action: CustomAction) => {
		if (!allowScriptExecution) {
			console.warn(
				'Script execution is disabled. Enable "Allow Script Execution" to run custom actions.',
			);
			return;
		}

		if (!shadowRootRef.current) {
			console.warn(
				'Shadow DOM is not initialized. Cannot execute custom action.',
			);
			return;
		}

		try {
			const actionHandler = actionHandlersRef.current.get(action.id);
			if (!actionHandler) {
				console.warn(
					`Custom action "${action.label}" (ID: ${action.id}) is not registered. Available handlers: [${Array.from(actionHandlersRef.current.keys()).join(', ')}]`,
				);

				// Try to re-register actions by re-executing the JavaScript
				console.log('Attempting to re-register actions...');
				try {
					const parsedJavaScript = parseJavaScript(jsContent);
					if (parsedJavaScript.actions.length > 0) {
						console.log('Re-executing JavaScript to re-register actions...');

						const host = shadowHostRef.current;
						if (host) {
							const shadowRoot = shadowRootRef.current;
							const scopedDocument = createScopedDocument(shadowRoot, host);
							const safeQuerySelector = (selector: string) => {
								try {
									return shadowRoot.querySelector(selector);
								} catch (error) {
									console.error('Error selecting element:', selector, error);
									return null;
								}
							};

							const htmlBlockAPI = {
								refresh: refreshShadowDOM,
								log: (message: unknown) => {
									console.log('HTML Block:', message);
								},
								host,
								root: shadowRoot.querySelector('div'),
								shadowRoot,
								document: scopedDocument,
								globalDocument: window.document,
								registerAction: (actionId: string, handler: () => void) => {
									console.log(`Re-registering action handler: ${actionId}`);
									actionHandlersRef.current.set(actionId, handler);
								},
							};

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

							// Set up global objects for the execution context
							(window as any).htmlBlockAPI = htmlBlockAPI;
							(window as any).safeQuerySelector = safeQuerySelector;

							executeUserCode(window, console, window.alert.bind(window));

							// Now try to execute the action again
							const reRegisteredHandler = actionHandlersRef.current.get(
								action.id,
							);
							if (reRegisteredHandler) {
								console.log(
									`Successfully re-registered and executing action: ${action.label}`,
								);
								reRegisteredHandler();
							} else {
								console.error(`Failed to re-register action: ${action.label}`);
							}
						}
					}
				} catch (error) {
					console.error('Error during action re-registration:', error);
				}
				return;
			}

			console.log(
				`Executing custom action: ${action.label} (ID: ${action.id})`,
			);
			actionHandler();
		} catch (error) {
			console.error('Error executing custom action:', error);
		}
	};

	return (
		<>
			<ControlTemplate
				id={id}
				borderEditable={false}
				defaultHeight='300px'
				defaultWidth='400px'
				minHeight='200px'
				minWidth='300px'
				maxWidth='1200px'
				maxHeight='800px'
				menu={
					<>
						{/* Content Editor */}
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconCode size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Content</Label>
									<Button
										variant='ghost'
										size='sm'
										onClick={openAdvancedEditor}
										className='ml-auto h-6 px-2 text-xs'
									>
										<Edit className='h-3 w-3 mr-1' />
										Advanced Editor
									</Button>
								</div>
							}
						>
							<Tabs defaultValue='html' className='w-full'>
								<TabsList className='grid w-full grid-cols-3'>
									<TabsTrigger value='html'>HTML</TabsTrigger>
									<TabsTrigger value='css'>CSS</TabsTrigger>
									<TabsTrigger value='js'>JS</TabsTrigger>
								</TabsList>

								<TabsContent value='html' className='space-y-2'>
									<Label className='text-xs text-muted-foreground'>
										HTML Content
									</Label>
									<Textarea
										value={htmlContent}
										onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
											setHTMLContent(e.target.value)
										}
										className='font-mono text-xs min-h-25'
										placeholder='Enter HTML content...'
									/>
								</TabsContent>

								<TabsContent value='css' className='space-y-2'>
									<Label className='text-xs text-muted-foreground'>
										CSS Styles
									</Label>
									<Textarea
										value={cssContent}
										onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
											setCSSContent(e.target.value)
										}
										className='font-mono text-xs min-h-25'
										placeholder='Enter CSS with --variable-name: value; format...'
									/>
									<Alert>
										<Info className='h-4 w-4' />
										<AlertDescription className='text-xs'>
											Use CSS variables with --prefix to auto-generate controls.
											Add explicit type annotations with comments: /*
											@type:color */ /* @type:number min:0 max:100 step:1
											unit:px */ /* @type:boolean */ /* @type:shadow */ /*
											@type:string */
										</AlertDescription>
									</Alert>
								</TabsContent>

								<TabsContent value='js' className='space-y-2'>
									<Label className='text-xs text-muted-foreground'>
										JavaScript
									</Label>
									<Textarea
										value={jsContent}
										onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
											setJSContent(e.target.value)
										}
										className='font-mono text-xs min-h-25'
										placeholder='Enter JavaScript code...'
									/>
									<Alert>
										<Info className='h-4 w-4' />
										<AlertDescription className='text-xs'>
											Add custom actions with // @action:Button Name followed by
											the code to execute. Define JS variables with // @var
											name:type = value. Types: string, number, boolean, color,
											gradient, url, object, array.
										</AlertDescription>
									</Alert>
								</TabsContent>
							</Tabs>
						</CustomCollapse>

						{/* CSS Variables Controls */}
						{cssVariables.length > 0 && (
							<CustomCollapse
								menu={
									<div className='flex items-center gap-2 text-foreground'>
										<IconWorld size={18} className='text-muted-foreground' />
										<Label className='text-sm font-semibold'>
											CSS Variables
										</Label>
										<Badge variant='secondary' className='text-xs'>
											{cssVariables.length}
										</Badge>
									</div>
								}
							>
								<div className='space-y-4'>
									<HTMLBlockCSSVariablesControls
										variables={cssVariables}
										onUpdateVariable={handleUpdateCSSVariable}
									/>
								</div>
							</CustomCollapse>
						)}

						{/* JS Variables Controls */}
						{jsVariables.length > 0 && (
							<CustomCollapse
								menu={
									<div className='flex items-center gap-2 text-foreground'>
										<IconCode size={18} className='text-muted-foreground' />
										<Label className='text-sm font-semibold'>
											JS Variables
										</Label>
										<Badge variant='secondary' className='text-xs'>
											{jsVariables.length}
										</Badge>
									</div>
								}
							>
								<div className='space-y-4'>
									<HTMLBlockJSVariablesControls
										variables={jsVariables}
										onUpdateVariable={handleUpdateJSVariable}
									/>
								</div>
							</CustomCollapse>
						)}

						{/* Custom Actions */}
						{customActions.length > 0 && (
							<CustomCollapse
								menu={
									<div className='flex items-center gap-2 text-foreground'>
										<Play size={18} className='text-muted-foreground' />
										<Label className='text-sm font-semibold'>Actions</Label>
										<Badge variant='secondary' className='text-xs'>
											{customActions.length}
										</Badge>
									</div>
								}
							>
								<HTMLBlockActionsControls
									actions={customActions}
									allowScriptExecution={allowScriptExecution}
									onExecuteAction={executeCustomAction}
								/>
							</CustomCollapse>
						)}

						{/* DevTools */}
						{showDevTools && (
							<CustomCollapse
								isOpen
								menu={
									<div className='flex items-center gap-2 text-foreground'>
										<IconCode size={18} className='text-muted-foreground' />
										<Label className='text-sm font-semibold'>DevTools</Label>
										<Badge variant='secondary' className='text-xs'>
											{devLogs.length}
										</Badge>
									</div>
								}
							>
								<div className='space-y-4'>
									{/* Console Logs */}
									<div className='space-y-2'>
										<div className='flex items-center justify-between'>
											<Label className='text-xs text-muted-foreground'>
												Console Logs
											</Label>
											<Button
												variant='outline'
												size='sm'
												onClick={clearDevLogs}
												className='h-6 px-2 text-xs'
											>
												Clear
											</Button>
										</div>
										<div className='bg-black/50 border border-border rounded-md p-2 h-32 overflow-y-auto font-mono text-xs'>
											{devLogs.length === 0 ? (
												<div className='text-muted-foreground'>
													No logs yet...
												</div>
											) : (
												devLogs.map((log, index) => (
													<div key={index} className='mb-1'>
														<span className='text-muted-foreground'>
															[{log.timestamp.toLocaleTimeString()}]
														</span>{' '}
														<span
															className={
																log.type === 'error'
																	? 'text-red-400'
																	: log.type === 'warn'
																		? 'text-yellow-400'
																		: 'text-green-400'
															}
														>
															{log.type.toUpperCase()}:
														</span>{' '}
														<span className='text-foreground'>
															{log.message}
														</span>
													</div>
												))
											)}
										</div>
									</div>

									{/* Dev Utilities */}
									<div className='space-y-2'>
										<Label className='text-xs text-muted-foreground'>
											Utilities
										</Label>
										<div className='grid grid-cols-2 gap-2'>
											<Button
												variant='outline'
												size='sm'
												onClick={() => {
													addDevLog(
														'log',
														'DOM Elements: ' +
															String(
																shadowRootRef.current?.children.length || 0,
															),
													);
													addDevLog(
														'log',
														'CSS Variables: ' + String(cssVariables.length),
													);
													addDevLog(
														'log',
														'Custom Actions: ' + String(customActions.length),
													);
												}}
												className='text-xs'
											>
												Inspect State
											</Button>
											<Button
												variant='outline'
												size='sm'
												onClick={() => {
													const vars = cssVariables
														.map((v) => `${v.name}: ${v.value}`)
														.join(', ');
													addDevLog('log', `CSS Variables: ${vars}`);
												}}
												className='text-xs'
											>
												Log Variables
											</Button>
											<Button
												variant='outline'
												size='sm'
												onClick={() => {
													addDevLog(
														'log',
														'Actions available: ' +
															customActions.map((a) => a.label).join(', '),
													);
												}}
												className='text-xs'
											>
												List Actions
											</Button>
											<Button
												variant='outline'
												size='sm'
												onClick={() => {
													refreshShadowDOM();
													addDevLog('log', 'Shadow DOM refreshed manually');
												}}
												className='text-xs'
											>
												Force Refresh
											</Button>
										</div>
									</div>
								</div>
							</CustomCollapse>
						)}

						{/* Settings */}
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconCode size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Settings</Label>
								</div>
							}
						>
							<div className='space-y-4'>
								<div className='flex items-center justify-between'>
									<Label className='text-xs text-muted-foreground'>
										Auto Refresh
									</Label>
									<Switch
										checked={autoRefresh}
										onCheckedChange={setAutoRefresh}
									/>
								</div>

								<div className='flex items-center justify-between'>
									<Label className='text-xs text-muted-foreground'>
										Allow Script Execution
									</Label>
									<Switch
										checked={allowScriptExecution}
										onCheckedChange={setAllowScriptExecution}
									/>
								</div>

								<div className='flex items-center justify-between'>
									<Label className='text-xs text-muted-foreground'>
										Show DevTools
									</Label>
									<Switch
										checked={showDevTools}
										onCheckedChange={setShowDevTools}
									/>
								</div>

								<Button
									variant='outline'
									size='sm'
									onClick={refreshShadowDOM}
									className='w-full'
								>
									<RefreshCw className='h-4 w-4 mr-2' />
									Refresh Preview
								</Button>
							</div>
						</CustomCollapse>
					</>
				}
			>
				<>
					<div
						ref={shadowHostRef}
						className='w-full h-full pointer-events-none'
					/>
				</>
			</ControlTemplate>
		</>
	);
};

export default HTMLBlock;
