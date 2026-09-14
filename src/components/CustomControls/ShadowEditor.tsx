import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from './ColorPicker';
import { Badge } from '@/components/ui/badge';
import { Plus, X, RotateCcw } from 'lucide-react';

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
	const [shadows, setShadows] = useState<ShadowValue[]>(parseShadow(value));

	// Sync shadows when value prop changes
	useEffect(() => {
		setShadows(parseShadow(value));
	}, [value]);

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

	const clearAll = () => {
		updateShadows([]);
	};

	return (
		<div className='space-y-3'>
			{label && (
				<Label className='text-xs text-muted-foreground'>{label}</Label>
			)}

			{shadows.length > 0 && (
				<div className='flex items-center justify-between'>
					<span className='text-xs text-muted-foreground'>
						{shadows.length} shadow{shadows.length !== 1 ? 's' : ''}
					</span>
					<Button
						onClick={clearAll}
						size='sm'
						variant='ghost'
						className='h-6 px-2 text-xs'
					>
						<RotateCcw className='h-3 w-3 mr-1' />
						Clear All
					</Button>
				</div>
			)}

			<div className='space-y-4'>
				{shadows.map((shadow, index) => (
					<div key={index} className='space-y-3 p-3 border rounded-surface'>
						<div className='flex items-center justify-between'>
							<span className='text-[13px] font-medium'>
								Shadow {index + 1}
							</span>
							<Button
								onClick={() => removeShadow(index)}
								size='sm'
								variant='ghost'
								className='h-6 w-6 p-0 hover:bg-destructive/15'
							>
								<X className='h-3 w-3 text-destructive' />
							</Button>
						</div>

						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label className='text-xs'>Color</Label>
								<ColorPicker
									isGradientEnable={false}
									color={shadow.color}
									onColorChange={(color) => updateShadow(index, { color })}
									label=''
								/>
							</div>

							<div className='space-y-2'>
								<Label className='text-xs'>Type</Label>
								<div className='flex items-center space-x-2'>
									<Switch
										checked={shadow.inset}
										onCheckedChange={(inset) => updateShadow(index, { inset })}
									/>
									<span className='text-xs text-muted-foreground'>
										{shadow.inset ? 'Inset' : 'Outset'}
									</span>
								</div>
							</div>
						</div>

						<div className='space-y-3'>
							<div className='space-y-2'>
								<Label className='text-xs'>X Offset: {shadow.x}px</Label>
								<Slider
									value={[shadow.x]}
									onValueChange={([x]) => updateShadow(index, { x })}
									min={-50}
									max={50}
									step={1}
									className='w-full'
								/>
							</div>

							<div className='space-y-2'>
								<Label className='text-xs'>Y Offset: {shadow.y}px</Label>
								<Slider
									value={[shadow.y]}
									onValueChange={([y]) => updateShadow(index, { y })}
									min={-50}
									max={50}
									step={1}
									className='w-full'
								/>
							</div>

							<div className='space-y-2'>
								<Label className='text-xs'>Blur: {shadow.blur}px</Label>
								<Slider
									value={[shadow.blur]}
									onValueChange={([blur]) => updateShadow(index, { blur })}
									min={0}
									max={50}
									step={1}
									className='w-full'
								/>
							</div>

							<div className='space-y-2'>
								<Label className='text-xs'>Spread: {shadow.spread}px</Label>
								<Slider
									value={[shadow.spread]}
									onValueChange={([spread]) => updateShadow(index, { spread })}
									min={-20}
									max={20}
									step={1}
									className='w-full'
								/>
							</div>
						</div>

						<div className='mt-2 p-2 bg-muted/50 rounded-control'>
							<code className='text-xs'>{formatShadow([shadow])}</code>
						</div>
					</div>
				))}
			</div>

			<Button
				onClick={addShadow}
				size='sm'
				variant='outline'
				className='w-full'
			>
				<Plus className='h-4 w-4 mr-2' />
				Add Shadow
			</Button>

			{shadows.length === 0 && (
				<div className='text-center text-xs text-muted-foreground py-4 border border-dashed border-border rounded-control'>
					No shadows defined. Click "Add Shadow" to create one.
				</div>
			)}

			{shadows.length > 0 && (
				<div className='mt-3 p-2 bg-muted/50 rounded-control'>
					<div className='flex items-center justify-between mb-1'>
						<span className='text-xs font-medium'>CSS Output:</span>
						<Badge variant='secondary' className='text-xs'>
							box-shadow
						</Badge>
					</div>
					<code className='text-xs break-all'>
						box-shadow: {formatShadow(shadows)};
					</code>
				</div>
			)}
		</div>
	);
};
