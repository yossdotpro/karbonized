import React, { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../../stores';
import { ChevronLeft, ChevronRight, Diamond, Pencil, X } from 'lucide-react';
import { Scrollbars } from 'react-custom-scrollbars-2';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';

export const TabBar: React.FC = () => {
	const workspaces = useWorkspaceStore((state) => state.workspaces);
	const currentWorkspaceID = useWorkspaceStore(
		(state) => state.currentWorkspaceID,
	);

	const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace);
	const setCurrentWorkspace = useWorkspaceStore(
		(state) => state.setCurrentWorkspace,
	);
	const closeOtherWorkspaces = useWorkspaceStore(
		(state) => state.closeOtherWorkspaces,
	);
	const closeWorkspacesToRight = useWorkspaceStore(
		(state) => state.closeWorkspacesToRight,
	);
	const closeWorkspacesToLeft = useWorkspaceStore(
		(state) => state.closeWorkspacesToLeft,
	);
	const setWorkspaceName = useWorkspaceStore((state) => state.setWorkspaceName);

	/* Tab being renamed in place (double click or "Rename") */
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [draftName, setDraftName] = useState('');
	const cancelRename = useRef(false);
	/* "Rename" from the context menu starts once the menu has closed, so the
	   field keeps the focus the menu would otherwise take back. */
	const pendingRename = useRef<{ id: string; name: string } | null>(null);

	const startRename = (workspaceId: string, name: string) => {
		setCurrentWorkspace(workspaceId);
		setDraftName(name);
		cancelRename.current = false;
		setRenamingId(workspaceId);
	};

	const commitRename = () => {
		const name = draftName.trim();
		// setWorkspaceName renames the current workspace, which is this tab.
		if (renamingId && name && !cancelRename.current) setWorkspaceName(name);
		setRenamingId(null);
	};

	const ref = useRef<Scrollbars>(null);
	const [contextMenuWorkspaceId, setContextMenuWorkspaceId] = useState<
		string | null
	>(null);

	useEffect(() => {
		ref.current?.scrollToRight();
	}, [workspaces]);

	const getWorkspaceIndex = (workspaceId: string) => {
		return workspaces.findIndex((item) => item.id === workspaceId);
	};

	const canCloseOthers = workspaces.length > 1;
	const canCloseRight =
		getWorkspaceIndex(contextMenuWorkspaceId || '') < workspaces.length - 1;
	const canCloseLeft = getWorkspaceIndex(contextMenuWorkspaceId || '') > 0;

	// Don't render TabBar if there are no workspaces
	if (workspaces.length === 0) {
		return null;
	}

	return (
		<Scrollbars
			ref={ref}
			autoHeight
			autoHide
			style={{ width: '100%' }}
			renderThumbHorizontal={(props) => (
				<div {...props} className='rounded-full bg-border' />
			)}
			onWheel={(event: any) => {
				const delta = Math.max(
					-1,
					Math.min(
						1,
						event.nativeEvent.wheelDelta || -event.nativeEvent.detail,
					),
				);

				ref.current?.scrollLeft(ref.current.getScrollLeft() - delta * 20);
				event.preventDefault();
			}}
		>
			<div className='not-draggable flex w-fit items-center gap-0.5 py-1'>
				{workspaces.map((item) => (
					<ContextMenu key={item.id}>
						<ContextMenuTrigger asChild>
							{renamingId === item.id ? (
								<div className='flex h-7 items-center gap-1.5 rounded-control bg-accent pl-2 pr-1 text-[13px] text-foreground'>
									<Diamond className='shrink-0 opacity-70' size={13}></Diamond>
									<input
										autoFocus
										aria-label='Workspace name'
										value={draftName}
										onChange={(ev) => setDraftName(ev.target.value)}
										onFocus={(ev) => ev.currentTarget.select()}
										onBlur={commitRename}
										onKeyDown={(ev) => {
											if (ev.key === 'Enter') commitRename();
											if (ev.key === 'Escape') {
												cancelRename.current = true;
												setRenamingId(null);
											}
										}}
										style={{ width: `${Math.max(draftName.length, 4) + 1}ch` }}
										className='min-w-0 rounded-[4px] bg-background px-1 outline-none ring-1 ring-ring/40'
									/>
								</div>
							) : (
								<button
									id={item.id}
									onClick={() => {
										setCurrentWorkspace(item.id);
									}}
									onDoubleClick={() => startRename(item.id, item.workspaceName)}
									title='Double click to rename'
									onContextMenu={() => setContextMenuWorkspaceId(item.id)}
									className={`group relative flex h-7 items-center gap-1.5 rounded-control pl-2 pr-1 text-[13px] outline-hidden select-none transition-colors ${
										currentWorkspaceID === item.id
											? 'bg-accent text-foreground'
											: 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
									}`}
								>
									<Diamond className='shrink-0 opacity-70' size={13}></Diamond>
									<label className='select-none whitespace-nowrap'>
										{item.workspaceName}
									</label>

									<div
										onClick={(ev) => {
											ev.stopPropagation();
											deleteWorkspace(item.id);
										}}
										className={`flex size-5 items-center justify-center rounded-[4px] text-muted-foreground transition-opacity hover:bg-foreground/10 hover:text-foreground group-hover:opacity-100 ${
											currentWorkspaceID === item.id
												? 'opacity-60'
												: 'opacity-0'
										}`}
									>
										<X size={12}></X>
									</div>
								</button>
							)}
						</ContextMenuTrigger>
						<ContextMenuContent
							onCloseAutoFocus={(ev) => {
								const pending = pendingRename.current;
								if (!pending) return;
								ev.preventDefault();
								pendingRename.current = null;
								startRename(pending.id, pending.name);
							}}
						>
							<ContextMenuItem
								onClick={() => {
									pendingRename.current = {
										id: item.id,
										name: item.workspaceName,
									};
								}}
							>
								<Pencil className='size-4' />
								Rename
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem
								onClick={() => deleteWorkspace(item.id)}
								className='text-destructive focus:bg-destructive/10 focus:text-destructive'
							>
								<X className='size-4' />
								Close
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem
								onClick={() => closeOtherWorkspaces(item.id)}
								disabled={!canCloseOthers}
							>
								Close others
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => closeWorkspacesToRight(item.id)}
								disabled={!canCloseRight}
							>
								<ChevronRight className='size-4' />
								Close to the right
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => closeWorkspacesToLeft(item.id)}
								disabled={!canCloseLeft}
							>
								<ChevronLeft className='size-4' />
								Close to the left
							</ContextMenuItem>
						</ContextMenuContent>
					</ContextMenu>
				))}
			</div>
		</Scrollbars>
	);
};

export default TabBar;
