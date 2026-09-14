import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Check, RotateCcw } from 'lucide-react';

interface Props {
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	label?: string;
}

export const ArrayEditor: React.FC<Props> = ({
	value = [],
	onChange,
	placeholder = 'Add items...',
	label,
}) => {
	const [newItem, setNewItem] = useState('');
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editingValue, setEditingValue] = useState('');

	const addItem = () => {
		if (newItem.trim()) {
			const newValue = [...value, newItem.trim()];
			onChange(newValue);
			setNewItem('');
		}
	};

	const removeItem = (index: number) => {
		const newValue = value.filter((_, i) => i !== index);
		onChange(newValue);
	};

	const startEditing = (index: number) => {
		setEditingIndex(index);
		setEditingValue(value[index]);
	};

	const saveEdit = () => {
		if (editingIndex !== null && editingValue.trim()) {
			const newValue = [...value];
			newValue[editingIndex] = editingValue.trim();
			onChange(newValue);
			setEditingIndex(null);
			setEditingValue('');
		}
	};

	const cancelEdit = () => {
		setEditingIndex(null);
		setEditingValue('');
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			addItem();
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
		onChange([]);
	};

	return (
		<div className='space-y-3'>
			{label && (
				<Label className='text-xs text-muted-foreground'>{label}</Label>
			)}

			{/* Add new item */}
			<div className='flex gap-2'>
				<Input
					value={newItem}
					onChange={(e) => setNewItem(e.target.value)}
					onKeyPress={handleKeyPress}
					placeholder={placeholder}
					className='text-sm'
				/>
				<Button
					onClick={addItem}
					size='sm'
					variant='outline'
					disabled={!newItem.trim()}
				>
					<Plus className='h-4 w-4' />
				</Button>
			</div>

			{/* Items list */}
			{value.length > 0 && (
				<div className='space-y-2'>
					<div className='flex items-center justify-between'>
						<span className='text-xs text-muted-foreground'>
							{value.length} item{value.length !== 1 ? 's' : ''}
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

					<div className='flex flex-wrap gap-2'>
						{value.map((item, index) => (
							<Badge
								key={index}
								variant='secondary'
								className='flex items-center gap-1 pr-1'
							>
								{editingIndex === index ? (
									<Input
										value={editingValue}
										onChange={(e) => setEditingValue(e.target.value)}
										onKeyPress={handleEditKeyPress}
										onBlur={saveEdit}
										className='h-5 w-20 text-xs'
										autoFocus
									/>
								) : (
									<span className='text-xs'>{item}</span>
								)}

								<div className='flex items-center gap-1 ml-1'>
									{editingIndex === index ? (
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
												onClick={() => startEditing(index)}
												size='sm'
												variant='ghost'
												className='h-4 w-4 p-0 hover:bg-accent'
											>
												<Edit2 className='h-3 w-3 text-muted-foreground' />
											</Button>
											<Button
												onClick={() => removeItem(index)}
												size='sm'
												variant='ghost'
												className='h-4 w-4 p-0 hover:bg-destructive/15'
											>
												<X className='h-3 w-3 text-destructive' />
											</Button>
										</>
									)}
								</div>
							</Badge>
						))}
					</div>
				</div>
			)}

			{value.length === 0 && (
				<div className='text-center text-xs text-muted-foreground py-4 border border-dashed border-border rounded-control'>
					No items yet. Add your first item above.
				</div>
			)}
		</div>
	);
};
