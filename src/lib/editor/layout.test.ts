import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '@/stores/ui-store';
import { useAgentUI } from '@/lib/agent/ui-store';
import { applyLayout, layoutOf, nextLayout } from './layout';

describe('panel layout', () => {
	beforeEach(() => applyLayout('canvas'));

	it('names the layout from the open panels', () => {
		expect(layoutOf(false, false).id).toBe('canvas');
		expect(layoutOf(true, false).id).toBe('properties');
		expect(layoutOf(false, true).id).toBe('agent');
		expect(layoutOf(true, true).id).toBe('both');
	});

	it('opens and closes the panels of a preset', () => {
		applyLayout('both');
		expect(useUIStore.getState().propertiesOpen).toBe(true);
		expect(useAgentUI.getState().panelOpen).toBe(true);

		applyLayout('agent');
		expect(useUIStore.getState().propertiesOpen).toBe(false);
		expect(useAgentUI.getState().panelOpen).toBe(true);
	});

	it('cycles through every preset and wraps around', () => {
		const seen: string[] = [];
		for (let step = 0; step < 4; step += 1) {
			const next = nextLayout();
			seen.push(next);
			applyLayout(next);
		}
		expect(seen).toEqual(['properties', 'agent', 'both', 'canvas']);
	});
});
