import React from 'react';
import {
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	Globe,
	LockKeyhole,
	Minus,
	MoreVertical,
	Plus,
	RotateCw,
	Square,
	Star,
	X,
} from 'lucide-react';

/**
 * The chrome of the window block: a browser in the style of Chrome (tab
 * strip, toolbar and omnibox) or a plain app window, with macOS traffic
 * lights or Windows caption buttons.
 *
 * Every size is expressed in `--u`, one "pixel" of a 1280 px wide window
 * measured with container query units, so the chrome keeps its proportions
 * at any block size (and exports at the size it shows).
 */

export type WindowStyle = 'mac' | 'window';
export type WindowType = 'normal' | 'browser';

interface Props {
	style: WindowStyle;
	type: WindowType;
	title: string;
	url: string;
	/** Toolbar / title bar color. */
	chrome: string;
	/** Text and icon color. */
	ink: string;
	shadow: boolean;
	children: React.ReactNode;
}

const u = (value: number) => `calc(var(--u) * ${value})`;

/** `https://www.example.com/path` → host and the rest, as Chrome shows it. */
export const splitUrl = (value: string): { host: string; path: string } => {
	const clean = value.trim().replace(/^[a-z]+:\/\//i, '');
	const slash = clean.indexOf('/');
	return slash === -1
		? { host: clean, path: '' }
		: { host: clean.slice(0, slash), path: clean.slice(slash) };
};

const TrafficLights: React.FC = () => (
	<div className='flex shrink-0 items-center' style={{ gap: u(8) }}>
		{['#ff5f57', '#febc2e', '#28c840'].map((color) => (
			<span
				key={color}
				className='block rounded-full'
				style={{
					width: u(12),
					height: u(12),
					background: color,
					boxShadow: 'inset 0 0 0 0.5px rgb(0 0 0 / 18%)',
				}}
			/>
		))}
	</div>
);

const CaptionButtons: React.FC = () => (
	<div className='flex shrink-0 self-stretch'>
		{[Minus, Square, X].map((Icon, index) => (
			<span
				key={index}
				className='flex items-center justify-center'
				style={{ width: u(46) }}
			>
				<Icon
					strokeWidth={1.4}
					style={{
						width: u(index === 1 ? 10 : 14),
						height: u(index === 1 ? 10 : 14),
					}}
				/>
			</span>
		))}
	</div>
);

export const BrowserFrame: React.FC<Props> = ({
	style,
	type,
	title,
	url,
	chrome,
	ink,
	shadow,
	children,
}) => {
	const isMac = style === 'mac';
	const { host, path } = splitUrl(url);
	const icon = (size: number): React.CSSProperties => ({
		width: u(size),
		height: u(size),
		flexShrink: 0,
	});

	// Darker strip behind the tabs, like the frame of a real browser.
	const strip = `color-mix(in srgb, ${chrome}, #000 11%)`;
	const hairline = `color-mix(in srgb, ${ink} 12%, transparent)`;
	const field = `color-mix(in srgb, ${chrome}, ${ink} 7%)`;
	const muted = `color-mix(in srgb, ${ink} 62%, transparent)`;

	return (
		<div
			className='relative flex h-full w-full flex-auto flex-col overflow-hidden'
			style={
				{
					containerType: 'inline-size',
					borderRadius: isMac ? 10 : 8,
					background: chrome,
					color: ink,
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
					boxShadow: shadow
						? `0 0 0 1px ${hairline}, 0 2px 6px rgb(0 0 0 / 10%), 0 24px 60px -12px rgb(0 0 0 / 38%)`
						: `0 0 0 1px ${hairline}`,
				} as React.CSSProperties
			}
		>
			<div
				className='flex min-h-0 flex-auto flex-col'
				style={
					{ '--u': 'clamp(0.5px, 0.078125cqw, 2.4px)' } as React.CSSProperties
				}
			>
				{type === 'browser' ? (
					<>
						{/* Tab strip */}
						<div
							className='flex shrink-0 items-end'
							style={{
								height: u(40),
								background: strip,
								paddingLeft: u(isMac ? 14 : 8),
							}}
						>
							{isMac && (
								<div
									className='flex items-center self-stretch'
									style={{ marginRight: u(18) }}
								>
									<TrafficLights />
								</div>
							)}

							{/* Active tab, joined to the toolbar */}
							<div
								className='relative flex min-w-0 items-center'
								style={{
									height: u(32),
									width: u(236),
									maxWidth: '45%',
									padding: `0 ${u(10)}`,
									gap: u(8),
									background: chrome,
									borderRadius: `${u(10)} ${u(10)} 0 0`,
								}}
							>
								<span
									className='flex items-center justify-center rounded-[3px]'
									style={{
										...icon(16),
										background: `color-mix(in srgb, ${ink} 14%, transparent)`,
									}}
								>
									<Globe strokeWidth={2} style={icon(11)} />
								</span>
								<span
									className='min-w-0 flex-1 truncate'
									style={{ fontSize: u(12.5), lineHeight: 1.2 }}
								>
									{title}
								</span>
								<X strokeWidth={2} style={{ ...icon(14), color: muted }} />
							</div>

							<span
								className='flex items-center justify-center self-center'
								style={{ ...icon(28), marginLeft: u(6), color: muted }}
							>
								<Plus strokeWidth={2} style={icon(16)} />
							</span>

							<span className='flex-1' />
							{isMac ? (
								<span
									className='flex items-center self-center'
									style={{ marginRight: u(12), color: muted }}
								>
									<ChevronDown strokeWidth={2} style={icon(16)} />
								</span>
							) : (
								<div className='flex self-stretch' style={{ color: ink }}>
									<CaptionButtons />
								</div>
							)}
						</div>

						{/* Toolbar */}
						<div
							className='flex shrink-0 items-center'
							style={{
								height: u(42),
								padding: `0 ${u(10)}`,
								gap: u(6),
								borderBottom: `1px solid ${hairline}`,
							}}
						>
							{[ArrowLeft, ArrowRight, RotateCw].map((Icon, index) => (
								<span
									key={index}
									className='flex items-center justify-center'
									style={{
										...icon(28),
										color: index === 1 ? muted : ink,
									}}
								>
									<Icon strokeWidth={2} style={icon(16)} />
								</span>
							))}

							{/* Omnibox */}
							<div
								className='flex min-w-0 flex-1 items-center'
								style={{
									height: u(32),
									margin: `0 ${u(4)}`,
									padding: `0 ${u(12)}`,
									gap: u(10),
									borderRadius: u(16),
									background: field,
								}}
							>
								<LockKeyhole
									strokeWidth={2}
									style={{ ...icon(14), color: muted }}
								/>
								<span
									className='min-w-0 flex-1 truncate'
									style={{ fontSize: u(14), lineHeight: 1.2 }}
								>
									{host}
									<span style={{ color: muted }}>{path}</span>
								</span>
								<Star strokeWidth={2} style={{ ...icon(15), color: muted }} />
							</div>

							<span
								className='flex items-center justify-center rounded-full font-semibold text-white'
								style={{
									...icon(26),
									fontSize: u(12),
									background: 'linear-gradient(135deg, #6366f1, #ec4899)',
								}}
							>
								{(title.trim()[0] ?? 'K').toUpperCase()}
							</span>
							<MoreVertical strokeWidth={2} style={icon(16)} />
						</div>
					</>
				) : (
					/* App window: title bar only */
					<div
						className='relative flex shrink-0 items-center'
						style={{
							height: u(38),
							paddingLeft: u(isMac ? 14 : 12),
							borderBottom: `1px solid ${hairline}`,
						}}
					>
						{isMac && <TrafficLights />}
						<span
							className={
								isMac
									? 'pointer-events-none absolute inset-x-0 truncate text-center'
									: 'min-w-0 flex-1 truncate'
							}
							style={{
								fontSize: u(13),
								fontWeight: isMac ? 600 : 400,
								padding: isMac ? `0 ${u(90)}` : undefined,
							}}
						>
							{title}
						</span>
						{!isMac && (
							<div className='flex self-stretch'>
								<CaptionButtons />
							</div>
						)}
					</div>
				)}

				{/* Page */}
				<div className='relative min-h-0 flex-auto overflow-hidden'>
					{children}
				</div>
			</div>
		</div>
	);
};

export default BrowserFrame;
