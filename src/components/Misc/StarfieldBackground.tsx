import { useMemo } from 'react';

interface Props {
	colors: string[];
	blur: number;
	seed: number;
	width: number;
	height: number;
	className?: string;
}

interface Star {
	id: string;
	x: number;
	y: number;
	size: number;
	brightness: number;
	color: string;
}

interface Nebula {
	id: string;
	x: number;
	y: number;
	size: number;
	color: string;
	opacity: number;
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

const normalizeSpaceColors = (colors: string[]) => {
	const filtered = colors.filter(
		(color) =>
			color &&
			color.trim() !== '' &&
			color.toLowerCase() !== '#ffffff' &&
			color.toLowerCase() !== '#fff',
	);

	if (filtered.length >= 2) {
		return filtered.slice(0, 5);
	}

	return ['#ffffff', '#ffd4a3', '#a3c9ff', '#ffa3a3', '#d4a3ff'];
};

const createStars = (
	colors: string[],
	seed: number,
	width: number,
	height: number,
): Star[] => {
	const random = createSeededRandom(seed);
	const starCount = Math.floor((width * height) / 800);
	const stars: Star[] = [];

	for (let i = 0; i < starCount; i++) {
		const colorIndex = Math.floor(random() * colors.length);
		const baseColor = colors[colorIndex] || '#ffffff';

		stars.push({
			id: `star-${i}`,
			x: random() * 100,
			y: random() * 100,
			size: random() < 0.1 ? 2 + random() * 2 : 0.5 + random() * 1.5,
			brightness: 0.3 + random() * 0.7,
			color: baseColor,
		});
	}

	return stars;
};

const createNebulae = (colors: string[], seed: number): Nebula[] => {
	const random = createSeededRandom(seed + 1000);
	const nebulaCount = 3 + Math.floor(random() * 3);
	const nebulae: Nebula[] = [];

	for (let i = 0; i < nebulaCount; i++) {
		const colorIndex = i % colors.length;
		const baseColor = colors[colorIndex] || '#ffffff';

		nebulae.push({
			id: `nebula-${i}`,
			x: 15 + random() * 70,
			y: 15 + random() * 70,
			size: 200 + random() * 300,
			color: baseColor,
			opacity: 0.1 + random() * 0.2,
		});
	}

	return nebulae;
};

const createSpaceGradient = (colors: string[]) => {
	const [primary, secondary, tertiary] = colors;

	return `
		radial-gradient(circle at 25% 25%, ${rgba(primary || '#ffffff', 0.15)} 0%, transparent 40%),
		radial-gradient(circle at 75% 75%, ${rgba(secondary || '#ffd4a3', 0.1)} 0%, transparent 35%),
		radial-gradient(circle at 50% 50%, ${rgba(tertiary || '#a3c9ff', 0.08)} 0%, transparent 45%),
		linear-gradient(180deg, #000814 0%, #001d3d 30%, #000814 60%, #000000 100%)
	`;
};

export const StarfieldBackground: React.FC<Props> = ({
	colors,
	blur,
	seed,
	width,
	height,
	className = '',
}) => {
	const spaceColors = useMemo(() => normalizeSpaceColors(colors), [colors]);

	const stars = useMemo(
		() => createStars(spaceColors, seed, width, height),
		[spaceColors, seed, width, height],
	);

	const nebulae = useMemo(
		() => createNebulae(spaceColors, seed),
		[spaceColors, seed],
	);

	const backgroundGradient = useMemo(
		() => createSpaceGradient(spaceColors),
		[spaceColors],
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
			{/* Nebulae clouds */}
			{nebulae.map((nebula) => (
				<div
					key={nebula.id}
					className='absolute rounded-full'
					style={{
						left: `${nebula.x}%`,
						top: `${nebula.y}%`,
						width: `${nebula.size}px`,
						height: `${nebula.size}px`,
						transform: 'translate(-50%, -50%)',
						background: `
							radial-gradient(
								circle at center,
								${rgba(nebula.color, nebula.opacity)} 0%,
								${rgba(nebula.color, nebula.opacity * 0.5)} 40%,
								transparent 70%
							)
						`,
						filter: `blur(${nebula.size * 0.15}px)`,
						mixBlendMode: 'screen',
					}}
				/>
			))}

			{/* Stars */}
			{stars.map((star) => (
				<div
					key={star.id}
					className='absolute rounded-full'
					style={{
						left: `${star.x}%`,
						top: `${star.y}%`,
						width: `${star.size}px`,
						height: `${star.size}px`,
						transform: 'translate(-50%, -50%)',
						background: star.color,
						opacity: star.brightness,
						boxShadow: `
							0 0 ${star.size * 2}px ${rgba(star.color, star.brightness * 0.5)},
							0 0 ${star.size * 4}px ${rgba(star.color, star.brightness * 0.2)}
						`,
						mixBlendMode: 'screen',
					}}
				/>
			))}

			{/* Subtle vignette */}
			<div
				className='absolute inset-0 pointer-events-none'
				style={{
					background:
						'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.7) 100%)',
					mixBlendMode: 'multiply',
				}}
			/>

			{/* Subtle scan lines effect */}
			<div
				className='absolute inset-0 pointer-events-none opacity-20'
				style={{
					background:
						'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
				}}
			/>
		</div>
	);
};

export default StarfieldBackground;
