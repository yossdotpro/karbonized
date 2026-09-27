import { useEffect } from 'react';
import localforage from 'localforage';
import { toJpeg } from 'html-to-image';
import { create } from 'zustand';
import { useControlsStore, useWorkspaceStore } from '@/stores';
import type { Project, Workspace } from '@/types';
import { buildProject } from './projects';

/**
 * Recent projects.
 *
 * The open workspace is snapshotted (with a small thumbnail) while you edit,
 * so it stays reachable from the start screen after its tab is closed.
 * Stored in IndexedDB next to the autosaved session.
 */

export interface RecentProject {
	/** Workspace id; reopening keeps it, so a project maps to one entry. */
	id: string;
	name: string;
	width: number;
	height: number;
	updatedAt: number;
	thumbnail?: string;
	project: Project;
}

const STORAGE_KEY = 'karbonized:recents';
const MAX_RECENTS = 12;
const SAVE_DELAY_MS = 1500;
/** Thumbnails are slower to render than snapshots, so refresh them less. */
const THUMBNAIL_INTERVAL_MS = 5000;
const THUMBNAIL_WIDTH = 480;

const storage = localforage.createInstance({
	name: 'karbonized',
	storeName: 'recents',
});

interface RecentsState {
	items: RecentProject[];
	loaded: boolean;
}

export const useRecentProjects = create<RecentsState>(() => ({
	items: [],
	loaded: false,
}));

let loading: Promise<void> | null = null;

export const loadRecents = (): Promise<void> => {
	loading ??= storage
		.getItem<RecentProject[]>(STORAGE_KEY)
		.then((items) => {
			useRecentProjects.setState({
				items: Array.isArray(items) ? items : [],
				loaded: true,
			});
		})
		.catch((error) => {
			console.error('Could not load recent projects:', error);
			useRecentProjects.setState({ loaded: true });
		});

	return loading;
};

const persist = async (items: RecentProject[]) => {
	useRecentProjects.setState({ items });
	try {
		await storage.setItem(STORAGE_KEY, items);
	} catch (error) {
		console.error('Could not save recent projects:', error);
	}
};

/** Runs list updates one at a time, so concurrent writes don't drop entries. */
let queue: Promise<void> = Promise.resolve();
const enqueue = (task: () => Promise<void>): Promise<void> => {
	queue = queue.then(task, task);
	return queue;
};

export const removeRecent = (id: string): Promise<void> =>
	enqueue(async () => {
		await loadRecents();
		await persist(
			useRecentProjects.getState().items.filter((item) => item.id !== id),
		);
	});

/** Snapshots an open workspace into the recent projects list. */
export const recordRecent = (
	workspaceId: string,
	thumbnail?: string,
	closedWorkspace?: Workspace,
): Promise<void> =>
	enqueue(async () => {
		await loadRecents();

		const project = buildProject(workspaceId, closedWorkspace);
		if (!project) return;

		const { items } = useRecentProjects.getState();
		const previous = items.find((item) => item.id === workspaceId);

		const entry: RecentProject = {
			id: workspaceId,
			name: project.workspace.workspaceName || 'Untitled',
			width: Number(project.workspace.workspaceWidth) || 0,
			height: Number(project.workspace.workspaceHeight) || 0,
			updatedAt: Date.now(),
			thumbnail: thumbnail ?? previous?.thumbnail,
			project,
		};

		await persist(
			[entry, ...items.filter((item) => item.id !== workspaceId)].slice(
				0,
				MAX_RECENTS,
			),
		);
	});

/** Small JPEG of the visible canvas (without selection handles). */
const captureThumbnail = async (): Promise<string | undefined> => {
	const canvas = document.querySelector<HTMLElement>('#workspace > div');
	if (!canvas || canvas.offsetWidth === 0) return undefined;

	try {
		return await toJpeg(canvas, {
			quality: 0.75,
			pixelRatio: Math.min(1, THUMBNAIL_WIDTH / canvas.offsetWidth),
			skipFonts: true,
			// Leave selection handles out of the picture.
			filter: (node) =>
				!(node instanceof HTMLElement) ||
				!node.classList.contains('moveable-control-box'),
		});
	} catch {
		return undefined;
	}
};

const whenIdle = (callback: () => void) => {
	if (typeof window.requestIdleCallback === 'function') {
		window.requestIdleCallback(callback, { timeout: 2000 });
	} else {
		setTimeout(callback, 200);
	}
};

/** Keeps the open workspace in the recent projects list while editing. */
export const useRecentsTracker = (): void => {
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		let thumbnailTimer: ReturnType<typeof setTimeout> | undefined;
		let lastThumbnailAt = 0;
		let lastWorkspaceId = '';
		let disposed = false;

		const snapshot = () => {
			const { currentWorkspaceID } = useWorkspaceStore.getState();
			if (!currentWorkspaceID) return;

			const switched = currentWorkspaceID !== lastWorkspaceId;
			const wait = switched
				? 0
				: lastThumbnailAt + THUMBNAIL_INTERVAL_MS - Date.now();
			lastWorkspaceId = currentWorkspaceID;
			clearTimeout(thumbnailTimer);

			if (wait > 0) {
				// Save the data now and refresh the thumbnail once allowed.
				void recordRecent(currentWorkspaceID);
				thumbnailTimer = setTimeout(snapshot, wait);
				return;
			}

			lastThumbnailAt = Date.now();
			whenIdle(() => {
				if (disposed) return;
				void captureThumbnail().then((thumbnail) => {
					// The user may have switched tabs while the thumbnail rendered.
					if (
						useWorkspaceStore.getState().currentWorkspaceID !==
						currentWorkspaceID
					) {
						return;
					}
					void recordRecent(currentWorkspaceID, thumbnail);
				});
			});
		};

		const schedule = () => {
			clearTimeout(timer);
			timer = setTimeout(snapshot, SAVE_DELAY_MS);
		};

		const unsubscribeWorkspaces = useWorkspaceStore.subscribe(
			(next, previous) => {
				// Keep the last state of tabs that were just closed.
				if (next.workspaces !== previous.workspaces) {
					const open = new Set(next.workspaces.map((item) => item.id));
					previous.workspaces
						.filter((item) => !open.has(item.id))
						.forEach((item) => void recordRecent(item.id, undefined, item));
				}

				if (next.currentWorkspaceID !== previous.currentWorkspaceID) {
					// Save the tab we are leaving before it goes out of view.
					if (previous.currentWorkspaceID) {
						void recordRecent(previous.currentWorkspaceID);
					}
					schedule();
				} else if (next.workspaces !== previous.workspaces) {
					schedule();
				}
			},
		);
		const unsubscribeControls = useControlsStore.subscribe((next, previous) => {
			if (next.ControlProperties !== previous.ControlProperties) schedule();
		});

		// Give blocks a moment to mount before the first thumbnail.
		timer = setTimeout(snapshot, SAVE_DELAY_MS * 2);

		return () => {
			disposed = true;
			clearTimeout(timer);
			clearTimeout(thumbnailTimer);
			unsubscribeWorkspaces();
			unsubscribeControls();

			const { currentWorkspaceID } = useWorkspaceStore.getState();
			if (currentWorkspaceID) void recordRecent(currentWorkspaceID);
		};
	}, []);
};
