import React, { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../../stores';
import {
	IconSquareRotated,
	IconX,
	IconX as IconClose,
	IconChevronRight,
	IconChevronLeft,
} from '@tabler/icons-react';
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
			<div className='flex w-fit items-center gap-0.5 py-1'>
				{workspaces.map((item) => (
					<ContextMenu key={item.id}>
						<ContextMenuTrigger asChild>
							<button
								id={item.id}
								onClick={() => {
									setCurrentWorkspace(item.id);
								}}
								onContextMenu={() => setContextMenuWorkspaceId(item.id)}
								className={`group relative flex h-7 items-center gap-1.5 rounded-control pl-2 pr-1 text-[13px] outline-hidden select-none transition-colors ${
									currentWorkspaceID === item.id
										? 'bg-accent text-foreground'
										: 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
								}`}
							>
								<IconSquareRotated
									className='shrink-0 opacity-70'
									size={13}
								></IconSquareRotated>
								<label className='select-none whitespace-nowrap'>
									{item.workspaceName}
								</label>

								<div
									onClick={(ev) => {
										ev.stopPropagation();
										deleteWorkspace(item.id);
									}}
									className={`flex size-5 items-center justify-center rounded-[4px] text-muted-foreground transition-opacity hover:bg-foreground/10 hover:text-foreground group-hover:opacity-100 ${
										currentWorkspaceID === item.id ? 'opacity-60' : 'opacity-0'
									}`}
								>
									<IconX size={12}></IconX>
								</div>
							</button>
						</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuItem
								onClick={() => deleteWorkspace(item.id)}
								className='text-destructive focus:bg-destructive/10 focus:text-destructive'
							>
								<IconClose className='size-4' />
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
								<IconChevronRight className='size-4' />
								Close to the right
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => closeWorkspacesToLeft(item.id)}
								disabled={!canCloseLeft}
							>
								<IconChevronLeft className='size-4' />
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
