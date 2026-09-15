import { ClipboardCopy, Download, Share2, TriangleAlert } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
	Dialog,
	DialogBar,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Kbd } from '@/components/ui/kbd';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useWorkspaceStore } from '../../stores';
import {
	EXPORT_SCALES,
	type ExportFormat,
	canCopyImage,
	copyElementImage,
	exceedsCanvasLimit,
	exportElement,
	outputSize,
	renderBlob,
	renderImage,
	supportsScale,
	supportsTransparency,
	useExportSettings,
} from '@/lib/export/exporter';

interface Props {
	open: boolean;
	onClose?: () => void;
}

const FORMATS: Array<{ id: ExportFormat; label: string }> = [
	{ id: 'png', label: 'PNG' },
	{ id: 'jpeg', label: 'JPEG' },
	{ id: 'svg', label: 'SVG' },
];

/** Checkerboard that shows through transparent areas of the preview. */
const CHECKERBOARD: React.CSSProperties = {
	backgroundImage:
		'conic-gradient(rgb(128 128 128 / 0.18) 25%, transparent 0 50%, rgb(128 128 128 / 0.18) 0 75%, transparent 0)',
	backgroundSize: '16px 16px',
};

export const PreviewModal: React.FC<Props> = ({ open, onClose }) => {
	const [previewImage, setPreviewImage] = useState('');
	const [busy, setBusy] = useState<'export' | 'copy' | 'share' | null>(null);

	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const { format, scale, transparent, quality, setSettings } =
		useExportSettings();

	const width = parseFloat(currentWorkspace?.workspaceWidth ?? '0');
	const height = parseFloat(currentWorkspace?.workspaceHeight ?? '0');
	const name = currentWorkspace?.workspaceName ?? 'workspace';
	const size = outputSize(width, height, { format, scale });
	const tooLarge = exceedsCanvasLimit(width, height, { format, scale });
	const transparentOutput = transparent && supportsTransparency(format);

	const workspaceElement = () => document.getElementById('workspace');

	/* Render a lightweight preview that reflects the transparency setting */
	useEffect(() => {
		const element = workspaceElement();
		if (!open || !element) return;

		let cancelled = false;
		setPreviewImage('');

		renderImage(element, {
			format: 'png',
			scale: Math.min(1, 1200 / Math.max(width, height, 1)),
			transparent: transparentOutput,
			quality: 1,
		})
			.then((dataUrl) => !cancelled && setPreviewImage(dataUrl))
			.catch((error) => console.error(error));

		return () => {
			cancelled = true;
		};
	}, [open, transparentOutput]);

	const run = async (
		kind: 'export' | 'copy' | 'share',
		action: () => Promise<void>,
	) => {
		setBusy(kind);
		try {
			await action();
		} catch (error) {
			console.error(error);
			toast.error(
				kind === 'copy' ? 'Could not copy the image' : 'Export failed',
				{ description: error instanceof Error ? error.message : undefined },
			);
		} finally {
			setBusy(null);
		}
	};

	const handleExport = () =>
		run('export', () => exportElement(workspaceElement(), name));

	const handleCopy = () =>
		run('copy', async () => {
			await copyElementImage(workspaceElement());
			toast.success('Image copied to clipboard');
		});

	const handleShare = () =>
		run('share', async () => {
			const element = workspaceElement();
			const blob = element && (await renderBlob(element));
			if (!blob) return;

			try {
				await navigator.share({
					files: [new File([blob], `${name}.png`, { type: 'image/png' })],
					title: name,
				});
			} catch (error) {
				if ((error as DOMException)?.name !== 'AbortError') throw error;
			}
		});

	const canShare = typeof navigator.share === 'function';

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl'>
				<DialogHeader>
					<DialogTitle>Export</DialogTitle>
					<DialogDescription>
						{name}
						<span className='mx-1.5 text-border'>·</span>
						<span className='font-mono tabular-nums'>
							{width} × {height}
						</span>
					</DialogDescription>
				</DialogHeader>

				<div className='-mx-5 flex min-h-0 flex-auto flex-col border-y border-border md:flex-row'>
					{/* Preview */}
					<div className='canvas-grid flex min-h-[320px] flex-auto select-none items-center justify-center overflow-hidden p-6'>
						{previewImage !== '' ? (
							<TransformWrapper>
								<TransformComponent
									wrapperClass='!w-full !h-full'
									contentClass='!w-full !h-full items-center justify-center'
								>
									<img
										className='max-h-[55vh] max-w-full rounded-[4px] shadow-2xl shadow-black/40'
										style={transparentOutput ? CHECKERBOARD : undefined}
										src={previewImage}
										alt='Export preview'
									/>
								</TransformComponent>
							</TransformWrapper>
						) : (
							<div className='flex flex-col items-center gap-2 text-xs text-muted-foreground'>
								<Spinner className='size-5' />
								Rendering preview…
							</div>
						)}
					</div>

					{/* Settings */}
					<div className='flex w-full shrink-0 flex-col gap-5 border-t border-border bg-sidebar p-4 md:w-64 md:border-l md:border-t-0'>
						<div className='flex flex-col gap-2'>
							<Label className='text-xs font-normal text-muted-foreground'>
								Format
							</Label>
							<ToggleGroup
								type='single'
								variant='outline'
								size='sm'
								value={format}
								onValueChange={(value) =>
									value && setSettings({ format: value as ExportFormat })
								}
								className='w-full'
							>
								{FORMATS.map((item) => (
									<ToggleGroupItem
										key={item.id}
										value={item.id}
										className='flex-1 text-xs'
									>
										{item.label}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</div>

						<div className='flex flex-col gap-2'>
							<Label className='text-xs font-normal text-muted-foreground'>
								Scale
							</Label>
							<ToggleGroup
								type='single'
								variant='outline'
								size='sm'
								value={String(scale)}
								disabled={!supportsScale(format)}
								onValueChange={(value) =>
									value && setSettings({ scale: Number(value) })
								}
								className='w-full'
							>
								{EXPORT_SCALES.map((item) => (
									<ToggleGroupItem
										key={item}
										value={String(item)}
										className='flex-1 px-0 font-mono text-xs tabular-nums'
									>
										{item}×
									</ToggleGroupItem>
								))}
							</ToggleGroup>
							{!supportsScale(format) && (
								<p className='text-[11px] text-muted-foreground'>
									SVG is resolution independent.
								</p>
							)}
						</div>

						<label className='flex items-center justify-between gap-3'>
							<span className='flex flex-col'>
								<span className='text-[13px] text-foreground'>
									Transparent background
								</span>
								{!supportsTransparency(format) && (
									<span className='text-[11px] text-muted-foreground'>
										Not available for JPEG
									</span>
								)}
							</span>
							<Switch
								checked={transparentOutput}
								disabled={!supportsTransparency(format)}
								onCheckedChange={(checked) =>
									setSettings({ transparent: checked })
								}
							/>
						</label>

						{format === 'jpeg' && (
							<div className='flex flex-col gap-2'>
								<div className='flex items-center justify-between'>
									<Label className='text-xs font-normal text-muted-foreground'>
										Quality
									</Label>
									<span className='font-mono text-[11px] tabular-nums text-muted-foreground'>
										{Math.round(quality * 100)}%
									</span>
								</div>
								<Slider
									min={50}
									max={100}
									step={1}
									value={[Math.round(quality * 100)]}
									onValueChange={([value]) =>
										setSettings({ quality: value / 100 })
									}
								/>
							</div>
						)}

						<div className='mt-auto flex flex-col gap-1 rounded-control border border-border bg-background/60 px-3 py-2'>
							<span className='text-[11px] text-muted-foreground'>
								Output size
							</span>
							<span className='font-mono text-[13px] tabular-nums text-foreground'>
								{size.width} × {size.height} px
							</span>
							{tooLarge && (
								<span className='flex items-start gap-1.5 text-[11px] text-destructive'>
									<TriangleAlert className='mt-px size-3 shrink-0' />
									Too large for the browser. Use a smaller scale.
								</span>
							)}
						</div>
					</div>
				</div>

				<DialogBar className='-mt-5 border-t-0'>
					{canShare && (
						<Button
							variant='ghost'
							size='sm'
							onClick={handleShare}
							disabled={busy !== null}
						>
							{busy === 'share' ? <Spinner className='size-3.5' /> : <Share2 />}
							Share
						</Button>
					)}

					<div className='ml-auto flex items-center gap-2'>
						{canCopyImage() && (
							<Button
								variant='outline'
								size='sm'
								onClick={handleCopy}
								disabled={busy !== null || tooLarge}
							>
								{busy === 'copy' ? (
									<Spinner className='size-3.5' />
								) : (
									<ClipboardCopy />
								)}
								Copy image
								<Kbd
									shortcut='Alt+Shift+C'
									className='ml-1 hidden sm:inline-flex'
								/>
							</Button>
						)}
						<Button
							size='sm'
							onClick={handleExport}
							disabled={busy !== null || tooLarge}
						>
							{busy === 'export' ? (
								<Spinner className='size-3.5' />
							) : (
								<Download />
							)}
							Export {FORMATS.find((item) => item.id === format)?.label}
						</Button>
					</div>
				</DialogBar>
			</DialogContent>
		</Dialog>
	);
};

export default PreviewModal;
