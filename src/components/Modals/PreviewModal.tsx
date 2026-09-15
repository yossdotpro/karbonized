import { Download, Share2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ExportImage, export_format } from '../../utils/Exporter';
import { toBlob, toJpeg } from 'html-to-image';
import { useWorkspaceStore, useUIStore } from '../../stores';

interface Props {
	open: boolean;
	onClose?: () => void;
}

export const PreviewModal: React.FC<Props> = ({ open, onClose }) => {
	/* Component State */
	const [previewImage, setPreviewImage] = useState('');

	/* App Store */
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const setIsExporting = useUIStore((state) => state.setIsExporting);

	/* Actions */
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

	const showPreviewImage = async () => {
		const element = document.getElementById('workspace');

		if (element === null) {
			return;
		}

		// Trigger export start event for HTML blocks
		window.dispatchEvent(
			new CustomEvent('html-block-export', { detail: 'export-start' }),
		);

		setIsExporting(true);
		await new Promise((resolve) => setTimeout(resolve, 100));

		toJpeg(element, {
			cacheBust: true,
		})
			.then((dataUrl) => {
				setPreviewImage(dataUrl);
				setIsExporting(false);

				window.dispatchEvent(
					new CustomEvent('html-block-export', { detail: 'export-end' }),
				);
			})
			.catch((err) => {
				console.log(err);
				setIsExporting(false);
			});
	};

	const handleShare = async () => {
		const element = document.getElementById('workspace');
		if (element) {
			setIsExporting(true);
			await new Promise((resolve) => setTimeout(resolve, 100));
			const newFile = await toBlob(element);
			setIsExporting(false);
			if (newFile) {
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

	useEffect(() => {
		showPreviewImage();
	}, []);

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl'>
				<DialogHeader>
					<DialogTitle>Export</DialogTitle>
					<DialogDescription>
						{currentWorkspace?.workspaceName ?? 'Workspace'}
						<span className='mx-1.5 text-border'>·</span>
						<span className='font-mono tabular-nums'>
							{currentWorkspace?.workspaceWidth} ×{' '}
							{currentWorkspace?.workspaceHeight}
						</span>
					</DialogDescription>
				</DialogHeader>

				<div className='canvas-grid -mx-5 flex min-h-[320px] flex-auto select-none items-center justify-center overflow-hidden border-y border-border p-6'>
					{previewImage !== '' ? (
						<TransformWrapper>
							<TransformComponent
								wrapperClass='!w-full !h-full'
								contentClass='!w-full !h-full items-center justify-center'
							>
								<img
									className='max-h-[55vh] max-w-full rounded-[4px] shadow-2xl shadow-black/40'
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

				<DialogBar className='-mt-5 border-t-0'>
					<Button variant='ghost' size='sm' onClick={handleShare}>
						<Share2 className='size-3.5' />
						Share
					</Button>

					<div className='ml-auto flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => exportImage(export_format.svg)}
						>
							SVG
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => exportImage(export_format.jpeg)}
						>
							JPEG
						</Button>
						<Button size='sm' onClick={() => exportImage(export_format.png)}>
							<Download className='size-3.5' />
							Export PNG
						</Button>
					</div>
				</DialogBar>
			</DialogContent>
		</Dialog>
	);
};

export default PreviewModal;
