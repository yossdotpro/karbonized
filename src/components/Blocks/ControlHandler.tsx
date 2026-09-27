import React from 'react';
import { BlockView } from '@/lib/blocks/registry';

interface Props {
	id: string;
	type: string;
	isVisible: boolean;
}

/** Renders the component of a block; the types live in the block registry. */
export const ControlHandler: React.FC<Props> = ({ type, id, isVisible }) => (
	<BlockView id={id} type={type} isVisible={isVisible}></BlockView>
);
