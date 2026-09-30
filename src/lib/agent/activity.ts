import { create } from 'zustand';

/**
 * Who is using the canvas right now, so the editor can show it.
 *
 * Every tool call of Agent and MCP clients goes through `executeTool`, which
 * reports its start and end here. A source stays active for a moment after its
 * last call: models think between calls, and the indicator would otherwise
 * blink on and off through one piece of work.
 */

export type ActivitySource = 'agent' | 'mcp';

/** How long a source still shows as active after its last tool call. */
export const ACTIVITY_LINGER_MS = 2500;

interface CanvasActivityState {
	/** Tool calls running, per source. */
	running: Record<ActivitySource, number>;
	/** Sources whose last call ended less than `ACTIVITY_LINGER_MS` ago. */
	lingering: Record<ActivitySource, boolean>;
	/** Title of the tool that ran last, per source ("Add block"). */
	tool: Record<ActivitySource, string | null>;
}

const idle = (): CanvasActivityState => ({
	running: { agent: 0, mcp: 0 },
	lingering: { agent: false, mcp: false },
	tool: { agent: null, mcp: null },
});

export const useCanvasActivity = create<CanvasActivityState>(() => idle());

const lingerTimers: Partial<
	Record<ActivitySource, ReturnType<typeof setTimeout>>
> = {};

/** A tool call started. Returns the function that reports its end. */
export const beginToolActivity = (
	source: ActivitySource,
	title: string,
): (() => void) => {
	clearTimeout(lingerTimers[source]);
	useCanvasActivity.setState((state) => ({
		running: { ...state.running, [source]: state.running[source] + 1 },
		lingering: { ...state.lingering, [source]: false },
		tool: { ...state.tool, [source]: title },
	}));

	let ended = false;
	return () => {
		if (ended) return;
		ended = true;
		useCanvasActivity.setState((state) => ({
			running: {
				...state.running,
				[source]: Math.max(0, state.running[source] - 1),
			},
			lingering: { ...state.lingering, [source]: true },
		}));

		clearTimeout(lingerTimers[source]);
		lingerTimers[source] = setTimeout(() => {
			if (useCanvasActivity.getState().running[source] > 0) return;
			useCanvasActivity.setState((state) => ({
				lingering: { ...state.lingering, [source]: false },
				tool: { ...state.tool, [source]: null },
			}));
		}, ACTIVITY_LINGER_MS);
	};
};

/** The source is running a tool call or ran one a moment ago. */
export const isSourceActive = (
	state: CanvasActivityState,
	source: ActivitySource,
): boolean => state.running[source] > 0 || state.lingering[source];

/** Back to idle (tests). */
export const resetCanvasActivity = (): void => {
	for (const source of Object.keys(lingerTimers) as ActivitySource[]) {
		clearTimeout(lingerTimers[source]);
	}
	useCanvasActivity.setState(idle());
};
