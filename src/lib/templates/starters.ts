import { useHistoryStore, useWorkspaceStore } from '@/stores';
import type { WorkspaceSettings } from '@/stores/workspace-store';
import { addBlock, createWorkspace, selectBlocks } from '@/lib/editor/actions';
import type { AddBlockInput } from '@/lib/editor/actions';

/**
 * Built-in starting points for the start screen. Each one is a canvas size,
 * a background and a few blocks, created through the editor actions so the
 * blocks get the same defaults, sizes and history as anything added by hand.
 */

export interface StarterTemplate {
	id: string;
	name: string;
	description: string;
	width: number;
	height: number;
	/** CSS background of the card, matching the canvas background. */
	preview: string;
	background: Partial<WorkspaceSettings>;
	blocks: AddBlockInput[];
}

const gradient = (
	color1: string,
	color2: string,
	deg = 135,
): Pick<StarterTemplate, 'preview' | 'background'> => ({
	preview: `linear-gradient(${deg}deg, ${color1}, ${color2})`,
	background: {
		workspaceType: 'color',
		workspaceColorMode: 'Gradient',
		workspaceGradientSettings: { color1, color2, deg },
	},
});

const solid = (
	color: string,
): Pick<StarterTemplate, 'preview' | 'background'> => ({
	preview: color,
	background: {
		workspaceType: 'color',
		workspaceColorMode: 'Single',
		workspaceColor: color,
	},
});

const SAMPLE_CODE = `type Launch = {
  name: string;
  version: \`\${number}.\${number}\`;
};

export async function ship(launch: Launch) {
  await build(launch);
  await publish({ ...launch, notes: 'Made with Karbonized' });
  return \`🚀 \${launch.name} v\${launch.version} is live\`;
}`;

/** Inline SVG as a data URL, so templates work offline and export cleanly. */
const svg = (markup: string): string =>
	`data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;

/** A website wireframe to fill the browser until a screenshot is dropped. */
const WEBSITE_PLACEHOLDER =
	svg(`<svg xmlns='http://www.w3.org/2000/svg' width='1500' height='820' viewBox='0 0 1500 820'>
<rect width='1500' height='820' fill='#f8fafc'/>
<rect x='80' y='48' width='120' height='28' rx='14' fill='#0f172a'/>
<rect x='980' y='54' width='90' height='16' rx='8' fill='#cbd5e1'/>
<rect x='1100' y='54' width='90' height='16' rx='8' fill='#cbd5e1'/>
<rect x='1220' y='42' width='200' height='40' rx='20' fill='#6366f1'/>
<rect x='80' y='220' width='640' height='56' rx='12' fill='#0f172a'/>
<rect x='80' y='296' width='520' height='56' rx='12' fill='#0f172a'/>
<rect x='80' y='392' width='560' height='20' rx='10' fill='#94a3b8'/>
<rect x='80' y='426' width='460' height='20' rx='10' fill='#94a3b8'/>
<rect x='80' y='496' width='210' height='56' rx='28' fill='#6366f1'/>
<rect x='310' y='496' width='190' height='56' rx='28' fill='none' stroke='#cbd5e1' stroke-width='3'/>
<rect x='820' y='180' width='600' height='460' rx='24' fill='url(#g)'/>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#a5b4fc'/><stop offset='1' stop-color='#f0abfc'/></linearGradient></defs>
</svg>`);

/** An app screen wireframe to fill the phone until a screenshot is dropped. */
const APP_PLACEHOLDER =
	svg(`<svg xmlns='http://www.w3.org/2000/svg' width='390' height='844' viewBox='0 0 390 844'>
<rect width='390' height='844' fill='#fff7ed'/>
<rect x='24' y='72' width='160' height='30' rx='10' fill='#1f2937'/>
<circle cx='340' cy='87' r='20' fill='#fdba74'/>
<rect x='24' y='130' width='342' height='190' rx='24' fill='url(#g)'/>
<rect x='48' y='250' width='150' height='18' rx='9' fill='#ffffff' opacity='0.9'/>
<rect x='48' y='278' width='100' height='14' rx='7' fill='#ffffff' opacity='0.7'/>
<rect x='24' y='348' width='342' height='84' rx='18' fill='#ffffff'/>
<rect x='44' y='370' width='40' height='40' rx='12' fill='#fb7185'/>
<rect x='100' y='374' width='150' height='14' rx='7' fill='#1f2937'/>
<rect x='100' y='396' width='100' height='12' rx='6' fill='#9ca3af'/>
<rect x='24' y='448' width='342' height='84' rx='18' fill='#ffffff'/>
<rect x='44' y='470' width='40' height='40' rx='12' fill='#f59e0b'/>
<rect x='100' y='474' width='170' height='14' rx='7' fill='#1f2937'/>
<rect x='100' y='496' width='120' height='12' rx='6' fill='#9ca3af'/>
<rect x='24' y='548' width='342' height='84' rx='18' fill='#ffffff'/>
<rect x='44' y='570' width='40' height='40' rx='12' fill='#6366f1'/>
<rect x='100' y='574' width='130' height='14' rx='7' fill='#1f2937'/>
<rect x='100' y='596' width='90' height='12' rx='6' fill='#9ca3af'/>
<rect x='24' y='760' width='342' height='56' rx='28' fill='#1f2937'/>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f43f5e'/><stop offset='1' stop-color='#f59e0b'/></linearGradient></defs>
</svg>`);

export const STARTER_TEMPLATES: StarterTemplate[] = [
	{
		id: 'code-snippet',
		name: 'Code snippet',
		description: 'A code window on a soft gradient',
		width: 1600,
		height: 900,
		...gradient('#6366f1', '#d946ef'),
		blocks: [
			{
				type: 'code',
				name: 'snippet',
				x: 230,
				y: 220,
				width: 1140,
				height: 460,
				properties: {
					code: SAMPLE_CODE,
					lang: 'tsx',
					wintitle: 'ship.ts',
					winstyle: 'mac',
				},
			},
		],
	},
	{
		id: 'launch-post',
		name: 'Launch post',
		description: 'Headline and subtitle for link previews',
		width: 1200,
		height: 630,
		...gradient('#0f172a', '#312e81', 160),
		blocks: [
			{
				type: 'text',
				name: 'eyebrow',
				x: 90,
				y: 150,
				width: 700,
				properties: {
					text: 'INTRODUCING',
					textSize: '22',
					color: '#fb7185',
					isBold: true,
					letterSpacing: 4,
				},
			},
			{
				type: 'text',
				name: 'headline',
				x: 90,
				y: 200,
				width: 1000,
				properties: {
					text: 'Something new\nis here.',
					textSize: '76',
					color: '#ffffff',
					isBold: true,
					lineHeight: 1.05,
				},
			},
			{
				type: 'text',
				name: 'subtitle',
				x: 90,
				y: 420,
				width: 900,
				properties: {
					text: 'Tell people what changed, in one sentence.',
					textSize: '28',
					color: '#c7d2fe',
				},
			},
		],
	},
	{
		id: 'app-showcase',
		name: 'App showcase',
		description: 'A phone mockup with a headline',
		width: 1080,
		height: 1350,
		...gradient('#f43f5e', '#f59e0b', 160),
		blocks: [
			{
				type: 'text',
				name: 'headline',
				x: 90,
				y: 110,
				width: 900,
				properties: {
					text: 'Your app, front and center',
					textSize: '64',
					color: '#ffffff',
					isBold: true,
					textAlign: 'center',
					lineHeight: 1.1,
				},
			},
			{
				type: 'phone_mockup',
				name: 'phone',
				x: 300,
				y: 330,
				width: 480,
				height: 930,
				properties: { src: APP_PLACEHOLDER },
			},
		],
	},
	{
		id: 'browser-mockup',
		name: 'Browser mockup',
		description: 'A website in a browser window',
		width: 1920,
		height: 1080,
		...gradient('#0ea5e9', '#6366f1'),
		blocks: [
			{
				type: 'window',
				name: 'browser',
				x: 210,
				y: 110,
				width: 1500,
				height: 860,
				properties: {
					title: 'My website',
					url: 'example.com',
					windowStyle: 'mac',
					windowType: 'browser',
					src: WEBSITE_PLACEHOLDER,
				},
			},
		],
	},
	{
		id: 'quote-card',
		name: 'Quote card',
		description: 'A quote and its author',
		width: 1080,
		height: 1080,
		...solid('#111827'),
		blocks: [
			{
				type: 'text',
				name: 'quote',
				x: 110,
				y: 330,
				width: 860,
				properties: {
					text: '“Simple things should be simple, complex things should be possible.”',
					textSize: '52',
					color: '#f9fafb',
					isBold: true,
					lineHeight: 1.2,
				},
			},
			{
				type: 'text',
				name: 'author',
				x: 110,
				y: 640,
				width: 860,
				properties: {
					text: '— Alan Kay',
					textSize: '28',
					color: '#9ca3af',
				},
			},
		],
	},
];

/** Opens a new project from a template and shows it in the editor. */
export const createFromTemplate = (template: StarterTemplate): void => {
	createWorkspace({
		name: template.name,
		width: template.width,
		height: template.height,
	});

	// The background is part of the starting point, not a step to undo.
	useWorkspaceStore.getState().setWorkspaceSettings(template.background);

	// Undoing right after opening a template removes its blocks in one step.
	useHistoryStore.getState().transaction(() => {
		template.blocks.forEach((block) => addBlock(block));
	});
	selectBlocks([]);
};
