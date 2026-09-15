import { IconLetterT } from '@tabler/icons-react';
import React from 'react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { NumberInput } from '../CustomControls/NumberInput';
import { ControlTemplate } from './ControlTemplate';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TextSizing, TEXT_SIZING_OPTIONS } from '@/lib/blocks/catalog';

interface Props {
	id: string;
}

export const TextControl: React.FC<Props> = ({ id }) => {
	/* Component States */
	const [text, setText] = useControlState('lorem', `${id}-text`);
	const [color, setColor] = useControlState('#f3f4f6', `${id}-color`);
	const [textSize, setTextSize] = useControlState('24', `${id}-textSize`);
	const [isBold, setIsBold] = useControlState(false, `${id}-isBold`);
	const [isItalic, setIsItalic] = useControlState(false, `${id}-isItalic`);
	const [isUnderline, setIsUnderline] = useControlState(
		false,
		`${id}-isUnderline`,
	);
	// Blocks saved before sizing modes existed keep their fixed box.
	const [sizing, setSizing] = useControlState<TextSizing>(
		'fixed',
		`${id}-sizing`,
	);

	return (
		<>
			<ControlTemplate
				id={id}
				borderEditable={false}
				defaultHeight='45px'
				defaultWidth='85px'
				minHeight={'20px'}
				minWidth={'50px'}
				maxWidth={'2000px'}
				maxHeight={'2000px'}
				autoSize={
					sizing === 'auto'
						? 'both'
						: sizing === 'fixed-width'
							? 'height'
							: 'none'
				}
				onSizeInput={(axis) => {
					// Typing a width keeps the height automatic; a height fixes both.
					if (sizing === 'fixed') return;
					setSizing(axis === 'w' ? 'fixed-width' : 'fixed');
				}}
				menu={
					<>
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<Type size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Text</Label>
								</div>
							}
						>
							<Label className='text-xs text-muted-foreground'>
								Text Style
							</Label>
							{/* Text */}
							<div className='mx-auto flex w-full gap-2'>
								<Button
									variant={isBold ? 'default' : 'outline'}
									size='icon'
									className='flex-1 transition-all duration-200 hover:scale-105'
									onClick={() => {
										setIsBold(!isBold);
									}}
								>
									B
								</Button>
								<Button
									variant={isItalic ? 'default' : 'outline'}
									size='icon'
									className='flex-1 transition-all duration-200 hover:scale-105'
									onClick={() => {
										setIsItalic(!isItalic);
									}}
								>
									I
								</Button>
								<Button
									variant={isUnderline ? 'default' : 'outline'}
									size='icon'
									className='flex-1 transition-all duration-200 hover:scale-105'
									onClick={() => {
										setIsUnderline(!isUnderline);
									}}
								>
									U
								</Button>
							</div>

							<div className='flex flex-col gap-1.5 text-xs'>
								<Label className='text-xs text-muted-foreground'>Text</Label>
								<Textarea
									className='min-h-16 text-sm'
									rows={2}
									onChange={(ev) => {
										setText(ev.target.value);
									}}
									value={text}
								></Textarea>
							</div>

							<div className='flex flex-col gap-1.5 text-xs'>
								<Label className='text-xs text-muted-foreground'>
									Resizing
								</Label>
								<ToggleGroup
									type='single'
									variant='outline'
									size='sm'
									className='w-full'
									value={sizing}
									onValueChange={(value) =>
										value && setSizing(value as TextSizing)
									}
								>
									{TEXT_SIZING_OPTIONS.map((option) => (
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
							</div>

							<div className='flex flex-auto flex-row text-xs'>
								<Label className='my-auto text-xs text-muted-foreground'>
									Font Size
								</Label>
								<NumberInput
									onChange={(number) => {
										setTextSize(number.toString());
									}}
									number={parseInt(textSize)}
								></NumberInput>
								<Label className='my-auto ml-2 text-xs text-muted-foreground'>
									px
								</Label>
							</div>

							<ColorPicker
								isGradientEnable={false}
								color={color}
								onColorChange={setColor}
								label='Text Color'
							></ColorPicker>
						</CustomCollapse>
					</>
				}
			>
				<p
					style={{ color, fontSize: textSize + 'px' }}
					className={cn(
						// An outline, not a border: the hover must not resize the block.
						'my-auto flex flex-auto select-none overflow-hidden whitespace-pre-wrap hover:outline hover:outline-1 hover:outline-blue-500',
						sizing !== 'fixed' && 'break-words',
						isBold && 'poppins-font-family font-bold',
						isItalic && 'italic',
						isUnderline && 'underline',
					)}
				>
					{text}
				</p>
			</ControlTemplate>
		</>
	);
};

export default TextControl;
