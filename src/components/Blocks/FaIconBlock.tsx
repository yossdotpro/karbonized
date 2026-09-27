import React from 'react';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import { FaIcon } from '../FaIcon';
import { IconSticker } from '@tabler/icons-react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { IconPickerField } from '../CustomControls/IconPicker';
import { PropertyRow } from '../CustomControls/PropertyControls';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';

interface Props {
	id: string;
}

const FaIconBlock: React.FC<Props> = ({ id }) => {
	/* Component States */
	const [icon, setIcon] = useControlState('FaFontAwesome', `${id}-icon`);
	const [iconColor, setIconColor] = useControlState(
		'#ffffff',
		`${id}-iconColor`,
	);

	return (
		<>
			<ControlTemplate
				id={id}
				borderEditable={false}
				defaultHeight='120px'
				defaultWidth='120px'
				minHeight={'20px'}
				minWidth={'20px'}
				maxWidth={'800px'}
				maxHeight={'800px'}
				menu={
					<>
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2'>
									<IconSticker />
									<Label>Icon</Label>
								</div>
							}
						>
							<PropertyRow label='Icon'>
								<IconPickerField value={icon} onChange={setIcon} />
							</PropertyRow>

							{/* Icon Color */}
							<ColorPicker
								type='HexAlpha'
								label='Color'
								color={iconColor}
								isGradientEnable={false}
								onColorChange={(color) => {
									setIconColor(color);
								}}
							></ColorPicker>

							{/* Text */}
						</CustomCollapse>
					</>
				}
			>
				<FaIcon
					className='flex max-h-full w-full max-w-full flex-auto select-none'
					style={{ color: iconColor }}
					icon={icon}
				></FaIcon>
			</ControlTemplate>
		</>
	);
};

export default FaIconBlock;
