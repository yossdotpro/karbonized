import { useMemo } from 'react';

interface Props {
	colors: string[];
	blur: number;
	seed: number;
	width: number;
	height: number;
	className?: string;
}

interface GalaxyArm {
	id: string;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	controlX: number;
	controlY: number;
	width: number;
	color: string;
	opacity: number;
}

interface StarCluster {
	id: string;
	x: number;
	y: number;
	size: number;
	density: number;
	color: string;
	brightness: number;
}

interface GalaxyCore {
	id: string;
	x: number;
	y: number;
	size: number;
	color: string;
	brightness: number;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const createSeededRandom = (seed: number) => {
	let state = Math.floor(seed * 99991) || 1;

	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
};

const hexToRgb = (hex: string) => {
	const normalized = hex.replace('#', '');
	const value =
		normalized.length === 3
			? normalized
					.split('')
					.map((c) => c + c)
					.join('')
			: normalized;

	const num = parseInt(value, 16);

	return {
		r: (num >> 16) & 255,
		g: (num >> 8) & 255,
		b: num & 255,
	};
};

const rgba = (hex: string, alpha: number) => {
	const { r, g, b } = hexToRgb(hex);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const normalizeGalaxyColors = (colors: string[]) => {
	const filtered = colors.filter(
		(color) =>
			color &&
			color.trim() !== '' &&
			color.toLowerCase() !== '#ffffff' &&
			color.toLowerCase() !== '#fff',
	);

	if (filtered.length >= 2) {
		return filtered.slice(0, 4);
	}

	return ['#ff6b9d', '#c44569', '#f8b500', '#ff6b6b'];
};

const createGalaxyArms = (colors: string[], seed: number): GalaxyArm[] => {
	const random = createSeededRandom(seed);
	const armCount = 2 + Math.floor(random() * 2);
	const arms: GalaxyArm[] = [];

	for (let i = 0; i < armCount; i++) {
		const baseAngle = (i * 2 * Math.PI) / armCount;
		const spiralFactor = 0.3 + random() * 0.2;

		for (let j = 0; j < 3; j++) {
			const distance = 20 + j * 25;
			const angle = baseAngle + (distance * spiralFactor * Math.PI) / 180;
			const spread = 10 + random() * 15;

			arms.push({
				id: `arm-${i}-${j}`,
				startX: 50 + Math.cos(angle) * distance,
				startY: 50 + Math.sin(angle) * distance,
				endX: 50 + Math.cos(angle + 0.3) * (distance + 20),
				endY: 50 + Math.sin(angle + 0.3) * (distance + 20),
				controlX:
					50 +
					Math.cos(angle + 0.15) * (distance + 10) +
					(random() - 0.5) * spread,
				controlY:
					50 +
					Math.sin(angle + 0.15) * (distance + 10) +
					(random() - 0.5) * spread,
				width: 15 + random() * 25,
				color: colors[j % colors.length] || colors[0],
				opacity: 0.3 + random() * 0.4,
			});
		}
	}

	return arms;
};

const createStarClusters = (colors: string[], seed: number): StarCluster[] => {
	const random = createSeededRandom(seed + 2000);
	const clusterCount = 5 + Math.floor(random() * 4);
	const clusters: StarCluster[] = [];

	for (let i = 0; i < clusterCount; i++) {
		const angle = random() * 2 * Math.PI;
		const distance = 15 + random() * 35;

		clusters.push({
			id: `cluster-${i}`,
			x: 50 + Math.cos(angle) * distance,
			y: 50 + Math.sin(angle) * distance,
			size: 30 + random() * 60,
			density: 0.3 + random() * 0.7,
			color: colors[i % colors.length] || colors[0],
			brightness: 0.4 + random() * 0.6,
		});
	}

	return clusters;
};

const createGalaxyCore = (colors: string[], seed: number): GalaxyCore => {
	const random = createSeededRandom(seed + 3000);

	return {
		id: 'galaxy-core',
		x: 50,
		y: 50,
		size: 80 + random() * 40,
		color: colors[0] || '#ff6b9d',
		brightness: 0.7 + random() * 0.3,
	};
};

const createGalaxyGradient = (colors: string[]) => {
	const [primary, secondary, tertiary] = colors;

	return `
		radial-gradient(circle at 50% 50%, 
			${rgba(primary || '#ff6b9d', 0.4)} 0%, 
			${rgba(secondary || '#c44569', 0.2)} 30%, 
			${rgba(tertiary || '#f8b500', 0.1)} 60%, 
			transparent 100%
		),
		radial-gradient(circle at 30% 30%, ${rgba(primary || '#ff6b9d', 0.15)} 0%, transparent 40%),
		radial-gradient(circle at 70% 70%, ${rgba(secondary || '#c44569', 0.1)} 0%, transparent 35%),
		linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 25%, #0a0a0a 50%, #1a0a1a 75%, #0a0a0a 100%)
	`;
};

export const GalaxyBackground: React.FC<Props> = ({
	colors,
	blur,
	seed,
	width,
	height,
	className = '',
}) => {
	const galaxyColors = useMemo(() => normalizeGalaxyColors(colors), [colors]);

	const galaxyArms = useMemo(
		() => createGalaxyArms(galaxyColors, seed),
		[galaxyColors, seed],
	);

	const starClusters = useMemo(
		() => createStarClusters(galaxyColors, seed),
		[galaxyColors, seed],
	);

	const galaxyCore = useMemo(
		() => createGalaxyCore(galaxyColors, seed),
		[galaxyColors, seed],
	);

	const backgroundGradient = useMemo(
		() => createGalaxyGradient(galaxyColors),
		[galaxyColors],
	);

	return (
		<div
			className={`absolute overflow-hidden ${className}`}
			style={{
				width,
				height,
				background: backgroundGradient,
				filter: `blur(${blur * 0.1}px)`,
			}}
		>
			{/* Galaxy Core */}
			<div
				className='absolute rounded-full'
				style={{
					left: `${galaxyCore.x}%`,
					top: `${galaxyCore.y}%`,
					width: `${galaxyCore.size}px`,
					height: `${galaxyCore.size}px`,
					transform: 'translate(-50%, -50%)',
					background: `
						radial-gradient(
							circle at center,
							${rgba(galaxyCore.color, galaxyCore.brightness)} 0%,
							${rgba(galaxyCore.color, galaxyCore.brightness * 0.6)} 30%,
							${rgba(galaxyCore.color, galaxyCore.brightness * 0.3)} 60%,
							transparent 100%
						)
					`,
					filter: `blur(${galaxyCore.size * 0.1}px)`,
					mixBlendMode: 'screen',
				}}
			/>

			{/* Galaxy Arms */}
			<svg
				className='absolute inset-0'
				style={{ width: '100%', height: '100%' }}
			>
				<defs>
					{galaxyArms.map((arm) => (
						<linearGradient
							key={`gradient-${arm.id}`}
							id={`arm-gradient-${arm.id}`}
							x1='0%'
							y1='0%'
							x2='100%'
							y2='100%'
						>
							<stop offset='0%' stopColor={arm.color} stopOpacity={0} />
							<stop
								offset='50%'
								stopColor={arm.color}
								stopOpacity={arm.opacity}
							/>
							<stop offset='100%' stopColor={arm.color} stopOpacity={0} />
						</linearGradient>
					))}
				</defs>
				{galaxyArms.map((arm) => (
					<path
						key={arm.id}
						d={`M ${arm.startX} ${arm.startY} Q ${arm.controlX} ${arm.controlY} ${arm.endX} ${arm.endY}`}
						stroke={`url(#arm-gradient-${arm.id})`}
						strokeWidth={arm.width}
						fill='none'
						style={{
							filter: `blur(${arm.width * 0.3}px)`,
							mixBlendMode: 'screen',
						}}
					/>
				))}
			</svg>

			{/* Star Clusters */}
			{starClusters.map((cluster) => (
				<div
					key={cluster.id}
					className='absolute rounded-full'
					style={{
						left: `${cluster.x}%`,
						top: `${cluster.y}%`,
						width: `${cluster.size}px`,
						height: `${cluster.size}px`,
						transform: 'translate(-50%, -50%)',
						background: `
							radial-gradient(
								circle at center,
								${rgba(cluster.color, cluster.brightness * cluster.density)} 0%,
								${rgba(cluster.color, cluster.brightness * cluster.density * 0.5)} 50%,
								transparent 100%
							)
						`,
						filter: `blur(${cluster.size * 0.05}px)`,
						mixBlendMode: 'screen',
					}}
				/>
			))}

			{/* Dust particles */}
			{Array.from({ length: 50 }, (_, i) => {
				const random = createSeededRandom(seed + 4000 + i);
				const x = random() * 100;
				const y = random() * 100;
				const size = 0.5 + random() * 2;
				const colorIndex = Math.floor(random() * galaxyColors.length);
				const color = galaxyColors[colorIndex] || galaxyColors[0];
				const opacity = 0.1 + random() * 0.3;

				return (
					<div
						key={`dust-${i}`}
						className='absolute rounded-full'
						style={{
							left: `${x}%`,
							top: `${y}%`,
							width: `${size}px`,
							height: `${size}px`,
							transform: 'translate(-50%, -50%)',
							background: color,
							opacity,
							mixBlendMode: 'screen',
						}}
					/>
				);
			})}

			{/* Subtle glow effect */}
			<div
				className='absolute inset-0 pointer-events-none'
				style={{
					background: `
						radial-gradient(
							circle at 50% 50%,
							${rgba(galaxyColors[0] || '#ff6b9d', 0.1)} 0%,
							transparent 60%
						)
					`,
					mixBlendMode: 'screen',
				}}
			/>

			{/* Dark vignette */}
			<div
				className='absolute inset-0 pointer-events-none'
				style={{
					background:
						'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)',
					mixBlendMode: 'multiply',
				}}
			/>
		</div>
	);
};

export default GalaxyBackground;
