import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Bold,
	Italic,
	Sparkles,
	Type,
	Underline,
} from 'lucide-react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { FontPicker } from '../CustomControls/FontPicker';
import { NumberInput } from '../CustomControls/NumberInput';
import {
	FieldInput,
	PropertyRow,
	SliderField,
	ToggleButton,
	ToggleGroup,
} from '../CustomControls/PropertyControls';
import { ControlTemplate } from './ControlTemplate';
import { useControlState } from '../../hooks/useControlState';
import { useResolvedText } from '../../hooks/useProjectVariables';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
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

	/* An outline and a shadow of the letters themselves, which the shadow of
	   the block (a drop shadow of the whole box) cannot give. */
	const [outlineWidth, setOutlineWidth] = useControlState(
		0,
		`${id}-outlineWidth`,
	);
	const [outlineColor, setOutlineColor] = useControlState(
		'#090b11',
		`${id}-outlineColor`,
	);
	const [textShadowBlur, setTextShadowBlur] = useControlState(
		0,
		`${id}-textShadowBlur`,
	);
	const [textShadowX, setTextShadowX] = useControlState(0, `${id}-textShadowX`);
	const [textShadowY, setTextShadowY] = useControlState(2, `${id}-textShadowY`);
	const [textShadowColor, setTextShadowColor] = useControlState(
		'#090b11',
		`${id}-textShadowColor`,
	);

	/* Google families are fetched when the block shows them, not only when the
	   font is picked: a saved project must render with its font too. */
	useEffect(() => {
		if (fontSource === 'google' && fontFamily !== '') {
			void loadGoogleFont(fontFamily);
		}
	}, [fontFamily, fontSource]);

	/* What the canvas shows: project variables filled in */
	const shownText = useResolvedText(text);

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
								<div className='flex items-center gap-2'>
									<Type />
									<Label>Text</Label>
								</div>
							}
						>
							<Textarea
								aria-label='Text'
								className='min-h-16 text-xs md:text-xs'
								rows={2}
								onChange={(ev) => {
									setText(ev.target.value);
								}}
								value={text}
							></Textarea>

							<PropertyRow label='Font'>
								<div className='min-w-0 flex-1'>
									<FontPicker
										family={fontFamily}
										onChange={(family, source) => {
											setFontFamily(family);
											setFontSource(source);
										}}
									/>
								</div>
							</PropertyRow>

							<PropertyRow label='Weight'>
								<Select
									value={String(weight)}
									onValueChange={(value) => {
										// The B button and the weight are one setting.
										setIsBold(false);
										setFontWeight(Number(value));
									}}
								>
									<SelectTrigger className='h-7 w-full text-xs'>
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
							</PropertyRow>

							<PropertyRow label='Size'>
								<NumberInput
									suffix='px'
									onChange={(number) => {
										setTextSize(number.toString());
									}}
									number={parseInt(textSize)}
								></NumberInput>
							</PropertyRow>

							<div className='grid grid-cols-2 gap-1.5'>
								<FieldInput
									label='Line'
									title='Line height (0 keeps the font default)'
									suffix='×'
									step={0.1}
									value={lineHeight}
									onChange={(value) => {
										const next = parseFloat(value);
										if (Number.isFinite(next)) setLineHeight(Math.max(0, next));
									}}
								/>
								<FieldInput
									label='Spacing'
									title='Letter spacing'
									suffix='px'
									value={letterSpacing}
									onChange={(value) => {
										const next = parseFloat(value);
										if (Number.isFinite(next)) setLetterSpacing(next);
									}}
								/>
							</div>

							<PropertyRow label='Style'>
								<ToggleGroup>
									<ToggleButton
										label='Bold'
										active={isBold}
										onClick={() => setIsBold(!isBold)}
									>
										<Bold />
									</ToggleButton>
									<ToggleButton
										label='Italic'
										active={isItalic}
										onClick={() => setIsItalic(!isItalic)}
									>
										<Italic />
									</ToggleButton>
									<ToggleButton
										label='Underline'
										active={isUnderline}
										onClick={() => setIsUnderline(!isUnderline)}
									>
										<Underline />
									</ToggleButton>
								</ToggleGroup>
							</PropertyRow>

							<PropertyRow label='Align'>
								<ToggleGroup>
									{TEXT_ALIGN_OPTIONS.map((option) => {
										const Icon = ALIGN_ICONS[option.value];
										return (
											<ToggleButton
												key={option.value}
												label={option.label}
												active={textAlign === option.value}
												onClick={() => setTextAlign(option.value as TextAlign)}
											>
												<Icon />
											</ToggleButton>
										);
									})}
								</ToggleGroup>
							</PropertyRow>

							<PropertyRow label='Resizing'>
								<ToggleGroup>
									{TEXT_SIZING_OPTIONS.map((option) => (
										<ToggleButton
											key={option.value}
											label={option.hint}
											active={sizing === option.value}
											onClick={() => setSizing(option.value as TextSizing)}
											className='text-[11px]'
										>
											{option.label}
										</ToggleButton>
									))}
								</ToggleGroup>
							</PropertyRow>

							<ColorPicker
								isGradientEnable={false}
								color={color}
								onColorChange={setColor}
								label='Color'
							></ColorPicker>
						</CustomCollapse>

						{/* Outline and shadow of the letters */}
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2'>
									<Sparkles />
									<Label>Text effects</Label>
								</div>
							}
						>
							<SliderField
								label='Outline'
								max={20}
								unit='px'
								defaultValue={0}
								value={outlineWidth}
								onChange={setOutlineWidth}
							/>

							{outlineWidth > 0 && (
								<ColorPicker
									type='HexAlpha'
									isGradientEnable={false}
									color={outlineColor}
									onColorChange={setOutlineColor}
									label='Outline'
								></ColorPicker>
							)}

							<SliderField
								label='Shadow'
								max={40}
								unit='px'
								defaultValue={0}
								value={textShadowBlur}
								onChange={setTextShadowBlur}
							/>

							<div className='grid grid-cols-2 gap-1.5'>
								<FieldInput
									label='X'
									value={textShadowX}
									onChange={(value) => {
										const next = parseFloat(value);
										if (Number.isFinite(next)) setTextShadowX(next);
									}}
								/>
								<FieldInput
									label='Y'
									value={textShadowY}
									onChange={(value) => {
										const next = parseFloat(value);
										if (Number.isFinite(next)) setTextShadowY(next);
									}}
								/>
							</div>

							<ColorPicker
								type='HexAlpha'
								isGradientEnable={false}
								color={textShadowColor}
								onColorChange={setTextShadowColor}
								label='Shadow'
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
						WebkitTextStrokeWidth:
							outlineWidth > 0 ? `${outlineWidth}px` : undefined,
						WebkitTextStrokeColor: outlineWidth > 0 ? outlineColor : undefined,
						textShadow:
							textShadowBlur > 0 || textShadowX !== 0 || textShadowY !== 0
								? `${textShadowX}px ${textShadowY}px ${textShadowBlur}px ${textShadowColor}`
								: undefined,
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
					{editing ? undefined : shownText}
				</p>
			</ControlTemplate>
		</>
	);
};

export default TextControl;
