import { IconPalette, IconQrcode } from '@tabler/icons-react';
import React, { useId, useState } from 'react';
import karbonized from '../../assets/logo.svg';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { HexAlphaColorPicker, HexColorPicker } from 'react-colorful';
import { QRCodeSVG } from 'qrcode.react';
import { useControlState } from '../../hooks/useControlState';

interface Props {
	id: string;
}

export const QrControl: React.FC<Props> = ({ id }) => {
	/* Component States */
	const [text, setText] = useControlState('karbonized', `${id}-text`);
	const [backgroundColor, setBackgroundColor] = useControlState(
		'#1e408400',
		`${id}-backgroundColor`,
	);
	const [foregroundColor, setforegroundColor] = useControlState(
		'#090c12',
		`${id}-foregroundColor`,
	);

	return (
		<>
			<ControlTemplate
				id={id}
				shadowEditable={false}
				borderEditable={false}
				defaultHeight='150px'
				defaultWidth='150px'
				minHeight={'40px'}
				minWidth={'40px'}
				maxWidth={'2000px'}
				maxHeight={'2000px'}
				menu={
					<>
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconPalette size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Colors</Label>
								</div>
							}
						>
							<ColorPicker
								isGradientEnable={false}
								color={foregroundColor}
								onColorChange={setforegroundColor}
								label='Foreground Color'
							></ColorPicker>

							<ColorPicker
								isGradientEnable={false}
								color={backgroundColor}
								onColorChange={setBackgroundColor}
								label='Background Color'
							></ColorPicker>
						</CustomCollapse>

						<CustomCollapse
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconQrcode size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>QR Code</Label>
								</div>
							}
						>
							<Label className='text-xs text-muted-foreground'>Text</Label>
							<Input
								className='h-8 text-sm'
								onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
									setText(ev.target.value);
								}}
								value={text}
							></Input>
						</CustomCollapse>
					</>
				}
			>
				{/* The code is drawn at a fixed size and scaled to the block */}
				<QRCodeSVG
					bgColor={backgroundColor}
					fgColor={foregroundColor}
					size={512}
					style={{ width: '100%', height: '100%' }}
					className='flex flex-auto'
					value={text}
				></QRCodeSVG>
			</ControlTemplate>
		</>
	);
};

export default QrControl;
