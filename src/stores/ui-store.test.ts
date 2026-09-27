import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from './ui-store';

describe('the active tool', () => {
	beforeEach(() => {
		useUIStore.setState({ activeTool: 'select', previousTool: null });
	});

	it('changes tool and forgets any held one', () => {
		useUIStore.getState().setActiveTool('crop');
		expect(useUIStore.getState().activeTool).toBe('crop');
		expect(useUIStore.getState().previousTool).toBeNull();
	});

	it('goes back to the previous tool when a held key is released', () => {
		useUIStore.getState().setActiveTool('warp');
		useUIStore.getState().holdTool('pan');
		expect(useUIStore.getState().activeTool).toBe('pan');

		useUIStore.getState().releaseTool();
		expect(useUIStore.getState().activeTool).toBe('warp');
	});

	it('keeps the first held tool while the key repeats', () => {
		useUIStore.getState().setActiveTool('crop');
		useUIStore.getState().holdTool('pan');
		useUIStore.getState().holdTool('pan');

		useUIStore.getState().releaseTool();
		expect(useUIStore.getState().activeTool).toBe('crop');
	});

	it('does nothing when releasing without a held tool', () => {
		useUIStore.getState().setActiveTool('pan');
		useUIStore.getState().releaseTool();
		expect(useUIStore.getState().activeTool).toBe('pan');
	});
});
