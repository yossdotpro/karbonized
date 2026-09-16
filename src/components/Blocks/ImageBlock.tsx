import { useControlsStore, useWorkspaceStore, useHistoryStore } from '@/stores';
import { IconPhoto } from '@tabler/icons-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import karbonized from '../../assets/logo.svg';
import { useControlState } from '../../hooks/useControlState';
import { buildDynamicBackgroundColors } from '../../utils/dynamicBackgroundColors';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ContextMenuItem } from '../ui/context-menu';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { ControlTemplate } from './ControlTemplate';
import { Label } from '../ui/label';
import { IMAGE_FIT_OPTIONS, type ImageFit } from '@/lib/blocks/catalog';

interface Props {
	id: string;
}

/** Read a file as a data URL, so the image is saved with the project. */
const readImageFile = async (file: File): Promise<string> =>
	await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener('load', () => {
			resolve(reader.result?.toString() ?? '');
		});
		reader.addEventListener('error', () => {
			reject(new Error('The image could not be read.'));
		});
		reader.readAsDataURL(file);
	});

export const ImageBlock: React.FC<Props> = ({ id }) => {
	/* Component States */
	const imgRef = useRef<HTMLImageElement>(null);
	const [src, setSrc] = useControlState(karbonized, `${id}-src`);
	const [fit, setFit] = useControlState<ImageFit>('fill', `${id}-fit`);
	/* Framing: which part of the image stays in view and how far it is zoomed
	   in. Together they frame the picture without changing the file. */
	const [focalX, setFocalX] = useControlState(50, `${id}-focalX`);
	const [focalY, setFocalY] = useControlState(50, `${id}-focalY`);
	const [zoom, setZoom] = useControlState(100, `${id}-zoom`);
	const [borderRadius, setBorderRadius] = useControlState(
		3,
		`${id}-borderRadius`,
	);
	const [isDropTarget, setIsDropTarget] = useState(false);

	const controlID = useControlsStore((state) => state.currentControlID);
	const setControlSize = useControlsStore((state) => state.setControlSize);
	const commitBatch = useHistoryStore((state) => state.commitBatch);
	const setWorkspaceDynamic = useWorkspaceStore(
		(state) => state.setWorkspaceDynamic,
	);
	const setWorkspaceType = useWorkspaceStore((state) => state.setWorkspaceType);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

	const loadFile = useCallback(
		async (file: File | null | undefined): Promise<void> => {
			if (!file || !file.type.startsWith('image/')) return;
			setSrc(await readImageFile(file));
		},
		[setSrc],
	);

	// Handle Load Image
	const handleLoadImage = (): void => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.addEventListener('change', (ev: Event) => {
			void loadFile((ev.target as HTMLInputElement).files?.[0]);
		});
		input.click();
	};

	/* Pasting an image replaces the one in the selected block */
	useEffect(() => {
		if (id !== controlID) return;

		const onPaste = (event: ClipboardEvent) => {
			const target = event.target as HTMLElement | null;
			// Text fields keep their own paste.
			if (
				target?.isContentEditable === true ||
				['INPUT', 'TEXTAREA'].includes(target?.tagName ?? '')
			) {
				return;
			}

			const file = Array.from(event.clipboardData?.items ?? [])
				.filter((item) => item.kind === 'file')
				.map((item) => item.getAsFile())
				.find((item) => item?.type.startsWith('image/'));

			if (file) {
				event.preventDefault();
				void loadFile(file);
			}
		};

		document.addEventListener('paste', onPaste);
		return () => {
			document.removeEventListener('paste', onPaste);
		};
	}, [controlID, id, loadFile]);

	/** Resize the block to the pixel size of the image, as one step. */
	const applyOriginalSize = (): void => {
		const image = imgRef.current;
		if (!image?.naturalWidth) return;

		const next = { w: image.naturalWidth, h: image.naturalHeight };
		const block = document.getElementById(id);
		const current = {
			w: block?.offsetWidth ?? next.w,
			h: block?.offsetHeight ?? next.h,
		};

		commitBatch([{ id: `${id}-control_size`, previous: current, next }]);
		setControlSize(next);
	};

	const handleCreateDynamicBackground = async (): Promise<void> => {
		if (imgRef.current == null || currentWorkspace == null) {
			return;
		}

		try {
			const colors = await buildDynamicBackgroundColors(imgRef.current);
			const seed = Math.floor(Math.random() * 10000);

			setWorkspaceDynamic({
				colors,
				seed,
			});
			setWorkspaceType('dynamic');
		} catch (error) {
			console.error('Failed to create dynamic background from image', error);
		}
	};

	return (
		<>
			<ControlTemplate
				id={id}
				/* Same default as the block radius stored under `-borderRadius` */
				border={3}
				borderEditable={false}
				minHeight={'20px'}
				minWidth={'20px'}
				maxWidth={'8000px'}
				maxHeight={'8000px'}
				defaultHeight={'100px'}
				defaultWidth={'100px'}
				onCreateDynamicBackground={handleCreateDynamicBackground}
				contextMenu={
					<>
						<ContextMenuItem
							onClick={() => {
								handleLoadImage();
							}}
						>
							Load Image
						</ContextMenuItem>

						<ContextMenuItem onClick={applyOriginalSize}>
							Set Original Image Size
						</ContextMenuItem>
					</>
				}
				menu={
					<>
						{/* Image Settings */}
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconPhoto size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Image</Label>
								</div>
							}
						>
							{/* Source */}
							<Label className='text-xs text-muted-foreground'>Source</Label>
							<Input
								type='file'
								accept='image/*'
								className='h-8 text-sm'
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
									void loadFile(e.target.files?.[0]);
								}}
							></Input>

							<Label className='text-xs text-muted-foreground'>
								Or use a URL
							</Label>
							<Input
								className='h-8 text-sm'
								placeholder='https://…'
								defaultValue={src.startsWith('data:') ? '' : src}
								onBlur={(event) => {
									const value = event.currentTarget.value.trim();
									if (value !== '') setSrc(value);
								}}
							></Input>

							<Button
								variant='outline'
								size='sm'
								className='h-8 text-xs'
								onClick={applyOriginalSize}
							>
								Use original size
							</Button>

							{/* Framing */}
							<Label className='text-xs text-muted-foreground'>Fit</Label>
							<ToggleGroup
								type='single'
								variant='outline'
								size='sm'
								className='w-full'
								value={fit}
								onValueChange={(value) => value && setFit(value as ImageFit)}
							>
								{IMAGE_FIT_OPTIONS.map((option) => (
									<ToggleGroupItem
										key={option.value}
										value={option.value}
										title={option.hint}
										className='flex-1 text-xs'
									>
										{option.label}
									</ToggleGroupItem>
								))}
							</ToggleGroup>

							{fit !== 'fill' && (
								<>
									<div className='flex flex-row items-center gap-2 text-xs'>
										<Label className='my-auto w-20 text-xs text-muted-foreground'>
											Offset X
										</Label>
										<Slider
											className='flex-1'
											max={100}
											value={[focalX]}
											onValueChange={(value) => {
												setFocalX(value[0]);
											}}
										></Slider>
									</div>
									<div className='flex flex-row items-center gap-2 text-xs'>
										<Label className='my-auto w-20 text-xs text-muted-foreground'>
											Offset Y
										</Label>
										<Slider
											className='flex-1'
											max={100}
											value={[focalY]}
											onValueChange={(value) => {
												setFocalY(value[0]);
											}}
										></Slider>
									</div>
								</>
							)}

							<div className='flex flex-row items-center gap-2 text-xs'>
								<Label className='my-auto w-20 text-xs text-muted-foreground'>
									Zoom: {zoom}%
								</Label>
								<Slider
									className='flex-1'
									min={100}
									max={400}
									value={[zoom]}
									onValueChange={(value) => {
										setZoom(value[0]);
									}}
								></Slider>
							</div>

							<div className='flex flex-row items-center gap-2 text-xs'>
								<Label className='my-auto w-20 text-xs text-muted-foreground'>
									Radius
								</Label>
								<Slider
									className='flex-1'
									max={200}
									onValueChange={(ev) => {
										setBorderRadius(ev[0]);
									}}
									value={[borderRadius]}
								></Slider>
							</div>
						</CustomCollapse>
					</>
				}
			>
				{/* Dropping an image file on the block replaces its image */}
				<div
					className={`flex h-full w-full flex-auto overflow-hidden ${
						isDropTarget ? 'outline outline-2 outline-blue-500' : ''
					}`}
					style={{ borderRadius: borderRadius + 'px' }}
					onDragOver={(event) => {
						event.preventDefault();
						setIsDropTarget(true);
					}}
					onDragLeave={() => {
						setIsDropTarget(false);
					}}
					onDrop={(event) => {
						event.preventDefault();
						event.stopPropagation();
						setIsDropTarget(false);
						void loadFile(event.dataTransfer.files?.[0]);
					}}
				>
					<img
						ref={imgRef}
						style={{
							objectFit: fit,
							objectPosition: `${focalX}% ${focalY}%`,
							transform: zoom === 100 ? undefined : `scale(${zoom / 100})`,
						}}
						className='flex h-full w-full flex-auto select-none'
						src={src}
						crossOrigin='anonymous'
					></img>
				</div>
			</ControlTemplate>
		</>
	);
};
export default ImageBlock;
