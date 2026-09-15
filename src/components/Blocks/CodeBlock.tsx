import {
	IconAppWindow,
	IconBorderStyle,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconCode,
	IconDots,
	IconHome,
	IconMenu2,
	IconMinus,
	IconPlus,
	IconSearch,
	IconSquare,
	IconTerminal,
	IconX,
} from '@tabler/icons-react';
import React, { useEffect } from 'react';
import { ControlTemplate } from './ControlTemplate';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { CustomCollapse } from '../CustomControls/CustomCollapse';
import { ColorPicker } from '../CustomControls/ColorPicker';
import { CloseSvg, MinimizeSvg } from '../Misc/Icons';
import { LanguajeTabIcon } from './LanguajeTabIcon';
import { useControlState } from '../../hooks/useControlState';
import { themes } from '../../utils/PrismThemes';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Slider } from '../ui/slider';
import { Checkbox } from '../ui/checkbox';

interface Props {
	id: string;
}

const CodeControl: React.FC<Props> = ({ id }) => {
	/* Component States */

	const [theme, setTheme] = useControlState('coldarkDark', `${id}-theme`);
	const [language, setLanguage] = useControlState('jsx', `${id}-lang`);
	const [code, setCode] = useControlState(
		`<pre><code class="language-${language}"></code></pre>`,
		`${id}-code`,
	);
	const [color, setColor] = useControlState('#111b28', `${id}-bgcolor`);
	const [controlsColor, setControlsColor] = useControlState(
		'#b4b4b4',
		`${id}-ccolor`,
	);
	const [showTabs, setShowTabs] = useControlState(true, `${id}-tabs`);
	const [title, setTitle] = useControlState('Code.jsx', `${id}-wintitle`);
	const [showLineNumbers, setShowLineNumbers] = useControlState(
		false,
		`${id}-linenumbers`,
	);
	const [wrapLines, setWrapLines] = useControlState(false, `${id}-wraplines`);
	const [border, setBorder] = useControlState(8, `${id}-border`);
	const [windowStyle, setWindowStyle] = useControlState(
		'mac',
		`${id}-winstyle`,
	);

	const [colorMode, setColorMode] = useControlState(
		'Single',
		`${id}-colormode`,
	);
	const [gColor1, setGColor1] = useControlState('#0da2e7', `${id}-gradientc1`);
	const [gColor2, setGColor2] = useControlState('#5895c8', `${id}-gradientc2`);
	const [gradientDeg, setGradientDeg] = useControlState(
		22,
		`${id}-gradientdeg`,
	);

	/* Handle Change Theme */
	const handleChangeTheme = (theme: string) => {
		return themes.find((value) => value.label === theme)?.theme;
	};

	/* Handle Change Theme Colors */
	useEffect(() => {
		const newTheme = themes.find((value) => value.label === theme)?.theme;

		setColor(
			(newTheme as any)[':not(pre) > code[class*="language-"]'].background ||
				(newTheme as any)[`code[class*="language-"]`].background,
		);
	}, [theme]);

	/* Handle Window Style Change - Set color for paper style */
	useEffect(() => {
		if (windowStyle === 'paper') {
			setColor('#fbfaf7');
		}
	}, [windowStyle]);

	return (
		<>
			<ControlTemplate
				id={id}
				border={6}
				borderEditable={false}
				defaultHeight='140px'
				defaultWidth='460px'
				minWidth='415px'
				minHeight='140px'
				maxWidth='2050px'
				maxHeight='2050px'
				menu={
					<>
						{/* Border  */}
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconBorderStyle
										size={18}
										className='text-muted-foreground'
									/>
									<Label className='text-sm font-semibold'>Borders</Label>
								</div>
							}
						>
							<div className='flex flex-row flex-wrap text-xs'>
								<div className='flex flex-auto p-2'>
									<Label className='my-auto p-2 text-xs text-muted-foreground'>
										Radius:
									</Label>
									<Slider
										className='my-auto flex-1'
										onValueChange={(ev) => {
											setBorder(ev[0]);
										}}
										value={[border]}
										max={22}
									></Slider>
								</div>
							</div>
						</CustomCollapse>

						{/* Code Settings */}
						<CustomCollapse
							isOpen
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconCode size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Code</Label>
								</div>
							}
						>
							<Label className='text-xs text-muted-foreground'>Language</Label>
							<Select value={language} onValueChange={setLanguage}>
								<SelectTrigger className='h-8 text-sm'>
									<SelectValue placeholder='Select language' />
								</SelectTrigger>
								<SelectContent>
									{SyntaxHighlighter.supportedLanguages.map((i) => {
										return (
											<SelectItem key={i} value={i}>
												{i}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>

							<Label className='text-xs text-muted-foreground'>Theme</Label>
							<Select value={theme.toString()} onValueChange={setTheme}>
								<SelectTrigger className='h-8 text-sm'>
									<SelectValue placeholder='Select theme' />
								</SelectTrigger>
								<SelectContent>
									{themes.map((i) => {
										return (
											<SelectItem key={i.label} value={i.label}>
												{i.label}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>

							<Label className='text-xs text-muted-foreground'>Title</Label>
							<Input
								className='h-8 text-sm'
								value={title}
								onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
									setTitle(ev.currentTarget.value);
								}}
							></Input>

							<Label className='text-xs text-muted-foreground'>Code</Label>
							<textarea
								spellCheck={false}
								className='flex h-32 flex-auto resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
								value={code}
								onChange={(ev: React.ChangeEvent<HTMLTextAreaElement>) => {
									setCode(ev.target.value);
								}}
							></textarea>
						</CustomCollapse>

						{/* Window Settings */}
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconAppWindow size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Window</Label>
								</div>
							}
						>
							<Label className='text-xs text-muted-foreground'>
								Window Style
							</Label>
							<Select value={windowStyle} onValueChange={setWindowStyle}>
								<SelectTrigger className='h-8 text-sm'>
									<SelectValue placeholder='Select window style' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={'mac'}>macOS</SelectItem>
									<SelectItem value={'windows'}>Windows 11</SelectItem>
									<SelectItem value={'retro'}>Retro</SelectItem>
									<SelectItem value={'paper'}>Paper</SelectItem>
									<SelectItem value={'GTK'}>GTK</SelectItem>
									<SelectItem value={'gnome'}>GNOME</SelectItem>
									<SelectItem value={'pixel'}>Pixel</SelectItem>
									<SelectItem value={'konsole'}>Konsole</SelectItem>
								</SelectContent>
							</Select>

							{/* Show Tabs */}
							<div className='m-2 flex flex-row gap-2'>
								<Label className='my-auto text-xs text-muted-foreground'>
									Show Tabs
								</Label>
								<Checkbox
									onCheckedChange={(checked) => {
										setShowTabs(checked as boolean);
									}}
									checked={showTabs}
								></Checkbox>
							</div>

							{/* Background */}
							{windowStyle !== 'paper' && (
								<ColorPicker
									label='Window Color'
									type='HexAlpha'
									onModeChange={(mode) => {
										setColorMode(mode);
									}}
									onGradientChange={(color1, color2) => {
										setGColor1(color1);
										setGColor2(color2);
									}}
									onGradientDegChange={(deg) => {
										setGradientDeg(deg);
									}}
									color={color}
									mode={colorMode}
									gradientDeg={gradientDeg}
									colorGradient1={gColor1}
									colorGradient2={gColor2}
									onColorChange={setColor}
								></ColorPicker>
							)}

							{/* Controls */}
							<ColorPicker
								color={controlsColor}
								onColorChange={setControlsColor}
								isGradientEnable={false}
								label='Controls Color'
							></ColorPicker>
						</CustomCollapse>

						{/* Other Options */}
						<CustomCollapse
							menu={
								<div className='flex items-center gap-2 text-foreground'>
									<IconDots size={18} className='text-muted-foreground' />
									<Label className='text-sm font-semibold'>Other Options</Label>
								</div>
							}
						>
							{/* Show Line Numbers */}
							<div className='flex flex-col'>
								<div className='m-2 flex flex-row gap-2'>
									<Label className='my-auto text-xs text-muted-foreground'>
										Show Line Numbers
									</Label>
									<Checkbox
										onCheckedChange={(checked) => {
											setShowLineNumbers(checked as boolean);
										}}
										checked={showLineNumbers}
									></Checkbox>
								</div>
							</div>

							{/* Wrap Lines */}
							<div className='flex flex-col'>
								<div className='m-2 flex flex-row gap-2'>
									<Label className='my-auto text-xs text-muted-foreground'>
										Wrap Lines
									</Label>
									<Checkbox
										onCheckedChange={(checked) => {
											setWrapLines(checked as boolean);
										}}
										checked={wrapLines}
									></Checkbox>
								</div>
							</div>
						</CustomCollapse>
					</>
				}
			>
				<div
					style={{
						borderRadius: border + 'px',
						background:
							theme === 'paper'
								? '#fbfaf7'
								: colorMode === 'Single'
									? color
									: `linear-gradient(${gradientDeg}deg, ${gColor1},${gColor2})`,
					}}
					className={`flex flex-auto select-none flex-col overflow-hidden ${
						windowStyle === 'GTK'
							? 'shadow-lg'
							: windowStyle === 'gnome'
								? 'rounded-xl shadow-xl'
								: windowStyle === 'windows'
									? 'shadow-xl'
									: windowStyle === 'retro'
										? 'border-2 border-black'
										: ''
					}`}
				>
					{/* Title Bar */}
					{windowStyle === 'mac' && (
						<div className='flex max-h-12 flex-auto items-center px-4 py-2 bg-[#2d2e2e] border-b border-black/20 rounded-t-lg select-none'>
							{/* Left side: Window Traffic Lights */}
							<div className='flex items-center gap-2 w-15'>
								<div className='h-3 w-3 rounded-full bg-[#FF5F57] shadow-inner hover:bg-[#ff4b42] transition-colors cursor-pointer relative group'>
									<IconX
										size={8}
										className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black/50 opacity-0 group-hover:opacity-100'
									/>
								</div>
								<div className='h-3 w-3 rounded-full bg-[#FEBC2E] shadow-inner hover:bg-[#fdb000] transition-colors cursor-pointer relative group'>
									<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-px bg-black/50 opacity-0 group-hover:opacity-100'></div>
								</div>
								<div className='h-3 w-3 rounded-full bg-[#28C840] shadow-inner hover:bg-[#23b138] transition-colors cursor-pointer relative group'>
									<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 border border-black/50 opacity-0 group-hover:opacity-100'></div>
								</div>
							</div>

							<div className='flex-1 flex justify-center'>
								{!showTabs ? (
									<p
										style={{ color: controlsColor }}
										className='text-[13px] font-block font-medium text-gray-300 tracking-tight'
									>
										{title || 'zsh'}
									</p>
								) : (
									<div className='flex items-center gap-2 bg-[#3c3d3d] px-6 py-1 rounded-md border border-white/5 shadow-sm'>
										<LanguajeTabIcon languaje={language} />
										<span
											style={{ color: controlsColor }}
											className='text-[12px] font-block text-gray-200'
										>
											{title}
										</span>
										<IconX
											size={12}
											className='ml-2 opacity-40 hover:opacity-100 cursor-pointer text-gray-300'
										/>
									</div>
								)}
							</div>

							<div className='w-[60px] flex justify-end'>
								{showTabs && (
									<button className='p-1 hover:bg-white/5 rounded transition-colors'>
										<IconPlus size={14} className='text-gray-400' />
									</button>
								)}
							</div>
						</div>
					)}

					{windowStyle === 'windows' && (
						<div className='flex max-h-10 flex-auto items-center bg-[#1c1c1c]/90 backdrop-blur-xl border-b border-white/5 select-none'>
							<div className='flex-1 flex items-center h-full'>
								{showTabs ? (
									<div className='flex items-center h-full'>
										<div className='flex items-center gap-2 px-3 h-[34px] bg-[#2d2d2d] border border-white/10 border-b-0 rounded-t-md ml-2 self-end'>
											<LanguajeTabIcon languaje={language} />
											<span
												style={{ color: controlsColor }}
												className='text-xs font-block text-gray-200'
											>
												{title}
											</span>
											<IconX
												style={{ color: controlsColor }}
												className='opacity-60 hover:opacity-100 cursor-pointer rounded-sm hover:bg-white/10 transition-all'
												size={12}
											/>
										</div>
										<button className='p-1.5 ml-1 hover:bg-white/5 rounded-md text-gray-400 transition-colors'>
											<IconPlus size={14} />
										</button>
										<button className='p-1.5 hover:bg-white/5 rounded-md text-gray-400 transition-colors'>
											<IconChevronDown size={14} />
										</button>
									</div>
								) : (
									<p
										style={{ color: controlsColor }}
										className='flex-1 text-xs font-block text-gray-400 pl-4'
									>
										{title}
									</p>
								)}
							</div>

							<div className='flex items-center h-full'>
								<button className='w-11 h-10 flex items-center justify-center hover:bg-white/10 text-gray-400 transition-colors'>
									<IconMinus size={16} />
								</button>
								<button className='w-11 h-10 flex items-center justify-center hover:bg-white/10 text-gray-400 transition-colors'>
									<IconSquare size={14} />
								</button>
								<button className='w-11 h-10 flex items-center justify-center hover:bg-[#e81123] hover:text-white text-gray-400 transition-colors'>
									<IconX size={16} />
								</button>
							</div>
						</div>
					)}

					{windowStyle === 'retro' && (
						<div className='flex max-h-12 flex-auto items-center border-b-4 border-black p-2 gap-2'>
							{!showTabs && (
								<p
									style={{ color: controlsColor }}
									className='flex-1 font-bold text-sm uppercase tracking-wider'
								>
									{title}
								</p>
							)}
							{showTabs && (
								<div className='flex-1 flex items-center gap-2 border-2 border-black px-2 py-1 bg-white text-black'>
									<LanguajeTabIcon languaje={language} />
									<span className='font-bold text-sm uppercase'>{title}</span>
									<IconX className='ml-auto cursor-pointer' size={14} />
								</div>
							)}
							<div className='flex gap-1'>
								<div className='w-6 h-6 bg-black text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-gray-700'>
									_
								</div>
								<div className='w-6 h-6 bg-black text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-gray-700'>
									□
								</div>
								<div className='w-6 h-6 bg-black text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-red-700'>
									×
								</div>
							</div>
						</div>
					)}

					{windowStyle === 'paper' && (
						<>
							{/* Header */}
							<div className='flex max-h-12 flex-auto items-center p-4 pb-3 bg-linear-to-b from-amber-100/50 to-transparent border-b border-amber-200/50'>
								{!showTabs && (
									<p
										style={{ color: controlsColor }}
										className='flex-1 text-center text-sm font-serif italic text-amber-900'
									>
										{title}
									</p>
								)}
								{showTabs && (
									<div className='flex-1 flex items-center justify-center gap-2 px-4 py-2 border-b-2 border-dashed border-amber-400/60 opacity-80'>
										<LanguajeTabIcon languaje={language} />
										<span
											style={{ color: controlsColor }}
											className='text-sm font-serif text-amber-900'
										>
											{title}
										</span>
										<IconX
											style={{ color: controlsColor }}
											className='opacity-60 hover:opacity-100 cursor-pointer text-amber-700'
											size={14}
										/>
									</div>
								)}
								<div className='flex gap-2 opacity-70'>
									<div className='w-3 h-3 rounded-full border-2 border-amber-600 bg-amber-100'></div>
									<div className='w-3 h-3 rounded-full border-2 border-amber-600 bg-amber-100'></div>
								</div>
							</div>

							{/* Footer will be added after code */}
						</>
					)}

					{windowStyle === 'GTK' && (
						<div className='flex max-h-12 flex-auto items-center px-2 py-1 bg-gradient-to-b from-[#3c3c3c] to-[#323232] border-b border-black shadow-inner rounded-t-lg select-none'>
							<div className='flex-1'></div>

							<div className='flex items-center justify-center'>
								{!showTabs && (
									<p
										style={{ color: controlsColor }}
										className='text-xs font-bold text-[#eeeeee] font-block drop-shadow-sm'
									>
										{title || 'Terminal'}
									</p>
								)}
								{showTabs && (
									<div className='flex items-center gap-2 px-4 py-1.5 bg-[#2d2d2d] border border-black border-b-0 rounded-t-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
										<LanguajeTabIcon languaje={language} />
										<span
											style={{ color: controlsColor }}
											className='text-xs font-semibold text-[#eeeeee] font-block'
										>
											{title}
										</span>
										<IconX
											style={{ color: controlsColor }}
											className='opacity-70 hover:opacity-100 cursor-pointer rounded hover:bg-white/10 transition-all ml-1'
											size={12}
										/>
									</div>
								)}
							</div>

							<div className='flex-1 flex justify-end gap-1'>
								<button className='w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors group'>
									<div className='w-3 h-[2px] bg-white/70 group-hover:bg-white rounded-full'></div>
								</button>
								<button className='w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors group'>
									<div className='w-3 h-3 border-2 border-white/70 group-hover:border-white rounded-sm'></div>
								</button>
								<button className='w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-b from-white/10 to-transparent border border-white/5 hover:bg-[#e01b24] group transition-all'>
									<IconX
										size={14}
										className='text-white/70 group-hover:text-white'
										stroke={3}
									/>
								</button>
							</div>
						</div>
					)}

					{windowStyle === 'pixel' && (
						<div className='flex items-center justify-between h-10 px-3 bg-[#a2fbff] border-[3px] border-black select-none font-mono'>
							<div className='flex gap-1.5'>
								<div className='w-4 h-4 bg-[#ff5f57] border-[2px] border-black rounded-sm' />
								<div className='w-4 h-4 bg-[#febc2e] border-[2px] border-black rounded-sm' />
								<div className='w-4 h-4 bg-[#28c840] border-[2px] border-black rounded-sm' />
							</div>

							<p
								style={{ color: controlsColor }}
								className='text-xs font-bold text-black uppercase tracking-widest'
							>
								{title || 'GENERATED LOCALES'}
							</p>
						</div>
					)}

					{windowStyle === 'gnome' && (
						<div className='flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border-b border-[#303030] rounded-t-xl select-none'>
							<div className='flex-1 flex items-center'>
								<div className='flex items-center gap-1 bg-[#2d2d2d] rounded-lg p-0.5 border border-[#3a3a3a]'>
									<button className='p-1.5 hover:bg-[#383838] rounded-md transition-all text-gray-400 hover:text-white'>
										<IconPlus size={14} stroke={2.5} />
									</button>
									<button className='p-1.5 hover:bg-[#383838] rounded-md transition-all text-gray-400 hover:text-white'>
										<IconChevronDown size={14} stroke={2.5} />
									</button>
								</div>
							</div>

							<div className='flex flex-col items-center flex-1'>
								<p
									style={{ color: controlsColor }}
									className='text-xs font-bold text-gray-200 font-block tracking-wide mb-1'
								>
									{title || 'Terminal'}
								</p>
							</div>

							{/* Lado Derecho: Controles de Ventana */}
							<div className='flex-1 flex items-center justify-end gap-1.5'>
								<button className='w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#383838] text-gray-400 hover:text-white transition-colors'>
									<IconMinus size={12} stroke={3} />
								</button>
								<button className='w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#383838] text-gray-400 hover:text-white transition-colors'>
									<IconSquare size={10} stroke={3} />
								</button>
								{/* El botón de cerrar en GNOME suele ser gris, solo se vuelve rojo al pasar el mouse */}
								<button className='w-6 h-6 flex items-center justify-center rounded-full bg-[#2d2d2d] hover:bg-[#e01b24] text-gray-400 hover:text-white transition-all'>
									<IconX size={12} stroke={3} />
								</button>
							</div>
						</div>
					)}

					{windowStyle === 'konsole' && (
						<div className='flex flex-col w-full select-none'>
							<div className='flex items-center justify-between h-9 px-3 bg-[#232629]/95 backdrop-blur-md border-b border-white/5'>
								<div className='flex items-center gap-2'>
									<IconTerminal size={14} className='text-[#3daee9]' />
									<span
										style={{ color: controlsColor }}
										className='text-[13px] font-block font-medium text-[#eff0f1]'
									>
										{title || 'Konsole'}
									</span>
								</div>

								<div className='flex items-center h-full'>
									<button className='w-10 h-full flex items-center justify-center hover:bg-white/10 text-[#eff0f1] transition-colors'>
										<IconMinus size={16} stroke={1.5} />
									</button>
									<button className='w-10 h-full flex items-center justify-center hover:bg-white/10 text-[#eff0f1] transition-colors'>
										<IconSquare size={14} stroke={1.5} />
									</button>
									<button className='w-10 h-full flex items-center justify-center hover:bg-[#da4453] text-[#eff0f1] transition-colors'>
										<IconX size={16} stroke={1.5} />
									</button>
								</div>
							</div>

							{showTabs && (
								<div className='flex items-center bg-[#31363b] h-8 px-1 gap-0.5 border-b border-black/20'>
									<div className='flex items-center gap-2 px-3 h-7 bg-[#232629] border-t-2 border-t-[#3daee9] rounded-t-sm shadow-sm'>
										<LanguajeTabIcon languaje={language} />
										<span className='text-xs font-block text-[#eff0f1]'>
											{title}
										</span>
										<button className='ml-1 p-0.5 hover:bg-white/10 rounded-full text-gray-400'>
											<IconX size={10} />
										</button>
									</div>
									<button className='p-1.5 hover:bg-white/5 rounded text-gray-400 transition-colors'>
										<IconPlus size={14} />
									</button>
									<div className='flex-1' /> {/* Spacer */}
									<button className='p-1.5 hover:bg-white/5 rounded text-gray-400 transition-colors'>
										<IconMenu2 size={14} />
									</button>
								</div>
							)}
						</div>
					)}

					{/* Code */}
					<div className='flex flex-auto '>
						{/* @ts-ignore */}
						<SyntaxHighlighter
							customStyle={{
								cursor: 'default',
								display: 'flex',
								flex: '1 1 auto',
								textDecorationThickness: '0px',
								textEmphasisColor: 'darkolivegreen',
								textShadow: 'none',
								boxShadow: 'none',
								color: '#f25555',
								whiteSpace: 'pre-wrap',
								borderRadius: '0.25rem',
								overflow: 'hidden',
								background:
									colorMode === 'Single'
										? color
										: `linear-gradient(${gradientDeg}deg, ${gColor1},${gColor2})`,
							}}
							wrapLongLines
							showLineNumbers={showLineNumbers}
							wrapLines={wrapLines}
							language={language}
							style={handleChangeTheme(theme)}
						>
							{code}
						</SyntaxHighlighter>
					</div>

					{windowStyle === 'paper' && (
						<div className='h-3 bg-linear-to-b from-amber-100 to-amber-200 relative border-t border-amber-200'>
							<div className='absolute bottom-0 left-0 right-0 h-1 bg-amber-300/50'></div>
						</div>
					)}
				</div>
			</ControlTemplate>
		</>
	);
};

export default CodeControl;
