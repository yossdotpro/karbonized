import React, { createElement, useEffect, useState } from 'react';
import { type IconComponent, resolveIcon } from '@/lib/icons/icons';

interface IconProps {
	/** Icon name from any registered set, e.g. `FaRocket` or `acme:bolt`. */
	icon: string;
	style?: React.CSSProperties;
	className?: string;
}

/** Renders an icon by name (see `src/lib/icons/icons.ts`). */
export const FaIcon: React.FC<IconProps> = ({ icon, style, className }) => {
	const [component, setComponent] = useState<{
		name: string;
		icon: IconComponent | null;
	}>();

	useEffect(() => {
		let cancelled = false;
		void resolveIcon(icon).then(async (found) => {
			// Unknown names fall back to the Font Awesome logo, as before.
			const resolved = found ?? (await resolveIcon('FaFontAwesome'));
			if (!cancelled) setComponent({ name: icon, icon: resolved });
		});
		return () => {
			cancelled = true;
		};
	}, [icon]);

	return component?.icon
		? createElement(component.icon, { className, style })
		: null;
};
