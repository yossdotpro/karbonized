import {
	IconHeartFilled,
	IconHexagon,
	IconHexagonFilled,
} from '@tabler/icons-react';
import React, { useId, useRef, useState } from 'react';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import {
	Arrow2Svg,
	Arrow3Svg,
	Arrow4Svg,
	Arrow5Svg,
	Arrow6Svg,
	ArrowSvg,
	LineSvg,
	OvalSvg,
	PoligonSvg,
	RectangleSvg,
	StarSvg,
	Trianglevg,
} from '../Misc/Icons';
import { ColorPicker } from '../CustomControls/ColorPicker';

import { ShapeHandler } from './ShapeHandler';
import { Button } from '../ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '../ui/dialog';
import { useTheme } from '../../hooks/useTheme';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import { Hexagon } from 'lucide-react';

interface Props {
	id: string;
}

export const ShapeBlock: React.FC<Props> = ({ id }) => {
	/* Component States */
	const modal = useRef<HTMLDialogElement>(null);

	const [color, setColor] = useControlState('#f3f4f6', `${id}-color`);
	const [shape, setShape] = useControlState('oval', `${id}-shape`);
	const [showModal, setShowModal] = useState(false);
	const [appTheme] = useTheme();

	return (
		<>
			<ControlTemplate
				id={id}
				borderEditable={false}
				maskEditable={false}
				defaultHeight='120px'
				defaultWidth='120px'
				minHeight={'50px'}
				minWidth={'50px'}
				maxWidth={'2000px'}
				maxHeight={'2000px'}
				menu={
					<>
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<Hexagon size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Shapes</Label>
								</div>
							}
						>
							{/* Select Shape */}
							<div className='ml-2 flex flex-row gap-2'>
								<Label className='my-auto text-xs text-muted-foreground'>
									Shape
								</Label>
								<div
									onClick={() => {
										setShowModal(true);
									}}
									className='hover:bg-accent ml-2 h-16 w-20 cursor-pointer rounded-surface bg-muted/50 p-4'
								>
									<ShapeHandler
										color={appTheme === 'light' ? '#000000' : '#eeeeee'}
										type={shape}
									></ShapeHandler>
								</div>
							</div>

							<ColorPicker
								type='HexAlpha'
								label='Color'
								isGradientEnable={false}
								color={color}
								onColorChange={(color) => {
									setColor(color);
								}}
							></ColorPicker>
						</CustomCollapse>
					</>
				}
			>
				<ShapeHandler color={color} type={shape}></ShapeHandler>
			</ControlTemplate>

			<Dialog open={showModal} onOpenChange={setShowModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Shapes
						</DialogTitle>
					</DialogHeader>

					<div className='flex flex-auto select-none flex-col overflow-hidden'>
						{/* Shapes List */}
						<div className='mt-2 flex max-h-64 flex-auto flex-col gap-4 overflow-y-auto'>
							<label className='text-muted-foreground'>Arrows</label>

							<div className='flex flex-auto flex-wrap gap-2'>
								<div
									onClick={() => {
										setShape('arrow');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<ArrowSvg className='flex h-full w-full flex-auto dark:fill-white'></ArrowSvg>
								</div>

								<div
									onClick={() => {
										setShape('arrow2');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<Arrow2Svg className='mx-auto flex h-full w-full flex-auto fill-black dark:fill-white'></Arrow2Svg>
								</div>

								<div
									onClick={() => {
										setShape('arrow3');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<Arrow3Svg className='mx-auto flex h-full w-full flex-auto dark:fill-white'></Arrow3Svg>
								</div>

								<div
									onClick={() => {
										setShape('arrow4');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<Arrow4Svg className='mx-auto flex h-full w-full flex-auto dark:fill-white'></Arrow4Svg>
								</div>

								<div
									onClick={() => {
										setShape('arrow5');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<Arrow5Svg className='mx-auto flex h-full w-full flex-auto dark:fill-white'></Arrow5Svg>
								</div>

								<div
									onClick={() => {
										setShape('arrow6');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<Arrow6Svg className='mx-auto flex h-full w-full flex-auto dark:fill-white'></Arrow6Svg>
								</div>
							</div>

							<label className='text-muted-foreground'>Forms</label>

							<div className='flex flex-auto flex-wrap gap-2'>
								<div
									onClick={() => {
										setShape('oval');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<OvalSvg className='flex h-full w-full flex-auto dark:fill-white'></OvalSvg>
								</div>

								<div
									onClick={() => {
										setShape('star');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<StarSvg className='flex h-full w-full flex-auto dark:fill-white'></StarSvg>
								</div>

								<div
									onClick={() => {
										setShape('poligon');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<PoligonSvg className='flex h-full w-full flex-auto dark:fill-white'></PoligonSvg>
								</div>

								<div
									onClick={() => {
										setShape('hexagon');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<IconHexagonFilled className='mx-auto flex h-full w-full flex-auto dark:fill-white'></IconHexagonFilled>
								</div>

								<div
									onClick={() => {
										setShape('triangle');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<Trianglevg className='mx-auto flex h-full w-full flex-auto dark:fill-white'></Trianglevg>
								</div>

								<div
									onClick={() => {
										setShape('rectangle');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<RectangleSvg className='mx-auto flex h-full w-full flex-auto dark:fill-white'></RectangleSvg>
								</div>

								<div
									onClick={() => {
										setShape('heart');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<IconHeartFilled className='mx-auto flex h-full w-full flex-auto'></IconHeartFilled>
								</div>

								<div
									onClick={() => {
										setShape('line');
									}}
									className='flex h-12 w-9 flex-auto cursor-pointer rounded-control bg-muted/50 p-2 hover:bg-accent'
								>
									<LineSvg className='flex h-full w-full flex-auto stroke-black dark:stroke-white'></LineSvg>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant='outline'
							className='dark:text-white'
							onClick={() => {
								setShowModal(false);
							}}
						>
							Cancel
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
export default ShapeBlock;
