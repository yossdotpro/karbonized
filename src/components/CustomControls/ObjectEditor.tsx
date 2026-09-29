import React, { useState } from 'react';
import { Braces, List, Plus, X } from 'lucide-react';
import { cn } from '@/components/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { DraftInput } from './DraftInput';

interface Props {
	value: Record<string, unknown>;
	onChange: (value: Record<string, unknown>) => void;
	label?: string;
}

/** How a value shows in its field: text as is, anything else as JSON. */
const toText = (value: unknown): string =>
	typeof value === 'string' ? value : JSON.stringify(value);

/**
 * Read a typed field back with the type the value had: numbers stay
 * numbers, booleans booleans and nested values JSON when the text allows.
 */
export const fromText = (text: string, previous: unknown): unknown => {
	if (typeof previous === 'string') return text;
	if (typeof previous === 'number') {
		const number = Number(text);
		return text.trim() !== '' && Number.isFinite(number) ? number : text;
	}
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
};

/** The whole object as JSON, applied when it is valid and the field is left. */
const JsonField: React.FC<{
	value: Record<string, unknown>;
	onChange: (value: Record<string, unknown>) => void;
}> = ({ value, onChange }) => {
	const formatted = JSON.stringify(value, null, 2);
	const [draft, setDraft] = useState(formatted);
	const [synced, setSynced] = useState(formatted);
	if (formatted !== synced) {
		setSynced(formatted);
		setDraft(formatted);
	}

	let parsed: unknown;
	let valid = true;
	try {
		parsed = JSON.parse(draft);
		valid =
			typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
	} catch {
		valid = false;
	}

	return (
		<div className='space-y-1'>
			<Textarea
				value={draft}
				onChange={(event) => setDraft(event.currentTarget.value)}
				onBlur={() => {
					if (valid && draft !== formatted) {
						onChange(parsed as Record<string, unknown>);
					}
				}}
				aria-invalid={!valid}
				spellCheck={false}
				className='min-h-28 font-mono text-xs md:text-xs'
			/>
			{!valid && (
				<p className='text-[11px] text-destructive'>
					Not a valid JSON object: it is applied once it is.
				</p>
			)}
		</div>
	);
};

/**
 * Key and value pairs, one row each: change a value in place, remove a
 * pair, add one at the end, or edit the whole object as JSON.
 */
export const ObjectEditor: React.FC<Props> = ({
	value = {},
	onChange,
	label,
}) => {
	const [asJson, setAsJson] = useState(false);
	const [newKey, setNewKey] = useState('');
	const [newValue, setNewValue] = useState('');
	const entries = Object.entries(value);

	const add = () => {
		const key = newKey.trim();
		if (key === '') return;
		onChange({ ...value, [key]: fromText(newValue, undefined) });
		setNewKey('');
		setNewValue('');
	};

	const remove = (key: string) => {
		const next = { ...value };
		delete next[key];
		onChange(next);
	};

	return (
		<div className='space-y-1.5'>
			<div className='flex min-h-6 items-center gap-2'>
				{label && (
					<span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>
						{label}
					</span>
				)}
				<button
					type='button'
					onClick={() => setAsJson(!asJson)}
					title={asJson ? 'Edit as fields' : 'Edit as JSON'}
					className='ml-auto flex h-6 items-center gap-1 rounded-[5px] px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
				>
					{asJson ? (
						<List className='size-3.5' />
					) : (
						<Braces className='size-3.5' />
					)}
					{asJson ? 'Fields' : 'JSON'}
				</button>
			</div>

			{asJson ? (
				<JsonField value={value} onChange={onChange} />
			) : (
				<>
					{entries.map(([key, item]) => (
						<div key={key} className='group flex items-center gap-1.5'>
							<span
								title={key}
								className='w-20 shrink-0 truncate font-mono text-[11px] text-muted-foreground'
							>
								{key}
							</span>
							<DraftInput
								aria-label={key}
								value={toText(item)}
								onCommit={(text) =>
									onChange({ ...value, [key]: fromText(text, item) })
								}
								className={cn(typeof item !== 'string' && 'font-mono')}
							/>
							<button
								type='button'
								title='Remove'
								aria-label={`Remove ${key}`}
								onClick={() => remove(key)}
								className='flex size-6 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground opacity-60 transition hover:bg-destructive/15 hover:text-destructive group-focus-within:opacity-100 group-hover:opacity-100'
							>
								<X className='size-3.5' />
							</button>
						</div>
					))}

					<div className='flex items-center gap-1.5'>
						<input
							aria-label='New key'
							placeholder='key'
							value={newKey}
							onChange={(event) => setNewKey(event.currentTarget.value)}
							onKeyDown={(event) => event.key === 'Enter' && add()}
							className='h-7 w-20 shrink-0 rounded-control border border-dashed border-border bg-transparent px-2 font-mono text-[11px] outline-none placeholder:text-muted-foreground focus-visible:border-ring'
						/>
						<input
							aria-label='New value'
							placeholder='value'
							value={newValue}
							onChange={(event) => setNewValue(event.currentTarget.value)}
							onKeyDown={(event) => event.key === 'Enter' && add()}
							className='h-7 min-w-0 flex-1 rounded-control border border-dashed border-border bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring'
						/>
						<button
							type='button'
							title='Add'
							aria-label='Add'
							disabled={newKey.trim() === ''}
							onClick={add}
							className='flex size-6 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30'
						>
							<Plus className='size-3.5' />
						</button>
					</div>
				</>
			)}
		</div>
	);
};
