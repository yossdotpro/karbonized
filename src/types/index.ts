export interface Item {
	id: string;
	type: string;
	name: string;
	isSelectable: boolean;
	isVisible: boolean;
	isDeleted: boolean;
	locked?: boolean;
	parentId?: string | null;
	collapsed?: boolean;
}

export interface Project {
	thumb?: string;
	properties: History[];
	workspace: Workspace;
}

export interface History {
	id: string;
	value: any;
	workspace?: string;
}

export interface Workspace {
	id: string;
	controls: Item[];
	workspaceName: string;
	workspaceColor: string;
	workspaceColorMode: string;
	workspaceType: string; // Color or Texture
	workspaceWidth: string;
	workspaceHeight: string;
	workspaceGradientSettings: { color1: string; color2: string; deg: number };
	workspaceDynamicSettings: { colors: string[]; seed: number };
	workspaceDynamicType: 'mesh' | 'lava' | 'starfield' | 'galaxy'; // Type of dynamic background
	workspaceBlur: number;
	workspaceNoise: number;
	textureName: string;
	textureColors: { color1: string; color2: string };
}

export interface LayerSnapshot {
	controls: Item[];
	currentControlID: string;
}

export type LayerMovePosition = 'before' | 'after' | 'inside';
export type LayerStepDirection = 'forward' | 'backward';
export type LayerEdgePosition = 'front' | 'back';
export type SelectedTab = 'hierarchy' | 'control' | 'workspace' | 'extensions';
export type HistorySignal = 'redo' | 'undo' | '';

export interface ControlSize {
	w: number;
	h: number;
}

export interface ControlPosition {
	x: number;
	y: number;
}

export interface WorkspaceGradientSettings {
	color1: string;
	color2: string;
	deg: number;
}

export interface WorkspaceDynamicSettings {
	colors: string[];
	seed: number;
}

export interface TextureColors {
	color1: string;
	color2: string;
}
