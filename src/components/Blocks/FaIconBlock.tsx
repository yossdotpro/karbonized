import React, { Suspense, useEffect, useId, useState } from 'react';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ControlTemplate } from './ControlTemplate';
import { FaIcon } from '../FaIcon';
import { type IconType } from '../../utils/FaIconList';
import { Button } from '../ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '../ui/dialog';
import { IconSearch, IconSticker } from '@tabler/icons-react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { useControlState } from '../../hooks/useControlState';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface Props {
	id: string;
}

const FaIconBlock: React.FC<Props> = ({ id }) => {
	/* Component States */
	const [icon, setIcon] = useControlState('FaFontAwesome', `${id}-icon`);
	const [iconColor, setIconColor] = useControlState(
		'#ffffff',
		`${id}-iconColor`,
	);
	const [query, setQuery] = useState('');
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [faIcons, setFaIcons] = useState<IconType[]>();

	useEffect(() => {
		const getIconList = async () => {
			const icons = await import('../../utils/FaIconList');
			setFaIcons(icons.iconFaList);
		};

		getIconList();
	}, []);

	return (
		<>
			<ControlTemplate
				id={id}
				borderEditable={false}
				defaultHeight='120px'
				defaultWidth='120px'
				minHeight={'20px'}
				minWidth={'20px'}
				maxWidth={'800px'}
				maxHeight={'800px'}
				menu={
					<>
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconSticker size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Icon</Label>
								</div>
							}
						>
							{/* Select Icon */}
							<div className='flex flex-auto flex-row'>
								<Label className='my-auto text-xs text-muted-foreground'>
									Select Icon
								</Label>
								<div
									className='hover:bg-accent ml-2 flex w-20 cursor-pointer rounded-surface bg-muted/50 p-4'
									onMouseDown={() => {
										setShowIconPicker(true);
									}}
								>
									<FaIcon
										className='mx-auto my-auto text-4xl'
										icon={icon}
									></FaIcon>
								</div>
							</div>

							{/* Icon Color */}
							<ColorPicker
								type='HexAlpha'
								label='Icon Color'
								color={iconColor}
								isGradientEnable={false}
								onColorChange={(color) => {
									setIconColor(color);
								}}
							></ColorPicker>

							{/* Text */}
						</CustomCollapse>
					</>
				}
			>
				<FaIcon
					className='flex max-h-full w-full max-w-full flex-auto select-none'
					style={{ color: iconColor }}
					icon={icon}
				></FaIcon>
			</ControlTemplate>

			<Dialog open={showIconPicker} onOpenChange={setShowIconPicker}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Select Icon
						</DialogTitle>
					</DialogHeader>

					<div className='flex flex-auto select-none flex-col overflow-hidden'>
						{/* Search */}
						<div className='flex flex-auto flex-row'>
							<IconSearch className='my-auto mr-2 dark:text-white'></IconSearch>
							<Input
								onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
									setQuery(ev.currentTarget.value);
								}}
								value={query}
								className='flex flex-auto h-8 text-sm'
							></Input>
						</div>

						{/* Licence */}
						<p className='my-2 text-xs text-muted-foreground'>
							Icons From{' '}
							<span>
								<a
									className='text-muted-foreground'
									href='https://fontawesome.com/'
									target={'_blank'}
									rel='noreferrer'
								>
									Font Awesome
								</a>
							</span>
							<span> Licence:</span>
							<span>
								<a
									className='text-muted-foreground'
									href='https://creativecommons.org/licenses/by/4.0/'
									target={'_blank'}
									rel='noreferrer'
								>
									{' '}
									CC BY 4.0 License
								</a>
							</span>
						</p>

						{/* Icon List */}
						<div className='mt-2 flex max-h-64 flex-auto flex-row flex-wrap gap-3 overflow-y-auto'>
							{faIcons
								?.filter((icon) =>
									icon.label.toUpperCase().includes(query.toUpperCase()),
								)
								.map((el) => (
									<Suspense key={el.label} fallback={<></>}>
										<div
											className='inline-flex flex-auto cursor-pointer rounded-control bg-muted/50 p-2 text-3xl hover:bg-accent'
											onMouseDown={() => {
												setIcon(el.label);
												setShowIconPicker(false);
											}}
										>
											<div className='mx-auto my-auto'>
												<FaIcon icon={el.label}></FaIcon>
											</div>
										</div>
									</Suspense>
								))}
						</div>
					</div>

					<DialogFooter>
						<Button
							variant='outline'
							className='dark:text-white'
							onClick={() => {
								setShowIconPicker(false);
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

export default FaIconBlock;
