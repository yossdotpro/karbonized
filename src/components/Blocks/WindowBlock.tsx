import React, { useRef } from 'react';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import {
	PropertyRow,
	ToggleButton,
	ToggleGroup,
} from '../CustomControls/PropertyControls';
import { ControlTemplate } from './ControlTemplate';
import karbonized from '../../assets/logo.svg';
import { BrowserFrame } from './BrowserFrame';
import { Switch } from '../ui/switch';
import { IconAppWindow } from '@tabler/icons-react';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { useControlState } from '../../hooks/useControlState';
import { useResolvedText } from '../../hooks/useProjectVariables';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useWorkspaceStore, useControlsStore } from '../../stores';
import { buildDynamicBackgroundColors } from '../../utils/dynamicBackgroundColors';

/** Toolbar and ink colors of the window themes. */
const WINDOW_THEMES = [
	{ label: 'Light', chrome: '#ffffff', ink: '#1f1f1f' },
	{ label: 'Dark', chrome: '#2b2c30', ink: '#e8eaed' },
	{ label: 'Midnight', chrome: '#0f1115', ink: '#c9ced6' },
] as const;

interface Props {
	id: string;
}

export const WindowBlock: React.FC<Props> = ({ id }) => {
	/* Component States */
	const contentImageRef = useRef<HTMLImageElement>(null);
	const [title, setTitle] = useControlState('Karbonized', `${id}-title`);
	const [url, setUrl] = useControlState('karbonized.yoss.pro', `${id}-url`);
	const shownTitle = useResolvedText(title);
	const shownUrl = useResolvedText(url);
	const [color, setColor] = useControlState('#ffffff', `${id}-color`);
	const [controlsColor, setControlsColor] = useControlState(
		'#0e111b',
		`${id}-controlsColor`,
	);

	const [windowStyle, setWindowStyle] = useControlState(
		'mac',
		`${id}-windowStyle`,
	);
	const [windowType, setWindowType] = useControlState(
		'browser',
		`${id}-windowType`,
	);

	const [src, setSrc] = useControlState(karbonized, `${id}-src`);
	const [windowShadow, setWindowShadow] = useControlState(
		true,
		`${id}-windowShadow`,
	);
	const setWorkspaceDynamic = useWorkspaceStore(
		(state) => state.setWorkspaceDynamic,
	);
	const setWorkspaceType = useWorkspaceStore((state) => state.setWorkspaceType);
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

	const handleCreateDynamicBackground = async (): Promise<void> => {
		if (contentImageRef.current == null || currentWorkspace == null) {
			return;
		}

		try {
			const colors = await buildDynamicBackgroundColors(
				contentImageRef.current,
			);
			const seed = Math.floor(Math.random() * 10000);

			setWorkspaceDynamic({
				colors,
				seed,
			});
			setWorkspaceType('dynamic');
		} catch (error) {
			console.error(
				'Failed to create dynamic background from window image',
				error,
			);
		}
	};

	return (
		<>
			<ControlTemplate
				id={id}
				minWidth='400px'
				minHeight='200px'
				maxWidth='3000px'
				maxHeight='2000px'
				border={6}
				defaultHeight={'200px'}
				defaultWidth={'400px'}
				color={color}
				onCreateDynamicBackground={handleCreateDynamicBackground}
				menu={
					<>
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2'>
									<IconAppWindow />
									<Label>Window</Label>
								</div>
							}
						>
							<PropertyRow label='Style'>
								<ToggleGroup>
									<ToggleButton
										label='macOS'
										active={windowStyle === 'mac'}
										onClick={() => setWindowStyle('mac')}
										className='text-[11px]'
									>
										macOS
									</ToggleButton>
									<ToggleButton
										label='Windows'
										active={windowStyle === 'window'}
										onClick={() => setWindowStyle('window')}
										className='text-[11px]'
									>
										Windows
									</ToggleButton>
								</ToggleGroup>
							</PropertyRow>

							<PropertyRow label='Type'>
								<ToggleGroup>
									<ToggleButton
										label='App window'
										active={windowType === 'normal'}
										onClick={() => setWindowType('normal')}
										className='text-[11px]'
									>
										App
									</ToggleButton>
									<ToggleButton
										label='Browser window'
										active={windowType === 'browser'}
										onClick={() => setWindowType('browser')}
										className='text-[11px]'
									>
										Browser
									</ToggleButton>
								</ToggleGroup>
							</PropertyRow>

							<PropertyRow label='Title'>
								<Input
									spellCheck={false}
									onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
										setTitle(ev.target.value);
									}}
									value={title}
									className='h-7 text-xs md:text-xs'
								></Input>
							</PropertyRow>

							{windowType === 'browser' && (
								<PropertyRow label='URL'>
									<Input
										spellCheck={false}
										onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
											setUrl(ev.target.value);
										}}
										value={url}
										className='h-7 text-xs md:text-xs'
									></Input>
								</PropertyRow>
							)}

							<PropertyRow label='Content'>
								<Input
									type='file'
									accept='image/*'
									aria-label='Window content image'
									className='h-7'
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
										if (e.target.files && e.target.files.length > 0) {
											const reader = new FileReader();
											reader.addEventListener('load', () => {
												setSrc(reader.result?.toString() || '');
											});
											reader.readAsDataURL(e.target.files[0]);
										}
									}}
								></Input>
							</PropertyRow>

							<PropertyRow label='Theme'>
								<ToggleGroup>
									{WINDOW_THEMES.map((theme) => (
										<ToggleButton
											key={theme.label}
											label={`${theme.label} theme`}
											active={
												color.toLowerCase() === theme.chrome &&
												controlsColor.toLowerCase() === theme.ink
											}
											onClick={() => {
												setColor(theme.chrome);
												setControlsColor(theme.ink);
											}}
											className='text-[11px]'
										>
											{theme.label}
										</ToggleButton>
									))}
								</ToggleGroup>
							</PropertyRow>

							<ColorPicker
								color={color}
								onColorChange={setColor}
								isGradientEnable={false}
								label='Window'
							></ColorPicker>

							<ColorPicker
								color={controlsColor}
								onColorChange={setControlsColor}
								isGradientEnable={false}
								label='Controls'
							></ColorPicker>

							<PropertyRow label='Shadow'>
								<Switch
									checked={windowShadow}
									onCheckedChange={(checked) => setWindowShadow(checked)}
								/>
							</PropertyRow>
						</CustomCollapse>
					</>
				}
			>
				<BrowserFrame
					style={windowStyle === 'window' ? 'window' : 'mac'}
					type={windowType === 'normal' ? 'normal' : 'browser'}
					title={shownTitle}
					url={shownUrl}
					chrome={color}
					ink={controlsColor}
					shadow={windowShadow}
				>
					<img
						ref={contentImageRef}
						alt=''
						draggable={false}
						className='absolute inset-0 h-full w-full select-none object-cover object-top'
						src={src}
						crossOrigin='anonymous'
					></img>
				</BrowserFrame>
			</ControlTemplate>
		</>
	);
};
export default WindowBlock;
