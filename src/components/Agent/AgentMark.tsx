import { useId, type SVGProps } from 'react';

/**
 * The face of the agent: the rounded diamond of the app logo with a pair of
 * big eyes and a smile knocked out of it, so it takes the color of whatever
 * it sits on (`text-brand` in the panel and the status bar).
 */
export function AgentMark(props: SVGProps<SVGSVGElement>) {
	const maskId = `${useId()}-agent-face`;

	return (
		<svg
			width='24'
			height='24'
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			{...props}
		>
			<mask id={maskId}>
				<rect width='24' height='24' fill='#fff' />
				{/* Eyes, with a highlight punched back in */}
				<ellipse cx='9.2' cy='11.1' rx='1.6' ry='2.05' fill='#000' />
				<ellipse cx='14.8' cy='11.1' rx='1.6' ry='2.05' fill='#000' />
				<circle cx='9.75' cy='10.25' r='.52' fill='#fff' />
				<circle cx='15.35' cy='10.25' r='.52' fill='#fff' />
				{/* Smile */}
				<path
					d='M10.45 15.05c.5.6 2.6.6 3.1 0'
					stroke='#000'
					strokeWidth='1.1'
					strokeLinecap='round'
					fill='none'
				/>
			</mask>
			<rect
				x='3.6'
				y='3.6'
				width='16.8'
				height='16.8'
				rx='4.6'
				transform='rotate(45 12 12)'
				fill='currentColor'
				mask={`url(#${maskId})`}
			/>
		</svg>
	);
}

export default AgentMark;
