import React, { useState } from 'react';
import { toast } from 'sonner';
import {
	AlignLeft,
	Braces,
	CalendarDays,
	Plus,
	Trash2,
	Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { useProjectVariables } from '@/hooks/useProjectVariables';
import { setProjectVariables } from '@/lib/editor/actions';
import {
	type DateFormat,
	type ProjectVariable,
	type VariableKind,
	DATE_FORMATS,
	MAX_VARIABLES,
	TODAY,
	VARIABLE_NAME_PATTERN,
	formatDate,
	nextVariableName,
} from '@/lib/variables/variables';

const KINDS: Record<
	VariableKind,
	{ label: string; icon: React.ElementType; base: string }
> = {
	text: { label: 'Text', icon: Type, base: 'title' },
	multiline: { label: 'Long text', icon: AlignLeft, base: 'body' },
	date: { label: 'Date', icon: CalendarDays, base: 'date' },
};

const FORMAT_LABELS: Record<DateFormat, string> = {
	long: 'Long',
	medium: 'Medium',
	short: 'Short',
	iso: 'ISO',
};

const todayIso = () => formatDate(TODAY, 'iso');

/**
 * A text field that edits a draft and commits on blur (or Enter for one
 * line), so typing a value is one undo step instead of one per key.
 */
const DraftField: React.FC<{
	value: string;
	multiline?: boolean;
	onCommit: (value: string) => void;
	className?: string;
	placeholder?: string;
	'aria-label'?: string;
}> = ({ value, multiline, onCommit, ...props }) => {
	const [draft, setDraft] = useState<string | null>(null);
	const commit = () => {
		if (draft !== null && draft !== value) onCommit(draft);
		setDraft(null);
	};
	const shared = {
		...props,
		value: draft ?? value,
		spellCheck: false,
		onBlur: commit,
	};

	return multiline ? (
		<Textarea
			{...shared}
			rows={3}
			className='min-h-16 font-mono text-xs md:text-xs'
			onChange={(event) => setDraft(event.target.value)}
		/>
	) : (
		<Input
			{...shared}
			className={props.className ?? 'h-7 text-xs md:text-xs'}
			onChange={(event) => setDraft(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === 'Enter') event.currentTarget.blur();
				if (event.key === 'Escape') {
					setDraft(null);
					event.currentTarget.blur();
				}
			}}
		/>
	);
};

const VariableRow: React.FC<{
	variable: ProjectVariable;
	variables: ProjectVariable[];
	onChange: (next: ProjectVariable) => void;
	onRemove: () => void;
}> = ({ variable, variables, onChange, onRemove }) => {
	const Icon = KINDS[variable.kind].icon;
	const isToday = variable.value === TODAY;

	const rename = (name: string) => {
		const clean = name.trim();
		if (!VARIABLE_NAME_PATTERN.test(clean)) {
			toast.error('Use letters, numbers, - and _ (starting with a letter)');
			return;
		}
		if (variables.some((item) => item !== variable && item.name === clean)) {
			toast.error(`There is already a variable named ${clean}`);
			return;
		}
		onChange({ ...variable, name: clean });
	};

	return (
		<div className='flex flex-col gap-2 rounded-control border border-border bg-background/40 p-2'>
			<div className='flex items-center gap-1.5'>
				<Icon className='size-3.5 shrink-0 text-muted-foreground' />
				<div className='flex min-w-0 flex-1 items-center font-mono text-xs text-muted-foreground'>
					<span>{'{{'}</span>
					<DraftField
						aria-label='Variable name'
						value={variable.name}
						onCommit={rename}
						className='h-6 min-w-0 flex-1 border-transparent px-0.5 font-mono text-xs text-foreground shadow-none hover:border-input md:text-xs'
					/>
					<span>{'}}'}</span>
				</div>
				<Button
					variant='ghost'
					size='icon-xs'
					aria-label={`Remove ${variable.name}`}
					onClick={onRemove}
				>
					<Trash2 />
				</Button>
			</div>

			{variable.kind === 'date' ? (
				<div className='flex flex-col gap-2'>
					<div className='flex items-center gap-2'>
						<Input
							type='date'
							aria-label={`${variable.name} date`}
							disabled={isToday}
							value={isToday ? todayIso() : variable.value}
							onChange={(event) =>
								event.target.value &&
								onChange({ ...variable, value: event.target.value })
							}
							className='h-7 min-w-0 flex-1 text-xs md:text-xs'
						/>
						<Select
							value={variable.format ?? 'long'}
							onValueChange={(format) =>
								onChange({ ...variable, format: format as DateFormat })
							}
						>
							<SelectTrigger
								className='h-7 w-24 text-xs'
								aria-label='Date format'
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{DATE_FORMATS.map((format) => (
									<SelectItem key={format} value={format}>
										{FORMAT_LABELS[format]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<label className='flex items-center justify-between gap-2 text-[11px] text-muted-foreground'>
						<span>
							Always today ·{' '}
							<span className='text-foreground'>
								{formatDate(variable.value, variable.format)}
							</span>
						</span>
						<Switch
							checked={isToday}
							onCheckedChange={(checked) =>
								onChange({
									...variable,
									value: checked ? TODAY : todayIso(),
								})
							}
						/>
					</label>
				</div>
			) : (
				<DraftField
					aria-label={`${variable.name} value`}
					multiline={variable.kind === 'multiline'}
					value={variable.value}
					placeholder='Value'
					onCommit={(value) => onChange({ ...variable, value })}
				/>
			)}
		</div>
	);
};

/** Project variables: the slots a template fills (`{{name}}` in blocks). */
export const VariablesSection: React.FC = () => {
	const variables = useProjectVariables();

	const add = (kind: VariableKind) => {
		if (variables.length >= MAX_VARIABLES) return;
		const name = nextVariableName(variables, KINDS[kind].base);
		setProjectVariables([
			...variables,
			{
				name,
				kind,
				value: kind === 'date' ? TODAY : '',
				...(kind === 'date' && { format: 'long' as const }),
			},
		]);
	};

	return (
		<CustomCollapse
			isOpen={variables.length > 0}
			menu={
				<div className='flex items-center gap-2'>
					<Braces size={16} />
					<Label className='text-sm font-semibold text-foreground'>
						Variables
					</Label>
					{variables.length > 0 && (
						<span className='text-xs text-muted-foreground'>
							{variables.length}
						</span>
					)}
				</div>
			}
		>
			<p className='text-[11px] leading-relaxed text-muted-foreground'>
				Write <code className='font-mono text-foreground'>{'{{name}}'}</code> in
				a text, code, window, QR or HTML block and it shows the value. Change
				the values here (or let Agent fill them) without touching the design.
			</p>

			{variables.map((variable, index) => (
				<VariableRow
					key={index}
					variable={variable}
					variables={variables}
					onChange={(next) =>
						setProjectVariables(
							variables.map((item, position) =>
								position === index ? next : item,
							),
						)
					}
					onRemove={() =>
						setProjectVariables(
							variables.filter((_, position) => position !== index),
						)
					}
				/>
			))}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant='outline'
						size='sm'
						className='w-full'
						disabled={variables.length >= MAX_VARIABLES}
					>
						<Plus />
						Add variable
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start'>
					{(Object.keys(KINDS) as VariableKind[]).map((kind) => {
						const { label, icon: Icon } = KINDS[kind];
						return (
							<DropdownMenuItem key={kind} onClick={() => add(kind)}>
								<Icon />
								{label}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		</CustomCollapse>
	);
};
