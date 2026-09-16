import React, {
	useCallback,
	useDeferredValue,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	Dialog,
	DialogBar,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	CircleAlert,
	CircleCheck,
	Download,
	Plus,
	TriangleAlert,
	Upload,
} from 'lucide-react';
import { useKComponentStore } from '@/stores/kcomponent-store';
import {
	generateKComponentExample,
	parseKComponentDocument,
} from '@/utils/kcomponentParser';
import {
	KCOMPONENT_FILE_ACCEPT,
	KComponentFileResult,
	downloadKComponent,
	isKComponentFile,
	readKComponentFiles,
} from '@/utils/kcomponentFile';
import { KComponent, getComponentKey } from '@/models/KComponent';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/lib/utils';

interface ImportComponentsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddToCanvas?: (component: KComponent) => void;
}

/** One line per file/paste, so a batch import says what happened to each entry. */
interface ImportFeedback {
	name: string;
	tone: 'success' | 'warning' | 'error';
	message: string;
}

export const ImportComponentsDialog: React.FC<ImportComponentsDialogProps> = ({
	open,
	onOpenChange,
	onAddToCanvas,
}) => {
	const [yamlContent, setYamlContent] = useState('');
	const [feedback, setFeedback] = useState<ImportFeedback[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const dragDepth = useRef(0);

	const importComponents = useKComponentStore(
		(state) => state.importComponents,
	);
	const importedComponents = useKComponentStore(
		(state) => state.importedComponents,
	);

	/* Validation follows the editor one render behind: typing stays responsive. */
	const deferredYaml = useDeferredValue(yamlContent);
	const parseResult = useMemo(
		() => (deferredYaml.trim() ? parseKComponentDocument(deferredYaml) : null),
		[deferredYaml],
	);

	const parsedComponent = parseResult?.component ?? null;
	const parseError =
		parseResult && !parseResult.component ? parseResult.errors.join(' ') : null;
	const parseWarnings = parsedComponent ? (parseResult?.warnings ?? []) : [];

	const resetEditor = () => setYamlContent('');

	/** Imports parsed components, replacing existing ones with the same name/author. */
	const importParsed = useCallback(
		(components: KComponent[], replace: boolean): ImportFeedback[] => {
			const results = importComponents(components, { replace });

			return results.map((result): ImportFeedback => {
				switch (result.outcome) {
					case 'added':
						return {
							name: result.name,
							tone: 'success',
							message: 'added to the library',
						};
					case 'replaced':
						return {
							name: result.name,
							tone: 'success',
							message: 'updated in the library',
						};
					case 'duplicate':
						return {
							name: result.name,
							tone: 'warning',
							message: 'already in the library, use Replace to update it',
						};
					case 'limit':
					default:
						return {
							name: result.name,
							tone: 'error',
							message: 'the library is full, remove a component first',
						};
				}
			});
		},
		[importComponents],
	);

	const importFiles = useCallback(
		async (files: File[]) => {
			const supported = files.filter(isKComponentFile);
			const skipped = files.filter((file) => !isKComponentFile(file));

			const results: KComponentFileResult[] =
				await readKComponentFiles(supported);

			const valid = results
				.map((result) => result.component)
				.filter((component): component is KComponent => component !== null);

			const messages: ImportFeedback[] = [
				...skipped.map((file): ImportFeedback => ({
					name: file.name,
					tone: 'error',
					message: 'unsupported file type',
				})),
				...results
					.filter((result) => !result.component)
					.map((result): ImportFeedback => ({
						name: result.fileName,
						tone: 'error',
						message: result.errors.join(' ') || 'could not be parsed',
					})),
				...importParsed(valid, true),
			];

			setFeedback(messages);

			// A single file also lands in the editor so it can be reviewed or tweaked.
			if (supported.length === 1 && results[0]?.component === null) {
				const file = supported[0];
				const content = await file.text();
				setYamlContent(content);
			} else if (valid.length) {
				resetEditor();
			}
		},
		[importParsed],
	);

	const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		event.target.value = '';
		if (files.length) void importFiles(files);
	};

	const handleImportPasted = (replace: boolean) => {
		if (!parsedComponent) return;

		const messages = importParsed([parsedComponent], replace);
		setFeedback(messages);

		if (messages[0]?.tone === 'success') resetEditor();
	};

	const handleAddToCanvas = () => {
		if (!parsedComponent || !onAddToCanvas) return;

		importParsed([parsedComponent], true);
		onAddToCanvas(parsedComponent);
		resetEditor();
		onOpenChange(false);
	};

	const handleDownloadExample = () => {
		const example = generateKComponentExample();
		const { component } = parseKComponentDocument(example);
		if (component) downloadKComponent(component);
	};

	const handleDragEnter = (event: React.DragEvent) => {
		event.preventDefault();
		dragDepth.current += 1;
		setIsDragging(true);
	};

	const handleDragLeave = (event: React.DragEvent) => {
		event.preventDefault();
		dragDepth.current = Math.max(0, dragDepth.current - 1);
		if (dragDepth.current === 0) setIsDragging(false);
	};

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		dragDepth.current = 0;
		setIsDragging(false);

		const files = Array.from(event.dataTransfer.files ?? []);
		if (files.length) void importFiles(files);
	};

	const manifest = parsedComponent?.manifest;
	const alreadyExists = useMemo(() => {
		if (!manifest) return false;

		const key = getComponentKey(manifest);
		return importedComponents.some(
			(item) => getComponentKey(item.component.manifest) === key,
		);
	}, [importedComponents, manifest]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='flex max-h-[85vh] flex-col overflow-hidden sm:max-w-xl'>
				<DialogHeader>
					<DialogTitle>Import components</DialogTitle>
					<DialogDescription>
						Add <code className='font-mono text-xs'>.kcomponent</code> files
						(YAML) to your component library. You can drop several at once.
					</DialogDescription>
				</DialogHeader>

				<DialogBody className='flex flex-col gap-4'>
					{/* File / drop zone */}
					<button
						type='button'
						onClick={() => fileInputRef.current?.click()}
						onDragEnter={handleDragEnter}
						onDragOver={(event) => event.preventDefault()}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						className={cn(
							'flex w-full items-center gap-3 rounded-surface border border-dashed border-border px-4 py-4 text-left transition-colors hover:border-ring/50 hover:bg-accent/40',
							isDragging && 'border-ring bg-accent/60',
						)}
					>
						<div className='flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-card'>
							<Upload className='size-4 text-muted-foreground' />
						</div>
						<div className='min-w-0'>
							<p className='text-[13px] text-foreground'>
								{isDragging
									? 'Drop to import'
									: 'Choose files or drop them here'}
							</p>
							<p className='text-xs text-muted-foreground'>
								.kcomponent, .yaml or .yml
							</p>
						</div>
					</button>
					<Input
						id='kcomponent-file'
						ref={fileInputRef}
						type='file'
						multiple
						accept={KCOMPONENT_FILE_ACCEPT}
						onChange={handleFileInput}
						className='hidden'
					/>

					{/* Import results */}
					{feedback.length > 0 && (
						<ul className='flex flex-col gap-1 rounded-surface border border-border bg-muted/40 px-3 py-2.5'>
							{feedback.map((item, index) => (
								<li
									key={`${item.name}-${index}`}
									className='flex items-start gap-2 text-xs'
								>
									{item.tone === 'success' ? (
										<CircleCheck className='mt-0.5 size-3.5 shrink-0 text-emerald-500' />
									) : item.tone === 'warning' ? (
										<TriangleAlert className='mt-0.5 size-3.5 shrink-0 text-amber-500' />
									) : (
										<CircleAlert className='mt-0.5 size-3.5 shrink-0 text-destructive' />
									)}
									<span className='min-w-0 text-muted-foreground'>
										<span className='font-medium text-foreground'>
											{item.name}
										</span>{' '}
										{item.message}
									</span>
								</li>
							))}
						</ul>
					)}

					{/* YAML */}
					<div className='flex flex-col gap-1.5'>
						<Label className='text-xs font-normal text-muted-foreground'>
							Or paste the YAML
						</Label>
						<Textarea
							value={yamlContent}
							onChange={(event) => setYamlContent(event.target.value)}
							placeholder={
								'manifest:\n  name: My component\nhtml: |\n  <div>…</div>'
							}
							spellCheck={false}
							className='min-h-44 resize-y font-mono text-xs leading-relaxed'
						/>
					</div>

					{/* Validation */}
					{parseError && (
						<Alert variant='destructive'>
							<CircleAlert />
							<AlertDescription>{parseError}</AlertDescription>
						</Alert>
					)}

					{parsedComponent && parseWarnings.length > 0 && (
						<Alert>
							<TriangleAlert />
							<AlertDescription>
								<ul className='flex list-disc flex-col gap-0.5 pl-4'>
									{parseWarnings.map((warning) => (
										<li key={warning}>{warning}</li>
									))}
								</ul>
							</AlertDescription>
						</Alert>
					)}

					{manifest && !parseError && (
						<div className='flex items-start gap-3 rounded-surface border border-border bg-muted/40 px-3 py-2.5'>
							<CircleCheck className='mt-0.5 size-4 shrink-0 text-emerald-500' />
							<div className='min-w-0 flex-1'>
								<div className='flex items-center gap-2'>
									<p className='truncate text-[13px] font-medium text-foreground'>
										{manifest.name}
									</p>
									{manifest.version && (
										<span className='shrink-0 text-xs text-muted-foreground'>
											v{manifest.version.replace(/^v/i, '')}
										</span>
									)}
									{manifest.category && (
										<Badge variant='secondary'>{manifest.category}</Badge>
									)}
								</div>
								{manifest.author && (
									<p className='text-xs text-muted-foreground'>
										by {manifest.author}
									</p>
								)}
								{manifest.description && (
									<p className='mt-1 text-xs text-muted-foreground'>
										{manifest.description}
									</p>
								)}
								{alreadyExists && (
									<p className='mt-1 text-xs text-amber-500'>
										A component with this name already exists in your library.
									</p>
								)}
							</div>
						</div>
					)}
				</DialogBody>

				<DialogBar>
					<Button variant='ghost' size='sm' onClick={handleDownloadExample}>
						<Download className='size-3.5' />
						Download example
					</Button>

					<div className='ml-auto flex items-center gap-2'>
						{onAddToCanvas && (
							<Button
								size='sm'
								variant='outline'
								onClick={handleAddToCanvas}
								disabled={!parsedComponent}
							>
								Add to canvas
							</Button>
						)}
						<Button
							size='sm'
							onClick={() => handleImportPasted(alreadyExists)}
							disabled={!parsedComponent}
						>
							<Plus className='size-3.5' />
							{alreadyExists ? 'Replace in library' : 'Add to library'}
						</Button>
					</div>
				</DialogBar>
			</DialogContent>
		</Dialog>
	);
};

export default ImportComponentsDialog;
