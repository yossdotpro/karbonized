import {
	IconAppWindow,
	IconArrowLeft,
	IconArrowRight,
	IconBrandChrome,
	IconChevronLeft,
	IconChevronRight,
	IconFile,
	IconReload,
	IconSearch,
	IconStar,
	IconX,
} from '@tabler/icons-react';
import React, { useRef } from 'react';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import karbonized from '../../assets/logo.svg';
import { CloseSvg, MinimizeSvg } from '../Misc/Icons';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { useWorkspaceStore, useControlsStore } from '../../stores';
import { buildDynamicBackgroundColors } from '../../utils/dynamicBackgroundColors';

interface Props {
	id: string;
}

export const WindowBlock: React.FC<Props> = ({ id }) => {
	/* Component States */
	const contentImageRef = useRef<HTMLImageElement>(null);
	const [title, setTitle] = useControlState('Karbonized', `${id}-title`);
	const [url, setUrl] = useControlState('karbonized.onrender.com', `${id}-url`);
	const [color, setColor] = useControlState('#ffffff', `${id}-color`);
	const [controlsColor, setControlsColor] = useControlState(
		'#0e111b',
		`${id}-controlsColor`,
	);

	const [windowStyle, setWindowStyle] = useControlState(
		'mac',
		`${id}-windowStyle`,
	);
	const [windowType, setWindowType] = useControlState(
		'browser',
		`${id}-windowType`,
	);

	const [src, setSrc] = useControlState(karbonized, `${id}-src`);
	const setWorkspaceDynamic = useWorkspaceStore(
		(state) => state.setWorkspaceDynamic,
	);
	const setWorkspaceType = useWorkspaceStore((state) => state.setWorkspaceType);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

	const handleCreateDynamicBackground = async (): Promise<void> => {
		if (contentImageRef.current == null || currentWorkspace == null) {
			return;
		}

		try {
			const colors = await buildDynamicBackgroundColors(
				contentImageRef.current,
			);
			const seed = Math.floor(Math.random() * 10000);

			setWorkspaceDynamic({
				colors,
				seed,
			});
			setWorkspaceType('dynamic');
		} catch (error) {
			console.error(
				'Failed to create dynamic background from window image',
				error,
			);
		}
	};

	return (
		<>
			<ControlTemplate
				id={id}
				minWidth='400px'
				minHeight='200px'
				maxWidth='3000px'
				maxHeight='2000px'
				border={6}
				defaultHeight={'200px'}
				defaultWidth={'400px'}
				color={color}
				onCreateDynamicBackground={handleCreateDynamicBackground}
				menu={
					<>
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconAppWindow size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Window</Label>
								</div>
							}
						>
							<>
								<Label className='text-xs text-muted-foreground'>
									Window Style
								</Label>
								<Select value={windowStyle} onValueChange={setWindowStyle}>
									<SelectTrigger className='w-full'>
										<SelectValue placeholder='Select style' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={'mac'}>mac</SelectItem>
										<SelectItem value={'window'}>window</SelectItem>
									</SelectContent>
								</Select>

								<Label className='text-xs text-muted-foreground'>
									Window Type
								</Label>
								<Select value={windowType} onValueChange={setWindowType}>
									<SelectTrigger className='w-full'>
										<SelectValue placeholder='Select type' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={'normal'}>normal</SelectItem>
										<SelectItem value={'browser'}>browser</SelectItem>
									</SelectContent>
								</Select>
							</>
							{/* Title */}
							<>
								<Label className='text-xs text-muted-foreground'>Title</Label>
								<Input
									spellCheck={false}
									onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
										setTitle(ev.target.value);
									}}
									value={title}
									className='h-8 text-sm'
								></Input>
							</>

							{/* Url */}
							{windowType === 'browser' && (
								<>
									<Label className='text-xs text-muted-foreground'>Url</Label>
									<Input
										spellCheck={false}
										onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
											setUrl(ev.target.value);
										}}
										value={url}
										className='h-8 text-sm'
									></Input>
								</>
							)}

							<>
								{/* Source */}
								<Label className='text-xs text-muted-foreground'>Source</Label>
								<Input
									type='file'
									accept='image/*'
									className='h-8 text-sm'
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
										if (e.target.files && e.target.files.length > 0) {
											const reader = new FileReader();
											reader.addEventListener('load', () => {
												setSrc(reader.result?.toString() || '');
											});
											reader.readAsDataURL(e.target.files[0]);
										}
									}}
								></Input>
							</>

							{/* Colors */}
							<Label className='text-xs text-muted-foreground'>Colors</Label>
							<>
								<ColorPicker
									color={color}
									onColorChange={setColor}
									isGradientEnable={false}
									label='Window'
								></ColorPicker>

								<ColorPicker
									color={controlsColor}
									onColorChange={setControlsColor}
									isGradientEnable={false}
									label='Controls'
								></ColorPicker>
							</>
						</CustomCollapse>
					</>
				}
			>
				<div className='flex flex-auto flex-col overflow-hidden rounded'>
					{/* Title */}
					<div className='flex max-h-12 flex-auto p-1'>
						<div className='my-auto flex flex-auto flex-row '>
							<div className='my-auto flex w-1/3 flex-auto flex-row text-neutral-600  '>
								{windowStyle === 'window' && (
									<>
										{windowType === 'normal' ? (
											<p
												style={{ color: controlsColor }}
												className='my-auto ml-2 text-left'
											>
												{title}
											</p>
										) : (
											<div className='flex flex-auto flex-row'>
												<IconBrandChrome
													className='mx-2 my-auto'
													size={15}
												></IconBrandChrome>
												<div className='flex flex-row  gap-1 rounded bg-slate-500/10 p-2'>
													<IconFile className='my-auto' size={15}></IconFile>
													<p className='my-auto text-xs'>{title}</p>
													<IconX className='my-auto' size={15}></IconX>
												</div>
											</div>
										)}
									</>
								)}

								{windowStyle === 'mac' && (
									<>
										<div className='flex flex-auto flex-row gap-1 p-1'>
											<div className='my-auto h-4  w-4 rounded-full bg-red-500 p-1'></div>
											<div className='my-auto h-4  w-4 rounded-full bg-yellow-300 p-1'></div>
											<div className='my-auto h-4  w-4 rounded-full  bg-green-500 p-1'></div>

											{/* Browser Buttons Mac */}
											{windowType === 'browser' && (
												<div className='my-auto  ml-2 flex flex-row gap-1'>
													<div className='rounded bg-slate-500/20 p-1'>
														<IconChevronLeft size={15}></IconChevronLeft>
													</div>

													<div className='rounded bg-slate-500/20 p-1'>
														<IconChevronRight size={15}></IconChevronRight>
													</div>
												</div>
											)}
										</div>
									</>
								)}
							</div>

							<div
								spellCheck={false}
								className='my-auto flex w-1/3 flex-auto select-none flex-row text-neutral-600'
							>
								{windowStyle === 'mac' && windowType === 'normal' && (
									<p
										style={{ color: controlsColor }}
										className='mx-auto my-auto text-center'
									>
										{title}
									</p>
								)}

								{windowStyle === 'mac' && windowType === 'browser' && (
									<>
										<div className='mx-auto my-auto flex max-h-6 w-full flex-auto flex-row overflow-hidden rounded-full  bg-slate-500/20 p-1'>
											<IconSearch className='ml-1' size={15}></IconSearch>
											<p className='my-auto ml-2 h-6 max-h-6 w-56 max-w-fit overflow-hidden text-xs '>
												{url}
											</p>
										</div>
									</>
								)}
							</div>

							{windowStyle === 'mac' ? (
								<div className='flex w-1/3 flex-auto flex-row'></div>
							) : (
								<div className='my-auto mr-2 flex w-1/3 flex-auto flex-row'>
									<MinimizeSvg
										style={{ fill: controlsColor }}
										className='ml-auto h-4 w-4'
									></MinimizeSvg>
									<CloseSvg
										style={{ fill: controlsColor }}
										className='ml-2 h-4  w-4'
									></CloseSvg>
								</div>
							)}
						</div>
					</div>

					{windowStyle === 'window' && windowType === 'browser' && (
						<div className='flex max-h-10 flex-auto flex-row gap-2'>
							{/* Browser Controls */}
							<div
								className='my-auto  ml-2 flex gap-1 p-1'
								style={{ color: controlsColor }}
							>
								<IconArrowLeft size={14}></IconArrowLeft>
								<IconArrowRight size={14}></IconArrowRight>
								<IconReload size={14}></IconReload>
							</div>

							{/* Search Bar  */}
							<div
								className='m-1 flex flex-auto flex-row rounded bg-slate-500/20 p-1'
								style={{ color: controlsColor }}
							>
								<IconSearch className='my-auto ml-1' size={14}></IconSearch>
								<p className='my-auto ml-2 text-xs'>{url}</p>
								<IconStar className='my-auto ml-auto mr-1' size={14}></IconStar>
							</div>
						</div>
					)}

					{/* Content */}
					<div className='flex flex-auto'>
						<img
							ref={contentImageRef}
							className='flex aspect-auto h-full w-full flex-auto'
							src={src}
							crossOrigin='anonymous'
						></img>
					</div>
				</div>
			</ControlTemplate>
		</>
	);
};
export default WindowBlock;
