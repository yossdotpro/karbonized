import { create } from 'zustand';
import { getRandomNumber } from '../utils/getRandom';
import type {
	Workspace,
	WorkspaceGradientSettings,
	WorkspaceDynamicSettings,
	TextureColors,
} from '../types';

interface WorkspaceState {
	workspaces: Workspace[];
	currentWorkspaceID: string;
	currentWorkspace: Workspace | undefined;
}

interface WorkspaceActions {
	addWorkspace: (id?: string, name?: string) => void;
	setCurrentWorkspace: (id: string) => void;
	deleteWorkspace: (id: string) => void;
	closeOtherWorkspaces: (id: string) => void;
	closeWorkspacesToRight: (id: string) => void;
	closeWorkspacesToLeft: (id: string) => void;
	setWorkspaceControls: (controls: any[]) => void;
	setWorkspaceGradient: (settings: WorkspaceGradientSettings) => void;
	setWorkspaceDynamic: (settings: WorkspaceDynamicSettings) => void;
	setWorkspaceDynamicType: (
		type: 'mesh' | 'lava' | 'starfield' | 'galaxy',
	) => void;
	setWorkspaceBlur: (blur: number) => void;
	setWorkspaceNoise: (noise: number) => void;
	generateDynamicSeed: () => void;
	setTextureName: (name: string) => void;
	setTextureColors: (colors: TextureColors) => void;
	setWorkspaceColorMode: (mode: string) => void;
	setWorkspaceName: (name: string) => void;
	setWorkspaceColor: (color: string) => void;
	setWorkspaceSize: (size: { height: string; width: string }) => void;
	setWorkspaceType: (type: string) => void;
	cleanWorkspace: () => void;
}

const createDefaultWorkspace = (id: string, name: string): Workspace => ({
	id,
	controls: [],
	workspaceColor: '#ffffff',
	workspaceHeight: '720',
	workspaceWidth: '1280',
	workspaceColorMode: 'Single',
	workspaceName: name,
	workspaceType: 'color',
	workspaceGradientSettings: {
		color1: '#00B4DB',
		color2: '#0083B0',
		deg: 98,
	},
	workspaceDynamicSettings: {
		colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
		seed: 1234,
	},
	workspaceDynamicType: 'mesh',
	workspaceBlur: 0,
	workspaceNoise: 0,
	textureName: 'grayrate',
	textureColors: { color1: '#409ccf', color2: '#136179' },
});

type WorkspaceStore = WorkspaceState & WorkspaceActions;

const buildNextWorkspaceState = (
	workspaces: Workspace[],
	currentWorkspaceID: string,
): Pick<
	WorkspaceState,
	'workspaces' | 'currentWorkspaceID' | 'currentWorkspace'
> => ({
	workspaces,
	currentWorkspaceID,
	currentWorkspace:
		workspaces.find((item) => item.id === currentWorkspaceID) ?? workspaces[0],
});

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
	...buildNextWorkspaceState([], ''),

	addWorkspace: (id, name) => {
		const newId = id || getRandomNumber().toString();
		const workspaceName = name || `Workspace ${get().workspaces.length + 1}`;
		const newWorkspace = createDefaultWorkspace(newId, workspaceName);

		set((state) =>
			buildNextWorkspaceState(
				[...state.workspaces, newWorkspace],
				state.currentWorkspaceID,
			),
		);
	},

	setCurrentWorkspace: (id) => {
		set((state) => buildNextWorkspaceState(state.workspaces, id));
	},

	deleteWorkspace: (id) => {
		const state = get();
		if (state.workspaces.length <= 1) {
			alert('You need at least one Workspace');
			return;
		}

		const newIndex = state.workspaces.findIndex((item) => item.id === id);
		const newWorkspaces = state.workspaces.filter((item) => item.id !== id);

		let newCurrentId = state.currentWorkspaceID;
		if (newIndex >= 0) {
			const targetIndex = newIndex > 0 ? newIndex - 1 : 0;
			newCurrentId = newWorkspaces[targetIndex]?.id || '';
		}

		set(buildNextWorkspaceState(newWorkspaces, newCurrentId));
	},

	closeOtherWorkspaces: (id) => {
		const state = get();
		if (state.workspaces.length <= 1) return;

		set(
			buildNextWorkspaceState(
				state.workspaces.filter((item) => item.id === id),
				id,
			),
		);
	},

	closeWorkspacesToRight: (id) => {
		const state = get();
		const currentIndex = state.workspaces.findIndex((item) => item.id === id);

		if (currentIndex !== -1 && currentIndex < state.workspaces.length - 1) {
			set(
				buildNextWorkspaceState(
					state.workspaces.slice(0, currentIndex + 1),
					state.currentWorkspaceID,
				),
			);
		}
	},

	closeWorkspacesToLeft: (id) => {
		const state = get();
		const currentIndex = state.workspaces.findIndex((item) => item.id === id);

		if (currentIndex > 0) {
			set(buildNextWorkspaceState(state.workspaces.slice(currentIndex), id));
		}
	},

	setWorkspaceControls: (controls) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID ? { ...item, controls } : item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceGradient: (settings) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, workspaceGradientSettings: settings }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceDynamic: (settings) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, workspaceDynamicSettings: settings }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceDynamicType: (type) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, workspaceDynamicType: type }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceBlur: (blur) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, workspaceBlur: blur }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceNoise: (noise) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, workspaceNoise: noise }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	generateDynamicSeed: () => {
		const newSeed = Math.floor(Math.random() * 10000);
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? {
							...item,
							workspaceDynamicSettings: {
								...item.workspaceDynamicSettings,
								seed: newSeed,
							},
						}
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setTextureName: (name) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, textureName: name }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setTextureColors: (colors) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, textureColors: colors }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceColorMode: (mode) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, workspaceColorMode: mode }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceName: (name) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, workspaceName: name }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceColor: (color) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, workspaceColor: color }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceSize: (size) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? {
							...item,
							workspaceHeight: size.height,
							workspaceWidth: size.width,
						}
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	setWorkspaceType: (type) => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID
					? { ...item, workspaceType: type }
					: item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},

	cleanWorkspace: () => {
		set((state) => {
			const workspaces = state.workspaces.map((item) =>
				item.id === state.currentWorkspaceID ? { ...item, controls: [] } : item,
			);
			return buildNextWorkspaceState(workspaces, state.currentWorkspaceID);
		});
	},
}));
