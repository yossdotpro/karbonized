import { parseCSSVariables } from '@/lib/blocks-api/css-parser';
import { CSS_ANNOTATION } from './html-contract';

/**
 * Feedback on an HTML block a model just wrote, returned with the tool
 * result so the model fixes it in the same turn. HTML blocks are for one
 * component each, with its tweakable values declared as panel controls; a
 * block that holds the whole image, or declares nothing, is the common way
 * models get this wrong.
 */

/** Share of the canvas area above which an HTML block is a whole section. */
const MAX_AREA_SHARE = 0.45;
/** Words of visible text above which the block is doing the text blocks' job. */
const MAX_WORDS = 40;

const visibleWords = (html: string): number =>
	html
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&[a-z#0-9]+;/gi, ' ')
		.split(/\s+/)
		.filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

export const htmlBlockHints = (input: {
	html: string;
	css: string;
	box?: { width: number; height: number };
	canvas?: { width: number; height: number };
}): string[] => {
	const hints: string[] = [];
	const annotated = input.css.match(CSS_ANNOTATION)?.length ?? 0;
	const variables = parseCSSVariables(input.css).length;

	if (annotated === 0) {
		hints.push(
			variables === 0
				? 'This HTML block declares no variables, so the user cannot adjust it from the panel. Add a :root { } block with its colors, sizes, radius, shadow and icon as annotated variables (e.g. /* @type:color */ --accent: #f43f5e;) and use them with var(--accent) in the CSS. Fix it with update_html_block.'
				: 'The :root variables of this HTML block have no /* @type:… */ annotation, so the panel guesses their controls. Annotate each one (/* @type:color */, /* @type:number min:… max:… step:… unit:px */, /* @type:shadow */, /* @type:boolean */, /* @type:icon */) with update_html_block.',
		);
	} else if (annotated < 3) {
		hints.push(
			`Only ${annotated} value${annotated === 1 ? ' is' : 's are'} adjustable. Expose the rest of what a user would tweak (background, text and accent colors, radius, main size, shadow, icon, show/hide flags) as annotated :root variables.`,
		);
	}

	if (input.box && input.canvas) {
		const share =
			(input.box.width * input.box.height) /
			Math.max(1, input.canvas.width * input.canvas.height);
		if (share > MAX_AREA_SHARE) {
			hints.push(
				`This HTML block covers ${Math.round(share * 100)}% of the canvas. Build the image block by block instead: the background with set_canvas_background, headlines and paragraphs as text blocks, code as a code block, screenshots in window or phone blocks, and one HTML block per component (a card, a stat, a badge row, a chart), each sized to its content.`,
			);
		}
	}

	const words = visibleWords(input.html);
	if (words > MAX_WORDS) {
		hints.push(
			`This HTML block holds ${words} words of text. Put headlines and paragraphs in text blocks (editable on the canvas, with their own fonts) and keep only the short labels of the component in the HTML.`,
		);
	}

	return hints;
};
