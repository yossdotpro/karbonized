import { z } from 'zod';
import {
	createWorkspace,
	getWorkspaceSummary,
	setGuides,
	requireWorkspace,
	setCanvasSettings,
	setProjectVariables,
	getVariableUsage,
	waitForElement,
} from '@/lib/editor/actions';
import {
	type ProjectVariable,
	MAX_VARIABLES,
	MAX_VARIABLE_VALUE,
	VARIABLE_NAME_PATTERN,
} from '@/lib/variables/variables';
import type { WorkspaceSettings } from '@/stores/workspace-store';
import { textures } from '@/constants/textures';
import Wallpapers from '@/utils/wallpapers';
import { ToolError, defineTool } from './registry';
import { compactValue } from './blocks';

const hexColor = z
	.string()
	.regex(/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i, 'Use a hex color.');

const textureNames = textures.map((texture) => texture.name) as [
	string,
	...string[],
];
const wallpaperIds = Wallpapers.map((wallpaper) => wallpaper.id) as [
	string,
	...string[],
];

export const getWorkspaceTool = defineTool({
	name: 'get_workspace',
	title: 'Read workspace',
	description:
		'Read the open canvas: size, background, project variables (template slots, shown by blocks as {{name}}), selection and every block (id, type, name, position, size, rotation, visibility, lock and properties that differ from their defaults). Coordinates are canvas pixels from the top-left corner.',
	input: z.object({}),
	mutates: false,
	execute: () => {
		const summary = getWorkspaceSummary();
		return {
			...summary,
			blocks: summary.blocks.map((block) => ({
				...block,
				properties: Object.fromEntries(
					Object.entries(block.properties).map(([key, value]) => [
						key,
						compactValue(value),
					]),
				),
			})),
		};
	},
});

export const setGuidesTool = defineTool({
	name: 'set_guides',
	title: 'Set guides',
	description:
		'Replace the guides blocks snap to, in canvas pixels. `vertical` are x positions and `horizontal` are y positions; an empty list clears that axis and a list left out keeps it. Guides show only while the rulers are on (run the view.toggle-rulers command).',
	input: z.object({
		vertical: z
			.array(z.number())
			.optional()
			.describe('Vertical guides, as x positions in canvas pixels.'),
		horizontal: z
			.array(z.number())
			.optional()
			.describe('Horizontal guides, as y positions in canvas pixels.'),
	}),
	mutates: false,
	execute: (args) => setGuides(args),
});

export const createWorkspaceTool = defineTool({
	name: 'create_workspace',
	title: 'Create workspace',
	description:
		'Create a new project in a new tab with an empty canvas of the given size, and open it. Use it when no workspace is open or the user asks for a new design.',
	input: z.object({
		name: z.string().describe('Project name.'),
		width: z.number().int().min(50).max(8000).describe('Canvas width.'),
		height: z.number().int().min(50).max(8000).describe('Canvas height.'),
	}),
	// Opening a project is not an undoable edit.
	mutates: false,
	execute: async (args) => {
		const workspace = createWorkspace(args);
		if (!(await waitForElement('#workspace'))) {
			throw new ToolError(
				'The workspace was created but the editor did not open.',
			);
		}
		return {
			id: workspace.id,
			name: workspace.workspaceName,
			width: args.width,
			height: args.height,
		};
	},
});

export const setCanvasBackgroundTool = defineTool({
	name: 'set_canvas_background',
	title: 'Set canvas background',
	description: [
		'Change the canvas background. Pick a type and give its fields:',
		'- color: `color`',
		'- gradient: `gradient` {color1, color2, angle}',
		`- texture: \`texture\` {name, color1, color2}; names: ${textureNames.join(', ')}`,
		`- image: \`wallpaper\`; ids: ${wallpaperIds.join(', ')}`,
		'- dynamic: `dynamic` {style: mesh|lava|starfield|galaxy, colors (2-5), seed}',
		'`blur` and `noise` apply to every type.',
	].join('\n'),
	input: z.object({
		type: z.enum(['color', 'gradient', 'texture', 'image', 'dynamic']),
		color: hexColor.optional(),
		gradient: z
			.object({
				color1: hexColor,
				color2: hexColor,
				angle: z.number().min(0).max(360).optional(),
			})
			.optional(),
		texture: z
			.object({
				name: z.enum(textureNames),
				color1: hexColor.optional(),
				color2: hexColor.optional(),
			})
			.optional(),
		wallpaper: z.enum(wallpaperIds).optional(),
		dynamic: z
			.object({
				style: z.enum(['mesh', 'lava', 'starfield', 'galaxy']),
				colors: z.array(hexColor).min(2).max(5).optional(),
				seed: z.number().int().min(0).max(9999).optional(),
			})
			.optional(),
		blur: z.number().min(0).max(100).optional(),
		noise: z.number().min(0).max(100).optional(),
	}),
	mutates: true,
	execute: (args) => {
		const workspace = requireWorkspace();
		const settings: Partial<WorkspaceSettings> = {};

		switch (args.type) {
			case 'color':
				if (!args.color) throw new ToolError('Give `color`.');
				Object.assign(settings, {
					workspaceType: 'color',
					workspaceColorMode: 'Single',
					workspaceColor: args.color,
				});
				break;
			case 'gradient':
				if (!args.gradient) throw new ToolError('Give `gradient`.');
				Object.assign(settings, {
					workspaceType: 'color',
					workspaceColorMode: 'Gradient',
					workspaceGradientSettings: {
						color1: args.gradient.color1,
						color2: args.gradient.color2,
						deg: args.gradient.angle ?? workspace.workspaceGradientSettings.deg,
					},
				});
				break;
			case 'texture':
				if (!args.texture) throw new ToolError('Give `texture`.');
				Object.assign(settings, {
					workspaceType: 'texture',
					textureName: args.texture.name,
					textureColors: {
						color1: args.texture.color1 ?? workspace.textureColors.color1,
						color2: args.texture.color2 ?? workspace.textureColors.color2,
					},
				});
				break;
			case 'image':
				if (!args.wallpaper) throw new ToolError('Give `wallpaper`.');
				Object.assign(settings, {
					workspaceType: 'image',
					textureName: args.wallpaper,
				});
				break;
			case 'dynamic':
				if (!args.dynamic) throw new ToolError('Give `dynamic`.');
				Object.assign(settings, {
					workspaceType: 'dynamic',
					workspaceDynamicType: args.dynamic.style,
					workspaceDynamicSettings: {
						colors:
							args.dynamic.colors ?? workspace.workspaceDynamicSettings.colors,
						seed: args.dynamic.seed ?? workspace.workspaceDynamicSettings.seed,
					},
				});
				break;
		}

		if (args.blur !== undefined) settings.workspaceBlur = args.blur;
		if (args.noise !== undefined) settings.workspaceNoise = args.noise;

		setCanvasSettings(settings);
		return `Background set to ${args.type}.`;
	},
});

export const setCanvasSizeTool = defineTool({
	name: 'set_canvas_size',
	title: 'Set canvas size',
	description:
		'Resize the canvas (the exported image), e.g. 1920×1080, 1080×1080 or 1200×630. Blocks keep their positions.',
	input: z.object({
		width: z.number().int().min(50).max(8000),
		height: z.number().int().min(50).max(8000),
	}),
	mutates: true,
	execute: ({ width, height }) => {
		setCanvasSettings({
			workspaceWidth: String(width),
			workspaceHeight: String(height),
		});
		return `Canvas size set to ${width}×${height}.`;
	},
});

export const setVariablesTool = defineTool({
	name: 'set_variables',
	title: 'Set project variables',
	description: [
		'Fill or define the template slots of the project. A block that contains {{name}} in its text, code, window title or url, QR text or HTML shows the value of the variable, so changing a value updates the design without editing blocks.',
		'Listed variables are created when missing and updated otherwise; the rest are kept. `remove` deletes variables.',
		'Dates take YYYY-MM-DD or "today" and show in `format` (long, medium, short or iso).',
		'The result lists variables no block uses and {{name}} references that have no variable.',
	].join(' '),
	input: z.object({
		variables: z
			.array(
				z.object({
					name: z
						.string()
						.regex(VARIABLE_NAME_PATTERN, 'Letters, numbers, - and _.'),
					value: z.string().max(MAX_VARIABLE_VALUE).optional(),
					kind: z.enum(['text', 'multiline', 'date']).optional(),
					label: z.string().max(60).optional(),
					format: z.enum(['long', 'medium', 'short', 'iso']).optional(),
				}),
			)
			.optional(),
		remove: z.array(z.string()).optional(),
	}),
	mutates: true,
	execute: ({ variables = [], remove = [] }) => {
		const workspace = requireWorkspace();
		const removed = new Set(remove);
		const unknown = remove.filter(
			(name) => !(workspace.variables ?? []).some((item) => item.name === name),
		);
		if (unknown.length > 0) {
			throw new ToolError(`No variable named ${unknown.join(', ')}.`);
		}

		const next: ProjectVariable[] = (workspace.variables ?? []).filter(
			(item) => !removed.has(item.name),
		);
		for (const input of variables) {
			const index = next.findIndex((item) => item.name === input.name);
			const current = index >= 0 ? next[index] : undefined;
			const kind = input.kind ?? current?.kind ?? 'text';
			const updated: ProjectVariable = {
				name: input.name,
				kind,
				value:
					input.value ?? current?.value ?? (kind === 'date' ? 'today' : ''),
				...((input.label ?? current?.label) && {
					label: input.label ?? current?.label,
				}),
				...(kind === 'date' && {
					format: input.format ?? current?.format ?? 'long',
				}),
			};
			if (index >= 0) next[index] = updated;
			else next.push(updated);
		}
		if (next.length > MAX_VARIABLES) {
			throw new ToolError(
				`A project holds at most ${MAX_VARIABLES} variables.`,
			);
		}

		setProjectVariables(next);
		return {
			variables: requireWorkspace().variables ?? [],
			...getVariableUsage(),
		};
	},
});

export const workspaceTools = [
	getWorkspaceTool,
	createWorkspaceTool,
	setCanvasBackgroundTool,
	setCanvasSizeTool,
	setGuidesTool,
	setVariablesTool,
];
