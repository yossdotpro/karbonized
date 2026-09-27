import { useWorkspaceStore } from '@/stores';
import {
	type ProjectVariable,
	resolveVariables,
} from '@/lib/variables/variables';

const NONE: ProjectVariable[] = [];

/** The variables of the open project. */
export const useProjectVariables = (): ProjectVariable[] =>
	useWorkspaceStore((state) => state.currentWorkspace?.variables ?? NONE);

/**
 * A block's text as it should show: `{{name}}` replaced with the value of
 * the project variable. Use it for what the canvas renders, never for the
 * value an input edits.
 */
export const useResolvedText = (
	text: string,
	escape?: (value: string) => string,
): string => resolveVariables(text, useProjectVariables(), { escape });
