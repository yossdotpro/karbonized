import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Check, RotateCcw, FileJson, Eye } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
	value: Record<string, any>;
	onChange: (value: Record<string, any>) => void;
	placeholder?: string;
	label?: string;
}

export const ObjectEditor: React.FC<Props> = ({
	value = {},
	onChange,
	placeholder = 'Add key-value pairs...',
	label,
}) => {
	const [newKey, setNewKey] = useState('');
	const [newValue, setNewValue] = useState('');
	const [editingKey, setEditingKey] = useState<string | null>(null);
	const [editingValue, setEditingValue] = useState<any>('');
	const [showJsonView, setShowJsonView] = useState(false);
	const [jsonText, setJsonText] = useState('');

	const entries = Object.entries(value);

	const addPair = () => {
		if (newKey.trim() && newValue.trim()) {
			const newObject = { ...value, [newKey.trim()]: newValue.trim() };
			onChange(newObject);
			setNewKey('');
			setNewValue('');
		}
	};

	const removePair = (key: string) => {
		const newObject = { ...value };
		delete newObject[key];
		onChange(newObject);
	};

	const startEditing = (key: string) => {
		setEditingKey(key);
		setEditingValue(value[key]);
	};

	const saveEdit = () => {
		if (editingKey && editingValue !== null) {
			const newObject = { ...value, [editingKey]: editingValue };
			onChange(newObject);
			setEditingKey(null);
			setEditingValue('');
		}
	};

	const cancelEdit = () => {
		setEditingKey(null);
		setEditingValue('');
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			addPair();
		}
	};

	const handleEditKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			saveEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	};

	const clearAll = () => {
		onChange({});
	};

	const toggleJsonView = () => {
		if (!showJsonView) {
			setJsonText(JSON.stringify(value, null, 2));
		}
		setShowJsonView(!showJsonView);
	};

	const handleJsonChange = (text: string) => {
		setJsonText(text);
		try {
			const parsed = JSON.parse(text);
			onChange(parsed);
		} catch (error) {
			// Invalid JSON, don't update
		}
	};

	const formatValue = (val: any): string => {
		if (typeof val === 'object') {
			return JSON.stringify(val, null, 2);
		}
		return String(val);
	};

	return (
		<div className='space-y-3'>
			{label && (
				<Label className='text-xs text-muted-foreground'>{label}</Label>
			)}

			{!showJsonView ? (
				<>
					{/* Add new key-value pair */}
					<div className='flex gap-2'>
						<Input
							value={newKey}
							onChange={(e) => setNewKey(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder='Key'
							className='text-sm'
						/>
						<Input
							value={newValue}
							onChange={(e) => setNewValue(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder='Value'
							className='text-sm'
						/>
						<Button
							onClick={addPair}
							size='sm'
							variant='outline'
							disabled={!newKey.trim() || !newValue.trim()}
						>
							<Plus className='h-4 w-4' />
						</Button>
					</div>

					{/* Key-value pairs list */}
					{entries.length > 0 && (
						<div className='space-y-2'>
							<div className='flex items-center justify-between'>
								<span className='text-xs text-muted-foreground'>
									{entries.length} propert{entries.length !== 1 ? 'ies' : 'y'}
								</span>
								<div className='flex gap-1'>
									<Button
										onClick={toggleJsonView}
										size='sm'
										variant='ghost'
										className='h-6 px-2 text-xs'
									>
										<FileJson className='h-3 w-3 mr-1' />
										JSON
									</Button>
									<Button
										onClick={clearAll}
										size='sm'
										variant='ghost'
										className='h-6 px-2 text-xs'
									>
										<RotateCcw className='h-3 w-3 mr-1' />
										Clear
									</Button>
								</div>
							</div>

							<div className='space-y-2 max-h-48 overflow-y-auto'>
								{entries.map(([key, val]) => (
									<div
										key={key}
										className='flex items-center gap-2 p-2 border rounded-control'
									>
										<span className='text-xs font-mono text-muted-foreground min-w-0 truncate'>
											{key}:
										</span>

										{editingKey === key ? (
											<div className='flex-1 flex gap-1'>
												{typeof val === 'object' ? (
													<Textarea
														value={
															typeof editingValue === 'string'
																? editingValue
																: JSON.stringify(editingValue, null, 2)
														}
														onChange={(e) => {
															try {
																const parsed = JSON.parse(e.target.value);
																setEditingValue(parsed);
															} catch {
																setEditingValue(e.target.value);
															}
														}}
														onKeyPress={handleEditKeyPress}
														onBlur={saveEdit}
														className='text-xs h-16 min-h-16'
														autoFocus
													/>
												) : (
													<Input
														value={String(editingValue)}
														onChange={(e) => setEditingValue(e.target.value)}
														onKeyPress={handleEditKeyPress}
														onBlur={saveEdit}
														className='text-xs h-6'
														autoFocus
													/>
												)}
											</div>
										) : (
											<span className='flex-1 text-xs font-mono truncate'>
												{formatValue(val)}
											</span>
										)}

										<div className='flex items-center gap-1'>
											{editingKey === key ? (
												<>
													<Button
														onClick={saveEdit}
														size='sm'
														variant='ghost'
														className='h-4 w-4 p-0 hover:bg-emerald-500/15'
													>
														<Check className='h-3 w-3 text-emerald-500' />
													</Button>
													<Button
														onClick={cancelEdit}
														size='sm'
														variant='ghost'
														className='h-4 w-4 p-0 hover:bg-destructive/15'
													>
														<X className='h-3 w-3 text-destructive' />
													</Button>
												</>
											) : (
												<>
													<Button
														onClick={() => startEditing(key)}
														size='sm'
														variant='ghost'
														className='h-4 w-4 p-0 hover:bg-accent'
													>
														<Edit2 className='h-3 w-3 text-muted-foreground' />
													</Button>
													<Button
														onClick={() => removePair(key)}
														size='sm'
														variant='ghost'
														className='h-4 w-4 p-0 hover:bg-destructive/15'
													>
														<X className='h-3 w-3 text-destructive' />
													</Button>
												</>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{entries.length === 0 && (
						<div className='text-center text-xs text-muted-foreground py-4 border border-dashed border-border rounded-control'>
							No properties yet. Add your first key-value pair above.
						</div>
					)}
				</>
			) : (
				<>
					{/* JSON View */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<span className='text-xs text-muted-foreground'>JSON View</span>
							<Button
								onClick={toggleJsonView}
								size='sm'
								variant='ghost'
								className='h-6 px-2 text-xs'
							>
								<Eye className='h-3 w-3 mr-1' />
								Visual
							</Button>
						</div>

						<Textarea
							value={jsonText}
							onChange={(e) => handleJsonChange(e.target.value)}
							className='font-mono text-xs min-h-32'
							placeholder='{"key": "value"}'
						/>

						<Alert>
							<FileJson className='h-4 w-4' />
							<AlertDescription className='text-xs'>
								Editing JSON directly. Invalid JSON will not be applied.
							</AlertDescription>
						</Alert>
					</div>
				</>
			)}
		</div>
	);
};
