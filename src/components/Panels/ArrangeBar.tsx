import React from 'react';
import {
	AlignCenterHorizontal,
	AlignCenterVertical,
	AlignEndHorizontal,
	AlignEndVertical,
	AlignHorizontalSpaceAround,
	AlignStartHorizontal,
	AlignStartVertical,
	AlignVerticalSpaceAround,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip } from '../CustomControls/Tooltip';
import { runCommand, useCommandShortcut } from '@/lib/commands/registry';
import { useControlsStore } from '@/stores';

const ArrangeButton: React.FC<{
	commandId: string;
	label: string;
	disabled?: boolean;
	children: React.ReactNode;
}> = ({ commandId, label, disabled, children }) => {
	const shortcut = useCommandShortcut(commandId);

	return (
		<Tooltip message={label} shortcut={shortcut} placement='bottom'>
			<Button
				variant='ghost'
				size='icon-sm'
				aria-label={label}
				disabled={disabled}
				onClick={() => runCommand(commandId)}
				className='[&_svg]:size-4'
			>
				{children}
			</Button>
		</Tooltip>
	);
};

/**
 * Align and distribute controls for the current selection. With one block,
 * alignment is relative to the canvas; with several, to the selection.
 */
export const ArrangeBar: React.FC = () => {
	const count = useControlsStore((state) => state.selectedControlIDs.length);

	if (count === 0) return null;

	return (
		<div className='mb-1 flex flex-col gap-1.5 border-b border-border px-1 pb-2'>
			<span className='text-[11px] text-muted-foreground'>
				{count > 1 ? `${count} layers selected` : 'Align to canvas'}
			</span>
			<div className='flex items-center justify-between'>
				<div className='flex items-center'>
					<ArrangeButton commandId='arrange.align-left' label='Align left'>
						<AlignStartVertical />
					</ArrangeButton>
					<ArrangeButton
						commandId='arrange.align-center'
						label='Align horizontal centers'
					>
						<AlignCenterVertical />
					</ArrangeButton>
					<ArrangeButton commandId='arrange.align-right' label='Align right'>
						<AlignEndVertical />
					</ArrangeButton>
				</div>

				<div className='flex items-center'>
					<ArrangeButton commandId='arrange.align-top' label='Align top'>
						<AlignStartHorizontal />
					</ArrangeButton>
					<ArrangeButton
						commandId='arrange.align-middle'
						label='Align vertical centers'
					>
						<AlignCenterHorizontal />
					</ArrangeButton>
					<ArrangeButton commandId='arrange.align-bottom' label='Align bottom'>
						<AlignEndHorizontal />
					</ArrangeButton>
				</div>

				<div className='flex items-center'>
					<ArrangeButton
						commandId='arrange.distribute-horizontal'
						label='Distribute horizontal spacing'
						disabled={count < 3}
					>
						<AlignHorizontalSpaceAround />
					</ArrangeButton>
					<ArrangeButton
						commandId='arrange.distribute-vertical'
						label='Distribute vertical spacing'
						disabled={count < 3}
					>
						<AlignVerticalSpaceAround />
					</ArrangeButton>
				</div>
			</div>
		</div>
	);
};
