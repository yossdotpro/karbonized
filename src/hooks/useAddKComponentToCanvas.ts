import { useCallback } from 'react';
import { toast } from 'sonner';
import { addBlock } from '@/lib/editor/actions';
import { KComponent } from '@/models/KComponent';
import { useKComponentStore } from '@/stores/kcomponent-store';

/**
 * `useControlState` ignores a falsy initial property, so an empty section would
 * silently fall back to the demo content of a blank HTML block.
 */
const EMPTY_CSS = ':root {\n}\n';
const EMPTY_JS = '// No actions defined by this component\n';

/** Turns a kcomponent into the properties of an HTML block. */
export const kcomponentBlockInput = (component: KComponent) => ({
	type: 'html',
	name: component.manifest.name,
	width: component.manifest.width,
	height: component.manifest.height,
	properties: {
		html: component.html,
		css: component.css || EMPTY_CSS,
		js: component.js || EMPTY_JS,
	},
});

/**
 * Materializes a kcomponent as an HTML block in the current workspace.
 * Shared by the components gallery and the menu bar so both stay in sync.
 */
export const useAddKComponentToCanvas = () => {
	const markComponentUsed = useKComponentStore(
		(state) => state.markComponentUsed,
	);

	return useCallback(
		(component: KComponent, importedId?: string): string | null => {
			try {
				const block = addBlock(kcomponentBlockInput(component));
				if (importedId) markComponentUsed(importedId);

				return block.id;
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : 'The component was not added',
				);

				return null;
			}
		},
		[markComponentUsed],
	);
};

export default useAddKComponentToCanvas;
