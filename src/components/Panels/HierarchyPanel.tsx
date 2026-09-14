import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import type { Item } from '../../types';
import { useWorkspaceStore, useControlsStore } from '../../stores';
import { MenuItem } from './MenuItem';

type LayerFilter = 'all' | 'visible' | 'hidden' | 'locked' | 'groups';
type LayerDropPosition = 'before' | 'after' | 'inside';

interface LayerNode {
	item: Item;
	children: LayerNode[];
}

const normalizeParentId = (value?: string | null): string | null =>
	value ?? null;

const buildLayerTree = (
	controls: Item[],
	parentId: string | null = null,
): LayerNode[] =>
	controls
		.filter(
			(item) =>
				!item.isDeleted && normalizeParentId(item.parentId) === parentId,
		)
		.map((item) => ({
			item,
			children: buildLayerTree(controls, item.id),
		}));

const matchesFilter = (item: Item, filter: LayerFilter): boolean => {
	switch (filter) {
		case 'visible':
			return item.isVisible;
		case 'hidden':
			return !item.isVisible;
		case 'locked':
			return !!item.locked;
		case 'groups':
			return item.type === 'group';
		default:
			return true;
	}
};

const filterTree = (
	nodes: LayerNode[],
	query: string,
	filter: LayerFilter,
): LayerNode[] => {
	const normalizedQuery = query.trim().toLowerCase();

	return nodes
		.map((node) => {
			const filteredChildren = filterTree(
				node.children,
				normalizedQuery,
				filter,
			);
			const queryMatch =
				normalizedQuery === '' ||
				node.item.name.toLowerCase().includes(normalizedQuery) ||
				node.item.type.toLowerCase().includes(normalizedQuery);
			const filterMatch = matchesFilter(node.item, filter);

			if ((queryMatch && filterMatch) || filteredChildren.length > 0) {
				return { ...node, children: filteredChildren };
			}

			return null;
		})
		.filter((node): node is LayerNode => node !== null);
};

const getChildCount = (node: LayerNode): number =>
	node.children.reduce((acc, child) => acc + 1 + getChildCount(child), 0);

const flattenVisibleTree = (nodes: LayerNode[]): Item[] =>
	nodes.flatMap((node) => [
		node.item,
		...(node.item.type === 'group' && node.item.collapsed
			? []
			: flattenVisibleTree(node.children)),
	]);

const areStringArraysEqual = (left: string[], right: string[]): boolean =>
	left.length === right.length && left.every((value, index) => value === right[index]);

export const HierarchyPanel: React.FC = () => {
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const visibleControls = useMemo(
		() =>
			currentWorkspace?.controls?.filter((item: Item) => !item.isDeleted) ?? [],
		[currentWorkspace],
	);
	const currentControlID = useControlsStore((state) => state.currentControlID);
	const setCurrentControlID = useControlsStore(
		(state) => state.setCurrentControlID,
	);
	const toggleControlVisibility = useControlsStore(
		(state) => state.toggleControlVisibility,
	);
	const toggleControlLock = useControlsStore(
		(state) => state.toggleControlLock,
	);
	const renameControl = useControlsStore((state) => state.renameControl);
	const deleteControl = useControlsStore((state) => state.deleteControl);
	const duplicateControl = useControlsStore((state) => state.duplicateControl);
	const addGroup = useControlsStore((state) => state.addGroup);
	const groupControl = useControlsStore((state) => state.groupControl);
	const ungroupControl = useControlsStore((state) => state.ungroupControl);
	const moveControlLayer = useControlsStore((state) => state.moveControlLayer);
	const moveControlByStep = useControlsStore(
		(state) => state.moveControlByStep,
	);
	const moveControlToEdge = useControlsStore(
		(state) => state.moveControlToEdge,
	);
	const toggleGroupCollapsed = useControlsStore(
		(state) => state.toggleGroupCollapsed,
	);

	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState<LayerFilter>('all');
	const [focusedLayerID, setFocusedLayerID] = useState<string>('');
	const [selectedLayerIDs, setSelectedLayerIDs] = useState<string[]>([]);
	const [selectionAnchorID, setSelectionAnchorID] = useState<string>('');
	const [renamingID, setRenamingID] = useState<string>('');
	const [renameValue, setRenameValue] = useState('');
	const [draggedId, setDraggedId] = useState('');
	const [dropTarget, setDropTarget] = useState<{
		id: string;
		position: LayerDropPosition;
	} | null>(null);

	useEffect(() => {
		if (currentControlID !== '') {
			setFocusedLayerID(currentControlID);
			setSelectedLayerIDs((current) =>
				current.includes(currentControlID) ? current : [currentControlID],
			);
			setSelectionAnchorID(currentControlID);
		}
	}, [currentControlID]);

	useEffect(() => {
		const validIds = new Set(visibleControls.map((item) => item.id));
		setSelectedLayerIDs((current) => {
			const nextSelected = current.filter((id) => validIds.has(id));
			return areStringArraysEqual(current, nextSelected) ? current : nextSelected;
		});
		if (selectionAnchorID !== '' && !validIds.has(selectionAnchorID)) {
			setSelectionAnchorID('');
		}
		if (focusedLayerID !== '' && !validIds.has(focusedLayerID)) {
			setFocusedLayerID('');
		}
	}, [focusedLayerID, selectionAnchorID, visibleControls]);

	const tree = useMemo(
		() => buildLayerTree(visibleControls),
		[visibleControls],
	);
	const filteredTree = useMemo(
		() => filterTree(tree, query, filter),
		[filter, query, tree],
	);
	const activeLayer = useMemo(
		() =>
			visibleControls.find(
				(item) => item.id === (focusedLayerID || currentControlID),
			),
		[currentControlID, focusedLayerID, visibleControls],
	);
	const flattenedVisibleItems = useMemo(
		() => flattenVisibleTree(filteredTree),
		[filteredTree],
	);
	const selectedItems = useMemo(
		() =>
			selectedLayerIDs
				.map((id) => visibleControls.find((item) => item.id === id))
				.filter((item): item is Item => item !== undefined),
		[selectedLayerIDs, visibleControls],
	);
	const selectedCount = selectedItems.length;

	const getActionTargetIds = (clickedId: string): string[] =>
		selectedLayerIDs.includes(clickedId) && selectedLayerIDs.length > 0
			? selectedLayerIDs
			: [clickedId];

	const getSharedParentId = (items: Item[]): string | null => {
		if (items.length === 0) return null;
		const firstParent = items[0].parentId ?? null;
		return items.every((item) => (item.parentId ?? null) === firstParent)
			? firstParent
			: null;
	};

	const applyToTargets = (
		clickedId: string,
		handler: (targetIds: string[]) => void,
	): void => {
		handler(getActionTargetIds(clickedId));
	};

	const handleRenameStart = (item: Item) => {
		setFocusedLayerID(item.id);
		setSelectedLayerIDs([item.id]);
		setSelectionAnchorID(item.id);
		setRenamingID(item.id);
		setRenameValue(item.name);
	};

	const handleRenameCommit = (value: string) => {
		if (renamingID !== '') {
			renameControl({ id: renamingID, name: value }, currentWorkspace);
		}

		setRenamingID('');
		setRenameValue('');
	};

	const handleDropPosition = (
		event: React.DragEvent<HTMLDivElement>,
		item: Item,
	): LayerDropPosition => {
		const bounds = event.currentTarget.getBoundingClientRect();
		const ratio = (event.clientY - bounds.top) / bounds.height;

		if (item.type === 'group' && ratio > 0.25 && ratio < 0.75) {
			return 'inside';
		}

		return ratio < 0.5 ? 'before' : 'after';
	};

	const handleLayerSelection = (
		item: Item,
		event: React.MouseEvent<HTMLDivElement>,
	): void => {
		const additive = event.altKey || event.ctrlKey || event.metaKey;
		const ranged = event.shiftKey;

		setFocusedLayerID(item.id);
		setCurrentControlID(item.id);

		if (ranged && flattenedVisibleItems.length > 0) {
			const anchorId = selectionAnchorID || selectedLayerIDs[0] || item.id;
			const startIndex = flattenedVisibleItems.findIndex(
				(entry) => entry.id === anchorId,
			);
			const endIndex = flattenedVisibleItems.findIndex(
				(entry) => entry.id === item.id,
			);

			if (startIndex !== -1 && endIndex !== -1) {
				const [from, to] =
					startIndex < endIndex
						? [startIndex, endIndex]
						: [endIndex, startIndex];
				const nextRange = flattenedVisibleItems
					.slice(from, to + 1)
					.map((entry) => entry.id);

				setSelectedLayerIDs(nextRange);
				return;
			}
		}

		if (additive) {
			setSelectedLayerIDs((current) =>
				current.includes(item.id)
					? current.filter((id) => id !== item.id)
					: [...current, item.id],
			);
			setSelectionAnchorID(item.id);
			return;
		}

		setSelectedLayerIDs([item.id]);
		setSelectionAnchorID(item.id);
	};

	const renderNode = (node: LayerNode, depth = 0): React.ReactNode => {
		const isCollapsed = node.item.type === 'group' && node.item.collapsed;
		const activeId = focusedLayerID || currentControlID;

		return (
			<React.Fragment key={node.item.id}>
				<MenuItem
					item={node.item}
					depth={depth}
					isSelected={selectedLayerIDs.includes(node.item.id)}
					isFocused={activeId === node.item.id}
					isRenaming={renamingID === node.item.id}
					dropPosition={
						dropTarget?.id === node.item.id ? dropTarget.position : null
					}
					childCount={getChildCount(node)}
					onSelect={handleLayerSelection}
					onRenameStart={handleRenameStart}
					onRenameCommit={handleRenameCommit}
					onRenameCancel={() => {
						setRenamingID('');
						setRenameValue('');
					}}
					onToggleVisibility={(id) => {
						applyToTargets(id, (targetIds) => {
							targetIds.forEach((targetId) => {
								toggleControlVisibility(targetId, currentWorkspace);
							});
						});
					}}
					onToggleLock={(id) => {
						applyToTargets(id, (targetIds) => {
							targetIds.forEach((targetId) => {
								toggleControlLock(targetId, currentWorkspace);
							});
						});
					}}
					onDelete={(id) => {
						applyToTargets(id, (targetIds) => {
							targetIds.forEach((targetId) => {
								deleteControl(targetId, currentWorkspace);
							});
						});
					}}
					onDuplicate={(id) => {
						applyToTargets(id, (targetIds) => {
							targetIds.forEach((targetId) => {
								duplicateControl(
									targetId,
									currentWorkspace,
									currentWorkspace?.id || '',
								);
							});
						});
					}}
					onGroup={(id) => {
						const targetIds = getActionTargetIds(id);
						const targetItems = visibleControls.filter((item) =>
							targetIds.includes(item.id),
						);

						if (targetIds.length > 1) {
							addGroup(
								{
									childIds: targetIds,
									parentId: getSharedParentId(targetItems),
								},
								currentWorkspace,
							);
							return;
						}

						groupControl(id, currentWorkspace);
					}}
					onUngroup={(id) => {
						applyToTargets(id, (targetIds) => {
							targetIds.forEach((targetId) => {
								ungroupControl(targetId, currentWorkspace);
							});
						});
					}}
					onMoveStep={(id, direction) =>
						moveControlByStep({ id, direction }, currentWorkspace)
					}
					onMoveEdge={(id, position) =>
						moveControlToEdge({ id, position }, currentWorkspace)
					}
					onToggleCollapsed={(id) => toggleGroupCollapsed(id, currentWorkspace)}
					onDragStart={(id) => {
						setDraggedId(id);
						setDropTarget(null);
						setFocusedLayerID(id);
						if (!selectedLayerIDs.includes(id)) {
							setSelectedLayerIDs([id]);
							setSelectionAnchorID(id);
						}
					}}
					onDragOver={(event, item) => {
						event.preventDefault();
						if (draggedId === '' || draggedId === item.id) return;
						setDropTarget({
							id: item.id,
							position: handleDropPosition(event, item),
						});
					}}
					onDrop={(event, item) => {
						event.preventDefault();
						if (draggedId === '') return;

						const position = handleDropPosition(event, item);
						moveControlLayer(
							{
								draggedId,
								targetId: item.id,
								position,
							},
							currentWorkspace,
						);
						setDraggedId('');
						setDropTarget(null);
					}}
					onDragEnd={() => {
						setDraggedId('');
						setDropTarget(null);
					}}
					renameValue={renameValue}
					setRenameValue={setRenameValue}
				/>

				{!isCollapsed &&
					node.children.map((child) => renderNode(child, depth + 1))}
			</React.Fragment>
		);
	};

	return (
		<div className='flex h-full flex-col gap-3 pb-2'>
			<div className='flex flex-col gap-3'>
				<div className='flex items-center gap-2'>
					<div className='relative flex-1 p-2'>
						<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder='Search layers, groups, or types'
							className='pl-9'
						/>
					</div>
					<Button
						variant='outline'
						size='icon-sm'
						onClick={() => {
							if (selectedCount > 1) {
								addGroup(
									{
										childIds: selectedLayerIDs,
										parentId: getSharedParentId(selectedItems),
									},
									currentWorkspace,
								);
								return;
							}

							addGroup(
								{
									parentId:
										activeLayer?.type === 'group'
											? activeLayer.id
											: (activeLayer?.parentId ?? null),
								},
								currentWorkspace,
							);
						}}
						title={
							selectedCount > 1
								? `Create group from ${selectedCount} layers`
								: 'Create group'
						}
					>
						<Plus className='size-4' />
					</Button>
					<Button
						variant='ghost'
						size='icon-sm'
						onClick={() => {
							setQuery('');
							setFilter('all');
						}}
						title='Reset filters'
					>
						<RefreshCcw className='size-4' />
					</Button>
				</div>

				<div className='flex flex-wrap gap-2'>
					{[
						{ id: 'all', label: 'All' },
						{ id: 'visible', label: 'Visible' },
						{ id: 'hidden', label: 'Hidden' },
						{ id: 'locked', label: 'Locked' },
						{ id: 'groups', label: 'Groups' },
					].map((option) => (
						<Button
							key={option.id}
							variant={filter === option.id ? 'default' : 'ghost'}
							size='xs'
							onClick={() => setFilter(option.id as LayerFilter)}
						>
							{option.label}
						</Button>
					))}
				</div>
			</div>

			<div className='flex min-h-0 flex-1 flex-col gap-2'>
				{selectedCount > 1 && (
					<p className='px-1 text-xs text-muted-foreground'>
						{selectedCount} layers selected
					</p>
				)}
				{filteredTree.length > 0 ? (
					<div className='flex flex-col gap-0.5 pb-4'>
						{filteredTree.map((node) => renderNode(node))}
					</div>
				) : (
					<div className='flex flex-1 items-center justify-center rounded-surface border border-dashed border-border p-6'>
						<p className='max-w-52 text-center text-[13px] text-muted-foreground'>
							No layers match the current search. Try a different keyword or
							reset the filters.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
