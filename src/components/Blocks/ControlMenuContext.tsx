import { createContext, useContext } from 'react';

/**
 * What the properties panel of a block needs to show and change it.
 *
 * The panel used to take all of this as props, which made every block pass
 * forty values through `ControlTemplate`. They travel in a context instead:
 * the template fills it in, the panel reads what it uses.
 */
export interface ControlMenuValue {
	id: string;
	controlID: string;
	shadowEditable: boolean;
	maskEditable: boolean;
	borderEditable: boolean;
	Masks: string[];
	controlPos?: { x: number; y: number };
	controlSize?: { w: number; h: number };
	/** The width or height was typed in the position panel. */
	onSizeInput?: (axis: 'w' | 'h') => void;
	/** In-plane rotation of the block, in degrees. */
	rotation: number;
	/** The block was warped, so its rotation lives inside a matrix. */
	warped: boolean;
	/** Turn the block to `degrees`, replacing any warp. */
	onRotate?: (degrees: number) => void;
	pastHistory: any[];
	setPastHistory: (value: any[]) => void;
	setFutureHistory: (value: any[]) => void;
	setControlState: (value: any) => void;
	setControlPos: (value: any) => void;
	setControlSize: (value: any) => void;
	setID: (value: string) => void;
	onDeleteControl: () => void;
	// Position
	flipX: boolean;
	setFlipX: (value: boolean) => void;
	flipY: boolean;
	setFlipY: (value: boolean) => void;
	zIndex: string;
	setzIndex: (value: string) => void;
	rotateX: number;
	setRotateX: (value: number) => void;
	rotateY: number;
	setRotateY: (value: number) => void;
	// Shadow
	shadowX: number;
	setShadowX: (value: number) => void;
	shadowY: number;
	setShadowY: (value: number) => void;
	shadowBlur: number;
	setShadowBlur: (value: number) => void;
	shadowColor: string;
	setShadowColor: (value: string) => void;
	// Border
	borderRadius: number;
	setBorderRadius: (value: number) => void;
	// Mask
	mask: string;
	setMask: (value: string) => void;
	maskRepeat: boolean;
	setMaskRepeat: (value: boolean) => void;
	// Filters
	blur: number;
	setBlur: (value: number) => void;
	brightness: number;
	setBrightness: (value: number) => void;
	contrast: number;
	setContrast: (value: number) => void;
	grayscale: number;
	setGrayscale: (value: number) => void;
	huerotate: number;
	setHueRotate: (value: number) => void;
	invert: number;
	setInvert: (value: number) => void;
	saturate: number;
	setSaturate: (value: number) => void;
	opacity: number;
	setOpacity: (value: number) => void;
	sepia: number;
	setSepia: (value: number) => void;
}

export const ControlMenuContext = createContext<ControlMenuValue | null>(null);

/** The block the properties panel is showing. */
export const useControlMenu = (): ControlMenuValue => {
	const value = useContext(ControlMenuContext);
	if (!value) {
		throw new Error('The block panel is only rendered inside a block.');
	}
	return value;
};
