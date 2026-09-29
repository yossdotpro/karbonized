import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	MAX_ZOOM,
	MIN_ZOOM,
	fitViewer,
	formatZoom,
	measureInsets,
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
		scrollBy: vi.fn(),
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

	it('fits and centers the workspace in the space the panels leave', () => {
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			callback(0);
			return 0;
		});

		const viewer = createViewer();
		const container = { clientWidth: 1496, clientHeight: 796 } as HTMLElement;

		// A 400 px properties panel on the right leaves 1096 px: 50%, not 70%.
		fitViewer(viewer, { width: 2000, height: 1000 }, container, {
			left: 0,
			right: 400,
			top: 0,
			bottom: 0,
		});

		expect(useViewStore.getState().zoom).toBe(0.5);
		// Half the panel, in canvas pixels, to the right of the centered view.
		expect(viewer.current.scrollBy).toHaveBeenCalledWith(400, 0);

		vi.unstubAllGlobals();
	});
});

describe('measureInsets', () => {
	const viewer = { left: 100, right: 1100, top: 0, bottom: 800 };

	it('counts each panel on the side it sits on', () => {
		expect(
			measureInsets(viewer, [
				{ left: 108, right: 156, top: 200, bottom: 600 },
				{ left: 760, right: 1100, top: 0, bottom: 800 },
			]),
		).toEqual({ left: 56, right: 340, top: 0, bottom: 0 });
	});

	it('ignores panels outside the viewer or collapsed', () => {
		expect(
			measureInsets(viewer, [
				{ left: 0, right: 90, top: 0, bottom: 800 },
				{ left: 900, right: 900, top: 0, bottom: 800 },
			]),
		).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
	});
});

describe('formatZoom', () => {
	it('formats as a percentage', () => {
		expect(formatZoom(0.5)).toBe('50%');
		expect(formatZoom(1.256)).toBe('126%');
	});
});
