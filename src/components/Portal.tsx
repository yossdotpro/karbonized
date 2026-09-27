import React, { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useElementById } from '@/hooks/useElementById';

export const CustomPortal: React.FC<{ id: string; children: ReactNode }> = ({
	id,
	children,
}) => {
	const element = useElementById(id);

	return <>{element != null && createPortal(children, element)}</>;
};
