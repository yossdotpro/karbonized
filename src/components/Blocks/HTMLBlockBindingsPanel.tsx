import React from 'react';
import { Play } from 'lucide-react';
import {
	type CSSVariable,
	type CustomAction,
	type JSVariable,
} from '@/lib/blocks-api';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { ObjectEditor } from '../CustomControls/ObjectEditor';
import { ArrayEditor } from '../CustomControls/ArrayEditor';
import { ImageInput, FileInput } from '../CustomControls/FileInput';
import { ShadowEditor } from '../CustomControls/ShadowEditor';
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

export const HTMLBlockCSSVariablesControls: React.FC<CSSControlsProps> = ({
	variables,
	onUpdateVariable,
}) => (
	<div className='space-y-3.5'>
		{variables.map((variable) => {
			switch (variable.type) {
				case 'color':
					return (
						<div key={variable.name} className='space-y-2'>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<ColorPicker
								isGradientEnable={false}
								color={variable.value as string}
								onColorChange={(color) => onUpdateVariable(variable.name, color)}
								label=''
							/>
						</div>
					);

				case 'number':
					return (
						<div key={variable.name} className='space-y-2'>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<div className='flex items-center gap-2'>
								<Slider
									className='flex-1'
									onValueChange={(value) =>
										onUpdateVariable(variable.name, value[0])
									}
									value={[variable.value as number]}
									min={variable.min || 0}
									max={variable.max || 100}
									step={variable.step || 1}
								/>
								<span className='w-10 text-right font-mono text-[11px] tabular-nums text-muted-foreground'>
									{variable.value}
								</span>
							</div>
						</div>
					);

				case 'boolean':
					return (
						<div
							key={variable.name}
							className='flex items-center justify-between'
						>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<Switch
								checked={variable.value as boolean}
								onCheckedChange={(checked) =>
									onUpdateVariable(variable.name, checked)
								}
							/>
						</div>
					);

				case 'shadow':
					return (
						<div key={variable.name} className='space-y-2'>
							<ShadowEditor
								value={variable.value as string}
								onChange={(value) => onUpdateVariable(variable.name, value)}
								label={variable.name}
							/>
						</div>
					);

				default:
					return (
						<div key={variable.name} className='space-y-2'>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<Input
								value={variable.value as string}
								onChange={(event) =>
									onUpdateVariable(variable.name, event.target.value)
								}
								className='h-7 font-mono text-xs'
							/>
						</div>
					);
			}
		})}
	</div>
);

export const HTMLBlockJSVariablesControls: React.FC<JSControlsProps> = ({
	variables,
	onUpdateVariable,
}) => (
	<div className='space-y-3.5'>
		{variables.map((variable) => {
			switch (variable.type) {
				case 'color':
					return (
						<div key={variable.name} className='space-y-2'>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<ColorPicker
								isGradientEnable={false}
								color={variable.value as string}
								onColorChange={(color) => onUpdateVariable(variable.name, color)}
								label=''
							/>
						</div>
					);

				case 'gradient': {
					const gradientValue = variable.value as string;
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
						<div key={variable.name} className='space-y-2'>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<ColorPicker
								isGradientEnable
								mode='Gradient'
								colorGradient1={color1}
								colorGradient2={color2}
								gradientDeg={angle}
								color={color1}
								onColorChange={() => undefined}
								onGradientChange={(newColor1, newColor2) => {
									onUpdateVariable(
										variable.name,
										`linear-gradient(${angle}deg, ${newColor1}, ${newColor2})`,
									);
								}}
								onGradientDegChange={(newAngle) => {
									onUpdateVariable(
										variable.name,
										`linear-gradient(${newAngle}deg, ${color1}, ${color2})`,
									);
								}}
								label=''
							/>
						</div>
					);
				}

				case 'number':
					return (
						<div key={variable.name} className='space-y-2'>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<div className='flex items-center gap-2'>
								<Slider
									className='flex-1'
									onValueChange={(value) => onUpdateVariable(variable.name, value[0])}
									value={[variable.value as number]}
									min={variable.min || 0}
									max={variable.max || 100}
									step={variable.step || 1}
								/>
								<span className='w-10 text-right font-mono text-[11px] tabular-nums text-muted-foreground'>
									{variable.value as any}
								</span>
							</div>
						</div>
					);

				case 'boolean':
					return (
						<div
							key={variable.name}
							className='flex items-center justify-between'
						>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<Switch
								checked={variable.value as boolean}
								onCheckedChange={(checked) =>
									onUpdateVariable(variable.name, checked)
								}
							/>
						</div>
					);

				case 'url':
					return (
						<div key={variable.name} className='space-y-2'>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<Input
								value={variable.value as string}
								onChange={(event) =>
									onUpdateVariable(variable.name, event.target.value)
								}
								placeholder='https://example.com'
								className='h-7 font-mono text-xs'
							/>
						</div>
					);

				case 'object':
					return (
						<div key={variable.name} className='space-y-2'>
							<ObjectEditor
								value={
									typeof variable.value === 'object' && !Array.isArray(variable.value)
										? variable.value
										: {}
								}
								onChange={(newValue) =>
									onUpdateVariable(variable.name, newValue)
								}
								label={variable.name}
							/>
						</div>
					);

				case 'array':
					return (
						<div key={variable.name} className='space-y-2'>
							<ArrayEditor
								value={Array.isArray(variable.value) ? variable.value : []}
								onChange={(newValue) =>
									onUpdateVariable(variable.name, newValue)
								}
								label={variable.name}
								placeholder='Add items...'
							/>
						</div>
					);

				case 'image':
					return (
						<div key={variable.name} className='space-y-2'>
							<ImageInput
								value={variable.value as string}
								onChange={(newValue) =>
									onUpdateVariable(variable.name, newValue)
								}
								label={variable.name}
								multiple={variable.multiple}
								maxSize={variable.maxSize}
								maxFiles={variable.multiple ? 10 : 1}
							/>
						</div>
					);

				case 'file':
					return (
						<div key={variable.name} className='space-y-2'>
							<FileInput
								value={variable.value as string}
								onChange={(newValue) =>
									onUpdateVariable(variable.name, newValue)
								}
								label={variable.name}
								accept={variable.accept}
								multiple={variable.multiple}
								maxSize={variable.maxSize}
								maxFiles={variable.multiple ? 5 : 1}
							/>
						</div>
					);

				default:
					return (
						<div key={variable.name} className='space-y-2'>
							<Label className='font-mono text-[11px] font-normal text-muted-foreground'>
								{variable.name}
							</Label>
							<Input
								value={variable.value as string}
								onChange={(event) =>
									onUpdateVariable(variable.name, event.target.value)
								}
								className='h-7 font-mono text-xs'
							/>
						</div>
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
