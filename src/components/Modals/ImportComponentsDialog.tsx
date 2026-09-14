import React, { useState, useRef } from 'react';
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
import { CircleAlert, CircleCheck, Download, Plus, Upload } from 'lucide-react';
import { useKComponentStore } from '@/stores/kcomponent-store';
import {
	parseKComponent,
	validateKComponentFile,
	generateKComponentExample,
} from '@/utils/kcomponentParser';
import { KComponent } from '@/models/KComponent';
import { Badge } from '@/components/ui/badge';

interface ImportComponentsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddToCanvas: (component: KComponent) => void;
}

export const ImportComponentsDialog: React.FC<ImportComponentsDialogProps> = ({
	open,
	onOpenChange,
	onAddToCanvas,
}) => {
	const [yamlContent, setYamlContent] = useState('');
	const [parseError, setParseError] = useState<string | null>(null);
	const [parsedComponent, setParsedComponent] = useState<KComponent | null>(
		null,
	);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { addImportedComponent, componentExists } = useKComponentStore();

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			setYamlContent(content);
			validateAndParse(content);
		};
		reader.onerror = () => {
			setParseError('Failed to read file');
		};
		reader.readAsText(file);
	};

	const handleYamlChange = (content: string) => {
		setYamlContent(content);
		validateAndParse(content);
	};

	const validateAndParse = (content: string) => {
		const validation = validateKComponentFile(content);
		if (!validation.valid) {
			setParseError(validation.error || 'Invalid .kcomponent file');
			setParsedComponent(null);
		} else {
			try {
				const component = parseKComponent(content);
				setParseError(null);
				setParsedComponent(component);
			} catch (error) {
				setParseError(
					error instanceof Error ? error.message : 'Failed to parse component',
				);
				setParsedComponent(null);
			}
		}
	};

	const handleImport = () => {
		if (!parsedComponent) return;

		// Check if component already exists
		const exists = componentExists(
			parsedComponent.manifest.name,
			parsedComponent.manifest.author,
		);

		if (exists) {
			setParseError(
				`A component with the name "${parsedComponent.manifest.name}" by ${parsedComponent.manifest.author || 'unknown'} already exists.`,
			);
			return;
		}

		addImportedComponent(parsedComponent);
		setYamlContent('');
		setParsedComponent(null);
		setParseError(null);
	};

	const handleDownloadExample = () => {
		const example = generateKComponentExample();
		const blob = new Blob([example], { type: 'text/yaml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'example.kcomponent';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const manifest = parsedComponent?.manifest;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='flex max-h-[85vh] flex-col overflow-hidden sm:max-w-xl'>
				<DialogHeader>
					<DialogTitle>Import components</DialogTitle>
					<DialogDescription>
						Add <code className='font-mono text-xs'>.kcomponent</code> files
						(YAML) to your component library.
					</DialogDescription>
				</DialogHeader>

				<DialogBody className='flex flex-col gap-4'>
					{/* File */}
					<button
						type='button'
						onClick={() => fileInputRef.current?.click()}
						className='flex w-full items-center gap-3 rounded-surface border border-dashed border-border px-4 py-4 text-left transition-colors hover:border-ring/50 hover:bg-accent/40'
					>
						<div className='flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-card'>
							<Upload className='size-4 text-muted-foreground' />
						</div>
						<div className='min-w-0'>
							<p className='text-[13px] text-foreground'>Choose a file</p>
							<p className='text-xs text-muted-foreground'>
								.kcomponent, .yaml or .yml
							</p>
						</div>
					</button>
					<Input
						id='kcomponent-file'
						ref={fileInputRef}
						type='file'
						accept='.kcomponent,.yaml,.yml'
						onChange={(event) => {
							handleFileUpload(event);
							event.target.value = '';
						}}
						className='hidden'
					/>

					{/* YAML */}
					<div className='flex flex-col gap-1.5'>
						<Label className='text-xs font-normal text-muted-foreground'>
							Or paste the YAML
						</Label>
						<Textarea
							value={yamlContent}
							onChange={(e) => handleYamlChange(e.target.value)}
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

					{manifest && !parseError && (
						<div className='flex items-start gap-3 rounded-surface border border-border bg-muted/40 px-3 py-2.5'>
							<CircleCheck className='mt-0.5 size-4 shrink-0 text-emerald-500' />
							<div className='min-w-0 flex-1'>
								<div className='flex items-center gap-2'>
									<p className='truncate text-[13px] font-medium text-foreground'>
										{manifest.name}
									</p>
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
							</div>
						</div>
					)}
				</DialogBody>

				<DialogBar>
					<Button variant='ghost' size='sm' onClick={handleDownloadExample}>
						<Download className='size-3.5' />
						Download example
					</Button>
					<Button
						size='sm'
						className='ml-auto'
						onClick={handleImport}
						disabled={!parsedComponent || !!parseError}
					>
						<Plus className='size-3.5' />
						Add to library
					</Button>
				</DialogBar>
			</DialogContent>
		</Dialog>
	);
};

export default ImportComponentsDialog;
