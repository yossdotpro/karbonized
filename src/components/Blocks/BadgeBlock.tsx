import React from 'react';
import karbonized from '../../assets/karbonized.svg';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface Props {
	id: string;
}

export const BadgeBlock: React.FC<Props> = ({ id }) => {
	/* Component States */
	const [src, setSrc] = useControlState(karbonized, `${id}-src`);
	const [text, setText] = useControlState('@karbonized_app', `${id}-text`);
	const [color, setColor] = useControlState('#ffffff', `${id}-color`);

	return (
		<>
			<ControlTemplate
				id={id}
				borderEditable={false}
				defaultHeight='80px'
				defaultWidth='270px'
				minHeight={'40px'}
				minWidth={'120px'}
				maxWidth={'2000px'}
				maxHeight={'600px'}
				menu={
					<>
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<div className='h-2 w-4 rounded-full border-2 border-border'></div>
									<Label className='text-sm font-semibold'>Badge</Label>
								</div>
							}
						>
							{/*  Badge Color */}
							<>
								<ColorPicker
									isGradientEnable={false}
									color={color}
									onColorChange={setColor}
									label='Badge Color'
								></ColorPicker>
							</>

							{/*  Badge Text */}
							<>
								<Label className='text-xs text-muted-foreground'>Text</Label>
								<Input
									className='h-8 text-sm'
									onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
										setText(ev.target.value);
									}}
									value={text}
								></Input>
							</>

							{/* Image */}
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
						</CustomCollapse>
					</>
				}
			>
				{/* The block is the query container; the avatar, the text and the
				    padding follow its height (cqh), so the badge keeps its
				    proportions at any size. `cqh` inside an element refers to its
				    containing container, never to itself, hence the wrapper. */}
				<div
					style={{ containerType: 'size' }}
					className='flex h-full w-full flex-auto'
				>
					<div
						style={{
							background: color,
							border: color,
							padding: '12cqh',
						}}
						className='flex h-full w-full flex-auto overflow-hidden rounded-full border-none'
					>
						<div className='my-auto flex flex-auto items-center gap-[6cqh]'>
							<img
								style={{ height: '60cqh', width: '60cqh' }}
								className='my-auto aspect-square shrink-0 rounded-full bg-white object-cover'
								src={src}
							></img>
							<p
								style={{ fontSize: '25cqh', lineHeight: 1.1 }}
								className='my-auto flex flex-auto overflow-hidden font-bold'
							>
								{text}
							</p>
						</div>
					</div>
				</div>
			</ControlTemplate>
		</>
	);
};

export default BadgeBlock;
