import {
	IconBattery3,
	IconBorderStyle,
	IconCellSignal1,
	IconDeviceMobile,
	IconPalette,
	IconSignal4g,
	IconWifi,
} from '@tabler/icons-react';
import React, { useRef, useState } from 'react';
import { Button } from '../ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import karbonized from '../../assets/logo.svg';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import {
	useControlsStore,
	useWorkspaceStore,
	useHistoryStore,
} from '../../stores';
import { buildDynamicBackgroundColors } from '../../utils/dynamicBackgroundColors';

/* Devices Mockups */
import iphoneX from '../../assets/device_mockups/iphonex.png';
import iphone14pro from '../../assets/device_mockups/iphone14pro.png';
import iphone14 from '../../assets/device_mockups/iphone14.png';
import pixel5 from '../../assets/device_mockups/google_pixel5.png';
import pixel4 from '../../assets/device_mockups/google_pixel4.png';
import galaxyS10 from '../../assets/device_mockups/galaxyS10.png';
import galaxyS20 from '../../assets/device_mockups/galaxyS20.png';
import galaxyNote10 from '../../assets/device_mockups/galaxy_note10.png';

/* Thumbnails */
import iphoneX_thumb from '../../assets/device_mockups/iphonex_thumb.png';
import iphone14pro_thumb from '../../assets/device_mockups/iphone14pro_thumb.png';
import iphone14_thumb from '../../assets/device_mockups/iphone14_thumb.png';
import pixel5_thumb from '../../assets/device_mockups/google_pixel5_thumb.png';
import pixel4_thumb from '../../assets/device_mockups/google_pixel4_thumb.png';
import galaxyS10_thumb from '../../assets/device_mockups/galaxyS10_thumb.png';
import galaxyS20_thumb from '../../assets/device_mockups/galaxyS20_thumb.png';
import galaxyNote10_thumb from '../../assets/device_mockups/galaxy_note10_thumb.png';

import { Portal } from 'react-portal';

interface Props {
	id: string;
}

interface Device {
	name: models;
	img: string;
	thumb: string;
}

const devices: Device[] = [
	{ name: 'iPhone X', img: iphoneX, thumb: iphoneX_thumb },
	{ name: 'iPhone 14', img: iphone14, thumb: iphone14_thumb },
	{ name: 'iPhone 14 Pro', img: iphone14pro, thumb: iphone14pro_thumb },
	{ name: 'Google Pixel 4', img: pixel4, thumb: pixel4_thumb },
	{ name: 'Google Pixel 5', img: pixel5, thumb: pixel5_thumb },
	{ name: 'Samsung Galaxy S10', img: galaxyS10, thumb: galaxyS10_thumb },
	{ name: 'Samsung Galaxy S20', img: galaxyS20, thumb: galaxyS20_thumb },
	{
		name: 'Samsung Galaxy Note 10',
		img: galaxyNote10,
		thumb: galaxyNote10_thumb,
	},
];

type models =
	| 'adaptive'
	| 'iPhone X'
	| 'iPhone 14'
	| 'iPhone 14 Pro'
	| 'Google Pixel 4'
	| 'Google Pixel 5'
	| 'Samsung Galaxy S10'
	| 'Samsung Galaxy S20'
	| 'Samsung Galaxy Note 10';

export const PhoneBlock: React.FC<Props> = ({ id }) => {
	/* Component States */
	const [showModal, setShowModal] = useState(false);
	const contentImageRef = useRef<HTMLImageElement>(null);

	const [template, setTemplate] = useControlState(
		'iPhone X',
		`${id}-device_model`,
	);

	const [src, setSrc] = useControlState(karbonized, `${id}-src`);
	const [notchWidth, setNotchWidth] = useControlState(80, `${id}-notchWidth`);
	const [screenRadius, setScreenRadius] = useControlState(
		20,
		`${id}-screenRadius`,
	);
	const [phoneRadius, setPhoneRadius] = useControlState(
		30,
		`${id}-phoneRadius`,
	);
	const [borderColor, setBorderColor] = useControlState(
		'#b4b4b4',
		`${id}-borderColor`,
	);
	const [statusColor, setStatusColor] = useControlState(
		'#FFFFFF',
		`${id}-statusColor`,
	);
	const [statusControlsColor, setStatusControlsColor] = useControlState(
		'#000000',
		`${id}-statusControlsColor`,
	);

	const [drop, setDrop] = useControlState(false, `${id}-drop`);
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
				'Failed to create dynamic background from phone mockup image',
				error,
			);
		}
	};

	return (
		<>
			<ControlTemplate
				id={id}
				border={0}
				borderEditable={false}
				minHeight={'618px'}
				minWidth={'318px'}
				maxWidth={template === 'adaptive' ? '1000px' : '318px'}
				maxHeight={template === 'adaptive' ? '2000px' : '618px'}
				defaultHeight={'620px'}
				defaultWidth={'320px'}
				onCreateDynamicBackground={handleCreateDynamicBackground}
				menu={
					<>
						{/* Border Settings */}
						{template === 'adaptive' && (
							<CustomCollapse
								menu={
									<div className='flex items-center gap-2 text-foreground'>
										<IconBorderStyle
											size={18}
											className='text-muted-foreground'
										/>
										<Label className='text-sm font-semibold'>Borders</Label>
									</div>
								}
							>
								{/* Phone Radius */}
								<div className='flex flex-auto p-2 text-xs '>
									<Label className='my-auto p-2 text-xs text-muted-foreground'>
										Phone Radius:
									</Label>
									<Slider
										className='my-auto flex-1'
										onValueChange={(ev) => {
											setPhoneRadius(ev[0]);
										}}
										value={[phoneRadius]}
										max={30}
									></Slider>
								</div>

								{/* Screen Radius */}
								<div className='flex flex-auto p-2 text-xs '>
									<Label className='my-auto p-2 text-xs text-muted-foreground'>
										Screen Radius:
									</Label>
									<Slider
										className='my-auto flex-1'
										onValueChange={(ev) => {
											setScreenRadius(ev[0]);
										}}
										value={[screenRadius]}
										max={30}
									></Slider>
								</div>
							</CustomCollapse>
						)}

						{/* Color Options */}
						{template === 'adaptive' && (
							<CustomCollapse
								menu={
									<div className='flex items-center gap-2 text-foreground'>
										<IconPalette size={18} className='text-muted-foreground' />
										<Label className='text-sm font-semibold'>Colors</Label>
									</div>
								}
							>
								{/* Show Line Numbers */}
								<div className='flex flex-auto flex-col p-2'>
									<ColorPicker
										color={borderColor}
										onColorChange={setBorderColor}
										isGradientEnable={false}
										label='Border Color'
									></ColorPicker>

									<ColorPicker
										color={statusColor}
										onColorChange={setStatusColor}
										isGradientEnable={false}
										label='Status Bar Color'
									></ColorPicker>

									<ColorPicker
										color={statusControlsColor}
										onColorChange={setStatusControlsColor}
										isGradientEnable={false}
										label='Icons Color'
									></ColorPicker>
								</div>
							</CustomCollapse>
						)}

						{/* Device Settings */}
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconDeviceMobile
										size={18}
										className='text-muted-foreground'
									/>
									<Label className='text-sm font-semibold'>Phone Mockup</Label>
								</div>
							}
						>
							{/* Device */}
							<label className='my-auto text-xs'>Device</label>
							<button
								onClick={() => {
									setShowModal(true);
								}}
								className='inline-flex items-center justify-center transition-colors h-20 cursor-pointer rounded-surface bg-muted/60 p-4 hover:bg-accent'
							>
								<div className='flex gap-2'>
									<img
										className='mx-auto my-auto flex h-10 flex-auto shadow-2xl'
										src={
											devices.find((item) => item.name === template)?.img ??
											iphone14
										}
									></img>

									<p className='my-auto cursor-pointer'>
										{devices.find((item) => item.name === template)?.name}
									</p>
								</div>
							</button>

							{/* Source */}
							<>
								<Label className='text-xs text-muted-foreground'>Image</Label>
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

							{template === 'adaptive' && (
								<>
									{/* Notch Witdh */}
									<div className='flex flex-auto p-2 text-xs '>
										<Label className='my-auto p-2 text-xs text-muted-foreground'>
											Notch Width:
										</Label>
										<Slider
											className='my-auto flex-1'
											onValueChange={(ev) => {
												setNotchWidth(ev[0]);
											}}
											value={[notchWidth]}
											max={50}
										></Slider>
									</div>

									{/* Drop Design */}
									<div className='flex flex-col p-5'>
										<div className='flex flex-row gap-2'>
											<p className='my-auto text-xs'>Drop</p>
											<Checkbox
												onCheckedChange={(checked) => {
													setDrop(checked as boolean);
												}}
												checked={drop}
											></Checkbox>
										</div>
									</div>
								</>
							)}
						</CustomCollapse>
					</>
				}
			>
				<div className='relative flex flex-auto flex-col'>
					{/* Adaptive Model */}
					{template === 'adaptive' && (
						<>
							<div className='flex flex-auto flex-row'>
								<div
									style={{
										borderRadius: phoneRadius + 'px',
										borderColor,
									}}
									className='flex flex-auto select-none flex-col border-4 bg-black p-3'
								>
									{/* Status Bar */}
									<div
										style={{
											borderTopLeftRadius: screenRadius + 'px',
											borderTopRightRadius: screenRadius + 'px',
											backgroundColor: statusColor,
										}}
										className='flex max-h-9 flex-auto overflow-hidden border-0'
									>
										<div
											style={{ color: statusControlsColor }}
											className='my-auto flex flex-auto  p-1'
										>
											<p className='my-auto ml-3 text-xs font-bold'>20:02</p>

											<div className='ml-auto mr-3 flex flex-row '>
												<IconWifi
													className='flex flex-auto'
													size={18}
												></IconWifi>
												<IconSignal4g
													className='flex flex-auto'
													size={18}
												></IconSignal4g>
												<IconCellSignal1
													className='flex flex-auto'
													size={18}
												></IconCellSignal1>
												<IconBattery3
													className='flex flex-auto'
													size={18}
												></IconBattery3>
											</div>
										</div>
									</div>

									{/* Image */}
									<img
										ref={contentImageRef}
										style={{
											marginTop: '-8px',
											borderBottomLeftRadius: screenRadius + 'px',
											borderBottomRightRadius: screenRadius + 'px',
										}}
										className='flex h-56 max-h-full max-w-full flex-auto select-none bg-white'
										src={src}
										crossOrigin='anonymous'
									></img>

									{/* Notch */}
									<div
										style={{ width: 'calc(100% - 2.5rem)' }}
										className='absolute flex flex-auto'
									>
										<div
											style={{
												borderTopLeftRadius: drop ? '0px' : '9999px',
												borderTopRightRadius: drop ? '0px' : '9999px',
												width: notchWidth + 'px',
												marginTop: drop ? '-1px' : '2px',
											}}
											className='mx-auto flex rounded-full bg-black p-4'
										></div>
									</div>
								</div>

								{/* Buttons */}
								<div
									style={{ marginLeft: '-12px', maxWidth: '12px' }}
									className='mt-32 flex h-16  flex-auto rounded bg-black p-1'
								></div>
							</div>

							{/* Buttons */}
							<div
								style={{ marginTop: '-7px' }}
								className='ml-20 flex h-1 max-h-1 w-6 flex-auto   rounded bg-black p-1'
							></div>
						</>
					)}

					{/* iPhone X */}
					{template === 'iPhone X' && (
						<>
							<div className='absolute flex h-full w-full px-7 pb-6 pt-10'>
								<div className='mx-auto flex h-full w-full overflow-hidden rounded-[2rem]'>
									<img
										ref={contentImageRef}
										className='mx-auto my-auto h-full w-full bg-white'
										src={src}
										crossOrigin='anonymous'
									></img>
								</div>
							</div>

							<img className='absolute' src={iphoneX}></img>
						</>
					)}

					{/* iPhone 14 Pro */}
					{template === 'iPhone 14 Pro' && (
						<>
							<div className='absolute flex h-full w-full px-8 pb-11 pt-8'>
								<div className='mx-auto flex h-full w-full overflow-hidden rounded-[2rem]'>
									<img
										ref={contentImageRef}
										className='mask mx-auto my-auto h-full w-full bg-white'
										src={src}
										crossOrigin='anonymous'
									></img>
								</div>
							</div>

							<img className='mask absolute' src={iphone14pro}></img>
						</>
					)}

					{/* iPhone 14  */}
					{template === 'iPhone 14' && (
						<>
							<div className='h-full w-full px-8 pb-28 pt-8'>
								<div className='mx-auto flex h-full w-full overflow-hidden rounded-[2rem]'>
									<img
										ref={contentImageRef}
										className='mx-auto my-auto flex h-134 max-h-full w-full bg-white'
										src={src}
										crossOrigin='anonymous'
									></img>
								</div>
							</div>

							<img className='absolute flex flex-auto' src={iphone14}></img>
						</>
					)}

					{/* Google Pixel 5  */}
					{template === 'Google Pixel 5' && (
						<>
							<div className='h-full w-full px-10 pb-16 pt-8'>
								<div className='mx-auto flex h-full w-full overflow-hidden rounded-[2rem]'>
									<img
										ref={contentImageRef}
										className='mask mx-auto my-auto flex h-126 w-full bg-white'
										src={src}
										crossOrigin='anonymous'
									></img>
								</div>
							</div>

							<img className='mask absolute flex flex-auto' src={pixel5}></img>
						</>
					)}

					{/* Google Pixel 4 */}
					{template === 'Google Pixel 4' && (
						<>
							<div className='h-full w-full px-4 pb-0 pt-12'>
								<div className='mx-auto flex h-full w-full overflow-hidden rounded-[2rem]'>
									<img
										ref={contentImageRef}
										className='mask mx-auto my-auto flex h-144 w-full bg-white'
										src={src}
										crossOrigin='anonymous'
									></img>
								</div>
							</div>

							<img className='mask absolute flex flex-auto' src={pixel4}></img>
						</>
					)}

					{/* Samsung Galaxy S10 */}
					{template === 'Samsung Galaxy S10' && (
						<>
							<div className='h-full w-full px-4 pb-0 pt-7'>
								<div className='mx-auto flex h-full w-full overflow-hidden rounded-[1rem]'>
									<img
										ref={contentImageRef}
										className='mask mx-auto my-auto flex h-148 w-full bg-white'
										src={src}
										crossOrigin='anonymous'
									></img>
								</div>
							</div>

							<img className=' absolute flex flex-auto' src={galaxyS10}></img>
						</>
					)}

					{/* Samsung Galaxy S20 */}
					{template === 'Samsung Galaxy S20' && (
						<>
							<div className='h-full w-full px-9 pb-7 pt-8'>
								<div className='mx-auto flex h-full w-full overflow-hidden rounded-[1rem]'>
									<img
										ref={contentImageRef}
										className='mask mx-auto my-auto flex h-140 w-full bg-white'
										src={src}
										crossOrigin='anonymous'
									></img>
								</div>
							</div>

							<img className='absolute flex flex-auto' src={galaxyS20}></img>
						</>
					)}

					{/* Samsung Galaxy Note 10 */}
					{template === 'Samsung Galaxy Note 10' && (
						<>
							<div className='h-full w-full px-5 pb-6 pt-6'>
								<div className='mx-auto flex h-full w-full overflow-hidden rounded-[1rem]'>
									<img
										ref={contentImageRef}
										className='mask mx-auto my-auto flex h-142 w-full bg-white'
										src={src}
										crossOrigin='anonymous'
									></img>
								</div>
							</div>

							<img className='absolute flex flex-auto' src={galaxyNote10}></img>
						</>
					)}
				</div>
			</ControlTemplate>

			<Dialog open={showModal} onOpenChange={setShowModal}>
				<DialogContent className='overflow-hidden'>
					<DialogHeader>
						<DialogTitle>Devices</DialogTitle>
					</DialogHeader>

					<div className='flex flex-auto select-none flex-col overflow-hidden'>
						{/* Devices List */}
						<div className='mx-auto flex max-h-80 flex-auto flex-wrap gap-3 overflow-auto '>
							{devices.map((item) => (
								<div key={item.name} className='flex w-32 flex-auto flex-col'>
									<button
										onClick={() => {
											setTemplate(item.name);
										}}
										className='h-28 rounded-surface bg-muted/60 p-3 hover:bg-accent'
									>
										<img
											className='mx-auto flex h-full '
											src={item.thumb}
										></img>
									</button>
									<p className='mx-auto'>{item.name}</p>
								</div>
							))}
						</div>
					</div>

					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setShowModal(false);
							}}
						>
							Cancel
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
export default PhoneBlock;
