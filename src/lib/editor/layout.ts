import { Columns3, PanelRight, Square } from 'lucide-react';
import type { ComponentType } from 'react';
import { AgentMark } from '@/components/Agent/AgentMark';
import { useUIStore } from '@/stores/ui-store';
import { useAgentUI } from '@/lib/agent/ui-store';

/**
 * Which side panels are open. The properties panel floats over the right
 * edge of the canvas and the agent docks to the left of it; the layout is
 * nothing more than those two flags, so opening or closing a panel by hand
 * lands on one of these presets too.
 */
export type PanelLayout = 'canvas' | 'properties' | 'agent' | 'both';

interface LayoutPreset {
	id: PanelLayout;
	label: string;
	icon: ComponentType<{ className?: string }>;
	properties: boolean;
	agent: boolean;
}

export const PANEL_LAYOUTS: readonly LayoutPreset[] = [
	{
		id: 'canvas',
		label: 'Canvas',
		icon: Square,
		properties: false,
		agent: false,
	},
	{
		id: 'properties',
		label: 'Properties',
		icon: PanelRight,
		properties: true,
		agent: false,
	},
	{
		id: 'agent',
		label: 'Agent',
		icon: AgentMark,
		properties: false,
		agent: true,
	},
	{
		id: 'both',
		label: 'Properties + Agent',
		icon: Columns3,
		properties: true,
		agent: true,
	},
];

export const layoutOf = (properties: boolean, agent: boolean): LayoutPreset =>
	PANEL_LAYOUTS.find(
		(layout) => layout.properties === properties && layout.agent === agent,
	) ?? PANEL_LAYOUTS[0];

export const usePanelLayout = (): LayoutPreset => {
	const properties = useUIStore((state) => state.propertiesOpen);
	const agent = useAgentUI((state) => state.panelOpen);
	return layoutOf(properties, agent);
};

export const applyLayout = (id: PanelLayout): void => {
	const layout = PANEL_LAYOUTS.find((item) => item.id === id);
	if (layout === undefined) return;
	useUIStore.getState().setPropertiesOpen(layout.properties);
	useAgentUI.getState().setPanelOpen(layout.agent);
};

/** The layout after the current one, wrapping around. */
export const nextLayout = (): PanelLayout => {
	const current = layoutOf(
		useUIStore.getState().propertiesOpen,
		useAgentUI.getState().panelOpen,
	);
	const index = PANEL_LAYOUTS.findIndex((layout) => layout.id === current.id);
	return PANEL_LAYOUTS[(index + 1) % PANEL_LAYOUTS.length].id;
};
