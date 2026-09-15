import React from 'react';
import { useLocation } from 'react-router-dom';
import { MenuBar } from './MenuBar';
import { BlockEditorMenuBar } from './BlockEditorMenuBar';

export const ContextualMenuBar: React.FC = () => {
	const location = useLocation();

	if (location.pathname === '/block-editor') {
		return <BlockEditorMenuBar />;
	}

	return <MenuBar />;
};

export default ContextualMenuBar;
