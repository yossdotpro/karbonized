import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Type,
} from 'lucide-react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { FontPicker } from '../CustomControls/FontPicker';
import { NumberInput } from '../CustomControls/NumberInput';
import { ControlTemplate } from './ControlTemplate';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { cn } from '@/lib/utils';
import {
	type TextAlign,
	type TextSizing,
	TEXT_ALIGN_OPTIONS,
	TEXT_SIZING_OPTIONS,
} from '@/lib/blocks/catalog';
import {
	DEFAULT_FONT_FAMILY,
	FONT_WEIGHTS,
	type FontSource,
	fontStack,
	loadGoogleFont,
} from '@/lib/fonts/fonts';

interface Props {
	id: string;
}

const ALIGN_ICONS = {
	left: AlignLeft,
	center: AlignCenter,
	right: AlignRight,
	justify: AlignJustify,
} as const;

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

	/* Typography */
	const [fontFamily, setFontFamily] = useControlState(
		DEFAULT_FONT_FAMILY,
		`${id}-fontFamily`,
	);
	const [fontSource, setFontSource] = useControlState<FontSource | 'default'>(
		'default',
		`${id}-fontSource`,
	);
	const [fontWeight, setFontWeight] = useControlState(400, `${id}-fontWeight`);
	const [textAlign, setTextAlign] = useControlState<TextAlign>(
		'left',
		`${id}-textAlign`,
	);
	// 0 keeps the browser default, so old blocks look the same.
	const [lineHeight, setLineHeight] = useControlState(0, `${id}-lineHeight`);
	const [letterSpacing, setLetterSpacing] = useControlState(
		0,
		`${id}-letterSpacing`,
	);

	/* Google families are fetched when the block shows them, not only when the
	   font is picked: a saved project must render with its font too. */
	useEffect(() => {
		if (fontSource === 'google' && fontFamily !== '') {
			void loadGoogleFont(fontFamily);
		}
	}, [fontFamily, fontSource]);

	/* Editing the text on the canvas */
	const [editing, setEditing] = useState(false);
	const paragraph = useRef<HTMLParagraphElement>(null);

	/* The paragraph is uncontrolled while it is edited: React must not rewrite
	   it under the caret. Its text is filled in after the render that turns
	   editing on (React empties it then) and read back on blur. */
	useLayoutEffect(() => {
		const element = paragraph.current;
		if (!editing || !element) return;

		element.textContent = text;
		element.focus();

		const range = document.createRange();
		range.selectNodeContents(element);
		range.collapse(false);
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		// The text of the block only matters when editing starts.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editing]);

	const stopEditing = () => {
		const element = paragraph.current;
		setEditing(false);
		if (element) setText(element.textContent ?? '');
	};

	const weight = isBold ? 700 : fontWeight;

	return (
		<>
			<ControlTemplate
				id={id}
				borderEditable={false}
				defaultHeight='45px'
				defaultWidth='85px'
				minHeight={'20px'}
				minWidth={'50px'}
				maxWidth={'4000px'}
				maxHeight={'4000px'}
				autoSize={
					sizing === 'auto'
						? 'both'
						: sizing === 'fixed-width'
							? 'height'
							: 'none'
				}
				onDoubleClick={() => {
					setEditing(true);
				}}
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
							<div className='flex flex-col gap-1.5 text-xs'>
								<Label className='text-xs text-muted-foreground'>Font</Label>
								<FontPicker
									family={fontFamily}
									onChange={(family, source) => {
										setFontFamily(family);
										setFontSource(source);
									}}
								/>
							</div>

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

							<div className='flex flex-col gap-1.5 text-xs'>
								<Label className='text-xs text-muted-foreground'>
									Alignment
								</Label>
								<ToggleGroup
									type='single'
									variant='outline'
									size='sm'
									className='w-full'
									value={textAlign}
									onValueChange={(value) =>
										value && setTextAlign(value as TextAlign)
									}
								>
									{TEXT_ALIGN_OPTIONS.map((option) => {
										const Icon = ALIGN_ICONS[option.value];
										return (
											<ToggleGroupItem
												key={option.value}
												value={option.value}
												title={option.label}
												aria-label={option.label}
												className='flex-1'
											>
												<Icon className='size-4' />
											</ToggleGroupItem>
										);
									})}
								</ToggleGroup>
							</div>

							<div className='flex flex-col gap-1.5 text-xs'>
								<Label className='text-xs text-muted-foreground'>Weight</Label>
								<Select
									value={String(weight)}
									onValueChange={(value) => {
										// The B button and the weight are one setting.
										setIsBold(false);
										setFontWeight(Number(value));
									}}
								>
									<SelectTrigger className='h-8 text-sm'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{FONT_WEIGHTS.map((value) => (
											<SelectItem key={value} value={String(value)}>
												{value}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
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

							<div className='flex flex-auto flex-row text-xs'>
								<Label className='my-auto text-xs text-muted-foreground'>
									Line Height
								</Label>
								<NumberInput
									/* 0 keeps the default line height of the font */
									onChange={(number) => {
										setLineHeight(Math.max(0, number) / 10);
									}}
									number={Math.round(lineHeight * 10)}
								></NumberInput>
								<Label className='my-auto ml-2 text-xs text-muted-foreground'>
									×10
								</Label>
							</div>

							<div className='flex flex-auto flex-row text-xs'>
								<Label className='my-auto text-xs text-muted-foreground'>
									Letter Spacing
								</Label>
								<NumberInput
									onChange={setLetterSpacing}
									number={letterSpacing}
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
					ref={paragraph}
					contentEditable={editing}
					suppressContentEditableWarning
					spellCheck={false}
					onBlur={editing ? stopEditing : undefined}
					onKeyDown={(event) => {
						if (!editing) return;
						event.stopPropagation();
						if (event.key === 'Escape') paragraph.current?.blur();
					}}
					/* While editing, clicks place the caret instead of dragging */
					onMouseDown={(event) => {
						if (editing) event.stopPropagation();
					}}
					onTouchStart={(event) => {
						if (editing) event.stopPropagation();
					}}
					style={{
						color,
						fontSize: textSize + 'px',
						fontFamily: fontStack(fontFamily),
						fontWeight: weight,
						textAlign,
						lineHeight: lineHeight > 0 ? lineHeight : undefined,
						letterSpacing:
							letterSpacing !== 0 ? `${letterSpacing}px` : undefined,
					}}
					className={cn(
						// A block box, not a flex one, so `text-align` reaches the lines.
						// An outline, not a border: the hover must not resize the block.
						'my-auto block w-full flex-auto select-none overflow-hidden whitespace-pre-wrap hover:outline hover:outline-1 hover:outline-blue-500',
						sizing !== 'fixed' && 'break-words',
						// The app font only styles bold text that uses no font of its own.
						isBold && fontFamily === '' && 'poppins-font-family',
						isItalic && 'italic',
						isUnderline && 'underline',
						editing &&
							'cursor-text select-text outline outline-1 outline-blue-500',
					)}
				>
					{editing ? undefined : text}
				</p>
			</ControlTemplate>
		</>
	);
};

export default TextControl;
