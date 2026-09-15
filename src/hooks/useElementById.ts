import { useEffect, useState } from 'react';

/**
 * Element with the given id, looked up after mount so that portal targets
 * rendered elsewhere in the tree already exist.
 */
export const useElementById = (id: string): HTMLElement | null => {
	const [element, setElement] = useState<HTMLElement | null>(null);

	useEffect(() => {
		// Reading the DOM has to wait for the commit.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setElement(document.getElementById(id));
	}, [id]);

	return element;
};
