import { useMemo } from 'react';
import {
	type CSSVariable,
	type CustomAction,
	type JSVariable,
	parseCSSVariables,
	parseJavaScript,
} from '@/lib/blocks-api';

interface HTMLBlockBindings {
	cssVariables: CSSVariable[];
	jsVariables: JSVariable[];
	customActions: CustomAction[];
}

export const useHTMLBlockBindings = (
	cssContent: string,
	jsContent: string,
): HTMLBlockBindings =>
	useMemo(() => {
		const cssVariables = parseCSSVariables(cssContent);
		const parsedJavaScript = parseJavaScript(jsContent);

		return {
			cssVariables,
			jsVariables: parsedJavaScript.variables,
			customActions: parsedJavaScript.actions.map((action) => ({
				id: action.id,
				label: action.label,
				icon: 'Play',
			})),
		};
	}, [cssContent, jsContent]);

export default useHTMLBlockBindings;
