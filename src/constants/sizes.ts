import React from 'react';
import {
	Monitor,
	Smartphone,
	Tablet,
	FileImage,
	Tv,
	FileText,
	Play,
	Users,
	MessageCircle,
	Briefcase,
	Grid3X3,
	Square,
} from 'lucide-react';
import {
	IconBrandFacebook,
	IconBrandInstagram,
	IconBrandLinkedin,
	IconBrandPinterest,
	IconBrandX,
	IconBrandYoutube,
} from '@tabler/icons-react';

export interface SizeItem {
	label: string;
	width: number;
	height: number;
	icon?: React.ReactNode;
	description?: string;
}

export const Sizes: SizeItem[] = [
	{
		label: 'Default',
		width: 512,
		height: 512,
		icon: React.createElement(Square, { className: 'w-5 h-5' }),
		description: 'Default size',
	},
	{
		label: 'Desktop HD',
		width: 1920,
		height: 1080,
		icon: React.createElement(Monitor, { className: 'w-5 h-5' }),
		description: 'Standard desktop screen',
	},
	{
		label: 'Desktop 4K',
		width: 3840,
		height: 2160,
		icon: React.createElement(Monitor, { className: 'w-5 h-5' }),
		description: 'Ultra HD 4K',
	},
	{
		label: 'Quad HD',
		width: 2560,
		height: 1440,
		icon: React.createElement(Monitor, { className: 'w-5 h-5' }),
		description: 'Quad HD 1440p',
	},
	{
		label: 'Full HD',
		width: 1920,
		height: 1080,
		icon: React.createElement(Monitor, { className: 'w-5 h-5' }),
		description: 'Full HD 1080p',
	},
	{
		label: 'HD',
		width: 1280,
		height: 720,
		icon: React.createElement(Monitor, { className: 'w-5 h-5' }),
		description: 'HD 720p',
	},
	{
		label: 'Mobile',
		width: 375,
		height: 812,
		icon: React.createElement(Smartphone, { className: 'w-5 h-5' }),
		description: 'iPhone X/11/12 dimensions',
	},
	{
		label: 'Tablet',
		width: 768,
		height: 1024,
		icon: React.createElement(Tablet, { className: 'w-5 h-5' }),
		description: 'Standard iPad',
	},
	{
		label: 'Iphone 13 Pro Max',
		width: 428,
		height: 926,
		icon: React.createElement(Smartphone, { className: 'w-5 h-5' }),
		description: 'iPhone 13 Pro Max',
	},
	{
		label: 'Android',
		width: 360,
		height: 640,
		icon: React.createElement(Smartphone, { className: 'w-5 h-5' }),
		description: 'Standard Android',
	},
	{
		label: 'Legal',
		width: 612,
		height: 1008,
		icon: React.createElement(FileText, { className: 'w-5 h-5' }),
		description: 'Legal Document',
	},
	{
		label: 'Letter',
		width: 612,
		height: 792,
		icon: React.createElement(FileText, { className: 'w-5 h-5' }),
		description: 'US Letter',
	},
	{
		label: 'You Tube',
		width: 2560,
		height: 1440,
		icon: React.createElement(IconBrandYoutube, { className: 'w-5 h-5' }),
		description: 'YouTube thumbnail',
	},
	{
		label: 'Facebook Cover',
		width: 820,
		height: 312,
		icon: React.createElement(IconBrandFacebook, { className: 'w-5 h-5' }),
		description: 'Facebook Cover',
	},
	{
		label: 'Facebook Post',
		width: 1200,
		height: 630,
		icon: React.createElement(IconBrandFacebook, { className: 'w-5 h-5' }),
		description: 'Facebook Post',
	},
	{
		label: 'X (Twitter) Header',
		width: 1500,
		height: 500,
		icon: React.createElement(IconBrandX, { className: 'w-5 h-5' }),
		description: 'Twitter Header',
	},
	{
		label: 'X (Twitter) Post',
		width: 1012,
		height: 506,
		icon: React.createElement(IconBrandX, { className: 'w-5 h-5' }),
		description: 'Twitter Post',
	},
	{
		label: 'Social Media Square',
		width: 1080,
		height: 1080,
		icon: React.createElement(IconBrandInstagram, { className: 'w-5 h-5' }),
		description: 'Instagram post',
	},
	{
		label: 'Social Media Story',
		width: 1080,
		height: 1920,
		icon: React.createElement(FileImage, { className: 'w-5 h-5' }),
		description: 'Instagram/Facebook story',
	},
	{
		label: 'Instagram Story',
		width: 1080,
		height: 1920,
		icon: React.createElement(IconBrandInstagram, { className: 'w-5 h-5' }),
		description: 'Instagram Story',
	},
	{
		label: 'Instagram Post',
		width: 1080,
		height: 1080,
		icon: React.createElement(IconBrandInstagram, { className: 'w-5 h-5' }),
		description: 'Instagram Post',
	},
	{
		label: 'LinkedIn Cover',
		width: 1584,
		height: 396,
		icon: React.createElement(IconBrandLinkedin, { className: 'w-5 h-5' }),
		description: 'LinkedIn Cover',
	},
	{
		label: 'Pinterest',
		width: 735,
		height: 1102,
		icon: React.createElement(IconBrandPinterest, { className: 'w-5 h-5' }),
		description: 'Pinterest Pin',
	},
];

// Helper function to find size by label
export const getSize = (label: string): SizeItem | undefined => {
	return Sizes.find((item) => label === item.label);
};
