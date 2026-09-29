import { IconPickerField } from '../CustomControls/IconPicker';
import React from 'react';
import { Play } from 'lucide-react';
import {
	type CSSVariable,
	type CustomAction,
	type JSVariable,
} from '@/lib/blocks-api';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { ObjectEditor } from '../CustomControls/ObjectEditor';
import { ArrayEditor } from '../CustomControls/ArrayEditor';
import { ImageInput, FileInput } from '../CustomControls/FileInput';
import { ShadowEditor } from '../CustomControls/ShadowEditor';
import { FieldInput, PropertyRow } from '../CustomControls/PropertyControls';
import { Button } from '../ui/button';

interface CSSControlsProps {
	variables: CSSVariable[];
	onUpdateVariable: (
		varName: string,
		newValue: string | number | boolean,
	) => void;
}

interface JSControlsProps {
	variables: JSVariable[];
	onUpdateVariable: (varName: string, newValue: any) => void;
}

interface ActionControlsProps {
	actions: CustomAction[];
	allowScriptExecution?: boolean;
	onExecuteAction: (action: CustomAction) => void;
}

/** `--value-size` and `showValues` read as "Value size" and "Show values". */
export const variableLabel = (name: string): string => {
	const words = name
		.replace(/^-+/, '')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((word) => word.toLowerCase());
	const text = words.join(' ');
	return text.charAt(0).toUpperCase() + text.slice(1) || name;
};

/** The label of a row, with the variable name on hover. */
const RowLabel: React.FC<{ name: string }> = ({ name }) => (
	<span title={name}>{variableLabel(name)}</span>
);

/**
 * A slider with a field to type the exact value. Values past the declared
 * range stay reachable: the slider grows to fit them.
 */
const NumberField: React.FC<{
	name: string;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	unit?: string;
}> = ({ name, value, onChange, min = 0, max, step = 1, unit }) => {
	const number = Number(value) || 0;
	const upper = Math.max(max ?? 100, number);
	const lower = Math.min(min, number);

	return (
		<PropertyRow label={<RowLabel name={name} />}>
			<Slider
				className='flex-1'
				min={lower}
				max={upper}
				step={step}
				value={[number]}
				onValueChange={(next) => onChange(next[0])}
			/>
			<FieldInput
				label=''
				value={number}
				step={step}
				suffix={unit}
				onChange={(text) => {
					const next = Number(text);
					if (text.trim() !== '' && Number.isFinite(next)) onChange(next);
				}}
				className='w-16 flex-none'
			/>
		</PropertyRow>
	);
};

const TextField: React.FC<{
	name: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	mono?: boolean;
}> = ({ name, value, onChange, placeholder, mono }) => (
	<PropertyRow label={<RowLabel name={name} />}>
		<Input
			aria-label={variableLabel(name)}
			value={value}
			placeholder={placeholder}
			onChange={(event) => onChange(event.target.value)}
			className={`h-7 text-xs md:text-xs ${mono ? 'font-mono' : ''}`}
		/>
	</PropertyRow>
);

const BooleanField: React.FC<{
	name: string;
	value: boolean;
	onChange: (value: boolean) => void;
}> = ({ name, value, onChange }) => (
	<PropertyRow label={<RowLabel name={name} />}>
		<Switch
			className='ml-auto'
			aria-label={variableLabel(name)}
			checked={value}
			onCheckedChange={onChange}
		/>
	</PropertyRow>
);

export const HTMLBlockCSSVariablesControls: React.FC<CSSControlsProps> = ({
	variables,
	onUpdateVariable,
}) => (
	<div className='space-y-0.5'>
		{variables.map((variable) => {
			const update = (value: string | number | boolean) =>
				onUpdateVariable(variable.name, value);

			switch (variable.type) {
				case 'color':
					return (
						<ColorPicker
							key={variable.name}
							type='HexAlpha'
							isGradientEnable={false}
							color={variable.value as string}
							onColorChange={update}
							label={variableLabel(variable.name)}
						/>
					);

				case 'number':
					return (
						<NumberField
							key={variable.name}
							name={variable.name}
							value={variable.value as number}
							onChange={update}
							min={variable.min}
							max={variable.max}
							step={variable.step}
							unit={variable.unit}
						/>
					);

				case 'boolean':
					return (
						<BooleanField
							key={variable.name}
							name={variable.name}
							value={variable.value as boolean}
							onChange={update}
						/>
					);

				case 'icon':
					return (
						<PropertyRow
							key={variable.name}
							label={<RowLabel name={variable.name} />}
						>
							<IconPickerField
								value={variable.value as string}
								onChange={update}
							/>
						</PropertyRow>
					);

				case 'shadow':
					return (
						<div key={variable.name} className='py-1'>
							<ShadowEditor
								value={variable.value as string}
								onChange={update}
								label={variableLabel(variable.name)}
							/>
						</div>
					);

				default:
					return (
						<TextField
							key={variable.name}
							name={variable.name}
							value={String(variable.value)}
							onChange={update}
							mono
						/>
					);
			}
		})}
	</div>
);

export const HTMLBlockJSVariablesControls: React.FC<JSControlsProps> = ({
	variables,
	onUpdateVariable,
}) => (
	<div className='space-y-0.5'>
		{variables.map((variable) => {
			const update = (value: unknown) => onUpdateVariable(variable.name, value);

			switch (variable.type) {
				case 'color':
					return (
						<ColorPicker
							key={variable.name}
							type='HexAlpha'
							isGradientEnable={false}
							color={variable.value as string}
							onColorChange={update}
							label={variableLabel(variable.name)}
						/>
					);

				case 'gradient': {
					const gradientValue = String(variable.value);
					let color1 = '#667eea';
					let color2 = '#764ba2';
					let angle = 45;

					const gradientMatch = gradientValue.match(
						/linear-gradient\((\d+)deg,\s*([^,]+),\s*([^)]+)\)/,
					);
					if (gradientMatch) {
						angle = parseInt(gradientMatch[1]);
						color1 = gradientMatch[2].trim();
						color2 = gradientMatch[3].trim();
					}

					return (
						<ColorPicker
							key={variable.name}
							isGradientEnable
							mode='Gradient'
							colorGradient1={color1}
							colorGradient2={color2}
							gradientDeg={angle}
							color={color1}
							onColorChange={() => undefined}
							onGradientChange={(newColor1, newColor2) =>
								update(
									`linear-gradient(${angle}deg, ${newColor1}, ${newColor2})`,
								)
							}
							onGradientDegChange={(newAngle) =>
								update(`linear-gradient(${newAngle}deg, ${color1}, ${color2})`)
							}
							label={variableLabel(variable.name)}
						/>
					);
				}

				case 'number':
					return (
						<NumberField
							key={variable.name}
							name={variable.name}
							value={variable.value as number}
							onChange={update}
							min={variable.min}
							max={variable.max}
							step={variable.step}
						/>
					);

				case 'boolean':
					return (
						<BooleanField
							key={variable.name}
							name={variable.name}
							value={variable.value as boolean}
							onChange={update}
						/>
					);

				case 'url':
					return (
						<TextField
							key={variable.name}
							name={variable.name}
							value={String(variable.value ?? '')}
							onChange={update}
							placeholder='https://example.com'
							mono
						/>
					);

				case 'object':
					return (
						<div key={variable.name} className='py-1'>
							<ObjectEditor
								value={
									typeof variable.value === 'object' &&
									variable.value !== null &&
									!Array.isArray(variable.value)
										? (variable.value as Record<string, unknown>)
										: {}
								}
								onChange={update}
								label={variableLabel(variable.name)}
							/>
						</div>
					);

				case 'array':
					return (
						<div key={variable.name} className='py-1'>
							<ArrayEditor
								value={Array.isArray(variable.value) ? variable.value : []}
								onChange={update}
								label={variableLabel(variable.name)}
							/>
						</div>
					);

				case 'image':
					return (
						<div key={variable.name} className='py-1'>
							<ImageInput
								value={variable.value as string}
								onChange={update}
								label={variableLabel(variable.name)}
								multiple={variable.multiple}
								maxSize={variable.maxSize}
								maxFiles={variable.multiple ? 10 : 1}
							/>
						</div>
					);

				case 'file':
					return (
						<div key={variable.name} className='py-1'>
							<FileInput
								value={variable.value as string}
								onChange={update}
								label={variableLabel(variable.name)}
								accept={variable.accept}
								multiple={variable.multiple}
								maxSize={variable.maxSize}
								maxFiles={variable.multiple ? 5 : 1}
							/>
						</div>
					);

				default:
					return (
						<TextField
							key={variable.name}
							name={variable.name}
							value={String(variable.value ?? '')}
							onChange={update}
						/>
					);
			}
		})}
	</div>
);

export const HTMLBlockActionsControls: React.FC<ActionControlsProps> = ({
	actions,
	allowScriptExecution = true,
	onExecuteAction,
}) => (
	<div className='space-y-2'>
		{actions.map((action) => (
			<Button
				key={action.id}
				variant='outline'
				size='sm'
				onClick={() => onExecuteAction(action)}
				className='w-full justify-start'
				disabled={!allowScriptExecution}
			>
				<Play className='size-3.5' />
				{action.label}
			</Button>
		))}
	</div>
);
