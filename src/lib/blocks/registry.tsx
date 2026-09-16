import React, { Suspense } from 'react';
import {
	AppWindow,
	Boxes,
	Brush,
	Circle,
	CodeSquare,
	Folder,
	Image as ImageIcon,
	type LucideIcon,
	Monitor,
	Package,
	QrCode,
	Smartphone,
	Sticker,
	Type,
	Users,
} from 'lucide-react';
import { IconBrandHtml5 } from '@tabler/icons-react';
import { BlockLoader } from '@/components/Blocks/BlockLoader';

/**
 * The one place that says which blocks exist in the editor.
 *
 * Everything that has to know about a block type reads it from here: the
 * toolbar, the canvas, the hierarchy icons. What a block *stores* lives in
 * `catalog.ts`, which Beedly and the MCP server use.
 */

const CodeBlock = React.lazy(
	async () => await import('@/components/Blocks/CodeBlock'),
);
const FaIconBlock = React.lazy(
	async () => await import('@/components/Blocks/FaIconBlock'),
);
const CustomBlock = React.lazy(
	async () => await import('@/components/Blocks/CustomBlock'),
);
const TextBlock = React.lazy(
	async () => await import('@/components/Blocks/TextBlock'),
);
const QrBlock = React.lazy(
	async () => await import('@/components/Blocks/QrBlock'),
);
const PhoneBlock = React.lazy(
	async () => await import('@/components/Blocks/PhoneBlock'),
);
const ImageBlock = React.lazy(
	async () => await import('@/components/Blocks/ImageBlock'),
);
const AvatarBlock = React.lazy(
	async () => await import('@/components/Blocks/AvatarBlock'),
);
const ShapeBlock = React.lazy(
	async () => await import('@/components/Blocks/ShapeBlock'),
);
const WindowBlock = React.lazy(
	async () => await import('@/components/Blocks/WindowBlock'),
);
const HTMLBlock = React.lazy(
	async () => await import('@/components/Blocks/HTMLBlock'),
);
const DrawingBlock = React.lazy(
	async () => await import('@/components/Blocks/DrawingBlock'),
);

export interface BlockDefinition {
	type: string;
	/** Name shown in the toolbar and the command palette. */
	label: string;
	icon: LucideIcon | React.ComponentType<{ className?: string }>;
	component: React.ComponentType<{ id: string }>;
	/** Blocks that are not offered in the toolbar (only created another way). */
	insertable?: boolean;
}

export const BLOCKS: readonly BlockDefinition[] = [
	{ type: 'code', label: 'Code', icon: CodeSquare, component: CodeBlock },
	{ type: 'image', label: 'Image', icon: ImageIcon, component: ImageBlock },
	{ type: 'icon', label: 'Icon', icon: Sticker, component: FaIconBlock },
	{ type: 'text', label: 'Text', icon: Type, component: TextBlock },
	{ type: 'shape', label: 'Shape', icon: Circle, component: ShapeBlock },
	{
		type: 'phone_mockup',
		label: 'Phone',
		icon: Smartphone,
		component: PhoneBlock,
	},
	{ type: 'qr', label: 'QR Code', icon: QrCode, component: QrBlock },
	{ type: 'window', label: 'Window', icon: AppWindow, component: WindowBlock },
	{ type: 'html', label: 'HTML', icon: IconBrandHtml5, component: HTMLBlock },
	{
		// Strokes are made with the brush tool, not dropped from the toolbar.
		type: 'drawing',
		label: 'Drawing',
		icon: Brush,
		component: DrawingBlock,
		insertable: false,
	},
	{
		type: 'avatar',
		label: 'Avatar',
		icon: Users,
		component: AvatarBlock,
		insertable: false,
	},
	{
		type: 'custom',
		label: 'Component',
		icon: Package,
		component: CustomBlock,
		insertable: false,
	},
];

const BY_TYPE = new Map(BLOCKS.map((block) => [block.type, block]));

export const getBlock = (type: string): BlockDefinition | undefined =>
	BY_TYPE.get(type);

/** Blocks the toolbar and the command palette offer, in that order. */
export const INSERTABLE_BLOCKS = BLOCKS.filter(
	(block) => block.insertable !== false,
);

/** Icon of a block type, for the hierarchy and menus. */
export const blockIcon = (
	type: string,
): LucideIcon | React.ComponentType<{ className?: string }> => {
	if (type === 'group') return Folder;
	return getBlock(type)?.icon ?? Boxes;
};

/** Icon for the phone mockup in lists, where a monitor reads better. */
export const HIERARCHY_ICON_OVERRIDES: Record<string, LucideIcon> = {
	phone_mockup: Monitor,
};

interface RenderProps {
	id: string;
	type: string;
	isVisible: boolean;
}

/** The component of a block, loaded on demand, or nothing for unknown types. */
export const BlockView: React.FC<RenderProps> = ({ type, id, isVisible }) => {
	const block = getBlock(type);
	if (!block) return null;

	const Component = block.component;

	return (
		<Suspense fallback={<BlockLoader></BlockLoader>}>
			<div className={`${!isVisible && 'hidden'}`}>
				<Component id={id}></Component>
			</div>
		</Suspense>
	);
};
