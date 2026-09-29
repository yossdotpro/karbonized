import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import {
	PropertyRow,
	SliderField,
	ToggleButton,
	ToggleGroup,
} from './PropertyControls';

interface ShadowValue {
	color: string;
	x: number;
	y: number;
	blur: number;
	spread: number;
	inset: boolean;
}

interface Props {
	value: string;
	onChange: (value: string) => void;
	label?: string;
}

const parseShadow = (shadowStr: string): ShadowValue[] => {
	if (!shadowStr || shadowStr === 'none') return [];

	const shadows: ShadowValue[] = [];

	// Split by commas but preserve rgba/rgb functions
	const parts = [];
	let start = 0;
	let depth = 0;

	for (let i = 0; i < shadowStr.length; i++) {
		const char = shadowStr[i];
		if (char === '(') depth++;
		if (char === ')') depth--;
		if (char === ',' && depth === 0) {
			parts.push(shadowStr.substring(start, i).trim());
			start = i + 1;
		}
	}
	parts.push(shadowStr.substring(start).trim());

	parts.forEach((part) => {
		// Handle both color-first and color-last formats
		let inset = false;
		let color = '#000000';
		let x = 0;
		let y = 0;
		let blur = 0;
		let spread = 0;

		if (part.startsWith('inset')) {
			inset = true;
			part = part.replace(/^inset\s+/, '').trim();
		}

		// Find rgba/rgb color first (most complex case)
		const rgbaMatch = part.match(/(rgba?\([^)]+)\s*/);
		if (rgbaMatch) {
			color = rgbaMatch[1];
			part = part.replace(rgbaMatch[1], '').trim();
		} else {
			// Find hex or named color
			const colorMatch = part.match(/(#[a-f0-9]+|[a-z]+)\s*/i);
			if (colorMatch) {
				color = colorMatch[1];
				part = part.replace(colorMatch[1], '').trim();
			}
		}

		// Parse remaining numeric values
		const numericValues = part.split(/\s+/).filter((v) => v.trim());
		x = parseInt(numericValues[0]) || 0;
		y = parseInt(numericValues[1]) || 0;
		blur = parseInt(numericValues[2]) || 0;
		spread = parseInt(numericValues[3]) || 0;

		shadows.push({
			inset,
			color,
			x,
			y,
			blur,
			spread,
		});
	});

	return shadows;
};

const formatShadow = (shadows: ShadowValue[]): string => {
	if (shadows.length === 0) return 'none';

	return shadows
		.map((shadow) => {
			const parts = [];
			if (shadow.inset) parts.push('inset');
			parts.push(shadow.color);
			parts.push(`${shadow.x}px`);
			parts.push(`${shadow.y}px`);
			parts.push(`${shadow.blur}px`);
			parts.push(`${shadow.spread}px`);
			return parts.join(' ');
		})
		.join(', ');
};

export const ShadowEditor: React.FC<Props> = ({ value, onChange, label }) => {
	const [shadows, setShadows] = useState<ShadowValue[]>(() =>
		parseShadow(value),
	);
	const [syncedValue, setSyncedValue] = useState(value);

	// Follow changes to the value prop (undo, presets, other panels).
	if (value !== syncedValue) {
		setSyncedValue(value);
		setShadows(parseShadow(value));
	}

	const updateShadows = (newShadows: ShadowValue[]) => {
		setShadows(newShadows);
		onChange(formatShadow(newShadows));
	};

	const addShadow = () => {
		const newShadow: ShadowValue = {
			color: '#000000',
			x: 0,
			y: 2,
			blur: 4,
			spread: 0,
			inset: false,
		};
		updateShadows([...shadows, newShadow]);
	};

	const removeShadow = (index: number) => {
		const newShadows = shadows.filter((_, i) => i !== index);
		updateShadows(newShadows);
	};

	const updateShadow = (index: number, updates: Partial<ShadowValue>) => {
		const newShadows = [...shadows];
		newShadows[index] = { ...newShadows[index], ...updates };
		updateShadows(newShadows);
	};

	return (
		<div className='space-y-2'>
			<div className='flex min-h-6 items-center gap-2'>
				{label && (
					<span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>
						{label}
					</span>
				)}
				<button
					type='button'
					onClick={addShadow}
					className='ml-auto flex h-6 items-center gap-1 rounded-[5px] px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
				>
					<Plus className='size-3.5' />
					Add
				</button>
			</div>

			{shadows.length === 0 && (
				<p className='rounded-control border border-dashed border-border py-2 text-center text-[11px] text-muted-foreground'>
					No shadow
				</p>
			)}

			{shadows.map((shadow, index) => (
				<div
					key={index}
					className='space-y-0.5 rounded-control border border-border p-2'
				>
					<div className='flex items-center gap-2'>
						<span className='text-[11px] font-medium text-muted-foreground'>
							{shadows.length > 1 ? `Shadow ${index + 1}` : 'Shadow'}
						</span>
						<button
							type='button'
							title='Remove shadow'
							aria-label='Remove shadow'
							onClick={() => removeShadow(index)}
							className='ml-auto flex size-6 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive'
						>
							<X className='size-3.5' />
						</button>
					</div>

					<ColorPicker
						type='HexAlpha'
						isGradientEnable={false}
						color={shadow.color}
						onColorChange={(color) => updateShadow(index, { color })}
						label='Color'
					/>

					<PropertyRow label='Type'>
						<ToggleGroup>
							<ToggleButton
								label='Outside'
								active={!shadow.inset}
								onClick={() => updateShadow(index, { inset: false })}
							>
								Outside
							</ToggleButton>
							<ToggleButton
								label='Inside'
								active={shadow.inset}
								onClick={() => updateShadow(index, { inset: true })}
							>
								Inside
							</ToggleButton>
						</ToggleGroup>
					</PropertyRow>

					<SliderField
						label='X'
						unit='px'
						min={-100}
						max={100}
						value={shadow.x}
						onChange={(x) => updateShadow(index, { x })}
					/>
					<SliderField
						label='Y'
						unit='px'
						min={-100}
						max={100}
						value={shadow.y}
						onChange={(y) => updateShadow(index, { y })}
					/>
					<SliderField
						label='Blur'
						unit='px'
						min={0}
						max={200}
						value={shadow.blur}
						onChange={(blur) => updateShadow(index, { blur })}
					/>
					<SliderField
						label='Spread'
						unit='px'
						min={-50}
						max={50}
						value={shadow.spread}
						onChange={(spread) => updateShadow(index, { spread })}
					/>
				</div>
			))}
		</div>
	);
};
