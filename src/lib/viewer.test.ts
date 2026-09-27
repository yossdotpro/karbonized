import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	MAX_ZOOM,
	MIN_ZOOM,
	fitViewer,
	formatZoom,
	setViewerZoom,
	useViewStore,
	zoomViewerBy,
} from './viewer';

const createViewer = (initialZoom = 1) => {
	let zoom = initialZoom;
	const viewer = {
		getZoom: vi.fn(() => zoom),
		setZoom: vi.fn((next: number) => {
			zoom = next;
		}),
		scrollCenter: vi.fn(),
	};
	return { current: viewer };
};

beforeEach(() => {
	useViewStore.setState({ zoom: 1, snapping: true });
});

describe('setViewerZoom', () => {
	it('updates the viewer and the zoom indicator', () => {
		const viewer = createViewer();

		setViewerZoom(viewer, 0.5);

		expect(viewer.current.setZoom).toHaveBeenCalledWith(0.5);
		expect(useViewStore.getState().zoom).toBe(0.5);
	});

	it('clamps and rounds the zoom', () => {
		const viewer = createViewer();

		setViewerZoom(viewer, 100);
		expect(useViewStore.getState().zoom).toBe(MAX_ZOOM);

		setViewerZoom(viewer, 0.0001);
		expect(useViewStore.getState().zoom).toBe(MIN_ZOOM);

		setViewerZoom(viewer, 0.33333);
		expect(useViewStore.getState().zoom).toBe(0.33);
	});
});

describe('zoomViewerBy', () => {
	it('zooms in and out proportionally', () => {
		const viewer = createViewer(0.8);

		zoomViewerBy(viewer, 1);
		expect(useViewStore.getState().zoom).toBe(1);

		zoomViewerBy(viewer, -1);
		expect(useViewStore.getState().zoom).toBe(0.8);
	});
});

describe('fitViewer', () => {
	it('fits the workspace inside the container, never above 100%', () => {
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			callback(0);
			return 0;
		});

		const viewer = createViewer();
		const container = { clientWidth: 1096, clientHeight: 796 } as HTMLElement;

		fitViewer(viewer, { width: 2000, height: 1000 }, container);
		expect(useViewStore.getState().zoom).toBe(0.5);
		expect(viewer.current.scrollCenter).toHaveBeenCalled();

		fitViewer(viewer, { width: 200, height: 100 }, container);
		expect(useViewStore.getState().zoom).toBe(1);

		vi.unstubAllGlobals();
	});
});

describe('formatZoom', () => {
	it('formats as a percentage', () => {
		expect(formatZoom(0.5)).toBe('50%');
		expect(formatZoom(1.256)).toBe('126%');
	});
});
