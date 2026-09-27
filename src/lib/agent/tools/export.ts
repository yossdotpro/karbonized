import { z } from 'zod';
import {
	MAX_CANVAS_SIDE,
	renderImage,
	saveDataUrl,
	useExportSettings,
} from '@/lib/export/exporter';
import { requireWorkspace } from '@/lib/editor/actions';
import { ToolError, defineTool, type ToolContent } from './registry';

/** Longest side of the snapshots shown to a model. */
const SNAPSHOT_MAX_SIDE = 1024;

const workspaceElement = (): HTMLElement => {
	const element = document.getElementById('workspace');
	if (!element) throw new ToolError('The canvas is not rendered.');
	return element;
};

export const splitDataUrl = (
	dataUrl: string,
): { mimeType: string; data: string } => {
	const match = /^data:([^;,]+)((?:;[^;,]*)*),(.*)$/s.exec(dataUrl);
	if (!match) throw new ToolError('Could not read the rendered image.');

	const [, mimeType, parameters, payload] = match;
	return {
		mimeType,
		data: parameters.split(';').includes('base64')
			? payload
			: toBase64(decodeURIComponent(payload)),
	};
};

const toBase64 = (text: string): string => {
	let binary = '';
	new TextEncoder().encode(text).forEach((byte) => {
		binary += String.fromCharCode(byte);
	});
	return btoa(binary);
};

export const snapshotScale = (width: number, height: number): number =>
	Math.min(1, SNAPSHOT_MAX_SIDE / Math.max(width, height, 1));

export const getCanvasSnapshotTool = defineTool({
	name: 'get_canvas_snapshot',
	title: 'Look at the canvas',
	description:
		'Render the canvas as a PNG image (longest side up to 1024 px) to check how the design looks.',
	input: z.object({}),
	mutates: false,
	execute: async (_args, context) => {
		if (!context.supportsImages) {
			throw new ToolError('The current model does not accept images.');
		}

		const workspace = requireWorkspace();
		const dataUrl = await renderImage(workspaceElement(), {
			format: 'png',
			scale: snapshotScale(
				parseFloat(workspace.workspaceWidth),
				parseFloat(workspace.workspaceHeight),
			),
			transparent: false,
			quality: 1,
		});

		return {
			content: [{ type: 'image', ...splitDataUrl(dataUrl) } as ToolContent],
		};
	},
});

export const exportImageTool = defineTool({
	name: 'export_image',
	title: 'Export image',
	description: [
		'Export the canvas as an image, without asking the user anything by default.',
		'destination "folder" (default) writes the file to the export folder of the desktop app (Pictures/Karbonized unless the user changed it) under a free name and returns its path; in the browser the file downloads.',
		'"return" saves nothing and returns the image itself (the SVG markup for svg).',
		'"ask" opens a save dialog, only when the user wants to pick the place.',
		'Uses the export settings of the app for anything not given.',
	].join(' '),
	input: z.object({
		format: z.enum(['png', 'jpeg', 'svg']).optional(),
		scale: z.number().min(0.5).max(4).optional(),
		transparent: z
			.boolean()
			.optional()
			.describe('Leave out the background (png and svg).'),
		fileName: z
			.string()
			.max(120)
			.optional()
			.describe('File name without extension (default: the workspace name).'),
		destination: z.enum(['folder', 'return', 'ask']).optional(),
		returnImage: z
			.boolean()
			.optional()
			.describe('Also return the exported image when saving it.'),
	}),
	mutates: false,
	execute: async (args, context) => {
		const workspace = requireWorkspace();
		const destination = args.destination ?? 'folder';
		const settings = {
			...useExportSettings.getState(),
			...(args.format && { format: args.format }),
			...(args.scale && { scale: args.scale }),
			...(args.transparent !== undefined && { transparent: args.transparent }),
		};

		const width = parseFloat(workspace.workspaceWidth) * settings.scale;
		const height = parseFloat(workspace.workspaceHeight) * settings.scale;
		if (
			settings.format !== 'svg' &&
			Math.max(width, height) > MAX_CANVAS_SIDE
		) {
			throw new ToolError(
				`The image would be ${Math.round(width)}×${Math.round(height)} px, larger than browsers can render. Use a smaller scale.`,
			);
		}

		const dataUrl = await renderImage(workspaceElement(), settings);
		const name = args.fileName?.trim() || workspace.workspaceName;
		const described = `${settings.format.toUpperCase()}${
			settings.format === 'svg' ? '' : ` at ${settings.scale}×`
		} (${Math.round(width)}×${Math.round(height)} px)`;
		const image = (): ToolContent => {
			const { mimeType, data } = splitDataUrl(dataUrl);
			return settings.format === 'svg'
				? { type: 'text', text: atobUtf8(data) }
				: { type: 'image', mimeType, data };
		};

		if (destination === 'return') {
			if (settings.format !== 'svg' && !context.supportsImages) {
				throw new ToolError(
					'The current model does not accept images. Use destination "folder".',
				);
			}
			return {
				content: [
					{ type: 'text', text: `Rendered ${name} as ${described}.` },
					image(),
				],
			};
		}

		const saved = await saveDataUrl(dataUrl, name, settings.format, {
			ask: destination === 'ask',
		});
		if (!saved) {
			return {
				content: [
					{ type: 'text', text: 'The user cancelled the save dialog.' },
				],
			};
		}

		const content: ToolContent[] = [
			{
				type: 'text',
				text:
					saved.kind === 'file'
						? `Saved ${name} as ${described} to ${saved.path}`
						: `Downloaded ${saved.fileName} as ${described}.`,
			},
		];
		if (
			args.returnImage &&
			(settings.format === 'svg' || context.supportsImages)
		) {
			content.push(image());
		}

		return { content };
	},
});

/** Base64 of UTF-8 text back to the text. */
const atobUtf8 = (data: string): string =>
	new TextDecoder().decode(
		Uint8Array.from(atob(data), (char) => char.charCodeAt(0)),
	);

export const exportTools = [getCanvasSnapshotTool, exportImageTool];
