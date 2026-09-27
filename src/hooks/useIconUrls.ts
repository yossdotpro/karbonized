import { useEffect, useState } from 'react';
import type { CSSVariable } from '@/lib/blocks-api';
import { iconMaskUrl } from '@/lib/icons/icons';

/** Resolve the `icon` CSS variables of an HTML block to image URLs. */
export const useIconUrls = (
	variables: CSSVariable[],
): Record<string, string> => {
	const names = variables
		.filter((variable) => variable.type === 'icon')
		.map((variable) => String(variable.value));
	const key = names.join('|');
	const [urls, setUrls] = useState<Record<string, string>>({});

	useEffect(() => {
		if (key === '') return;
		let cancelled = false;

		void Promise.all(
			key.split('|').map(async (name) => [name, await iconMaskUrl(name)]),
		).then((entries) => {
			if (cancelled) return;
			setUrls(
				Object.fromEntries(
					entries.filter((entry): entry is [string, string] =>
						Boolean(entry[1]),
					),
				),
			);
		});

		return () => {
			cancelled = true;
		};
	}, [key]);

	return urls;
};
