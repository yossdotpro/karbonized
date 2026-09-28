import { DESIGN_GUIDE } from '../core/design-guide';

/**
 * Instructions the MCP server sends to clients (Claude Desktop, Claude Code,
 * Cursor…) when they connect. Clients that ignore them can still read the
 * same guide with the `get_design_guide` tool.
 */
export const MCP_INSTRUCTIONS = `Karbonized is an editor for social media graphics, code snippets and product mockups. The tools act on the project open in the Karbonized app; the user sees every change live and can undo each tool call.

- Call get_workspace before editing an existing design and use the block ids it returns. Coordinates are canvas pixels from the top-left.
- Read the user's brand kit with get_brand_kit before a new design and use its colors, fonts and logos (add_brand_logo).
- For a new design, set the canvas size first (create_workspace or set_canvas_size), then the background, then build it block by block: one add_block per piece (hero, each text, each component), never the whole image in one HTML block.
- Headlines and paragraphs are text blocks. Use an html block for one component native blocks cannot draw (a stat tile, a card, a badge row, a chart), sized to its content, and declare its colors, sizes, radius, shadow and icon as annotated :root variables (see the HTML block rules below). add_block and update_html_block answer with hints when a block breaks these rules.
- HTML blocks keep the look in annotated CSS variables and the content that repeats (list items, chart data, rows) in \`// @var\` JS variables rendered by the script, with the allow-scripts property true.
- Find icon names with search_icons; never guess them. Icon packs (.kcomponent files with type: icon-pack) add icons named <prefix>:<name>.
- The whole Google Fonts catalog is available: find families and their weights with search_fonts and pick them for the tone of the design (see Fonts below). Text blocks need fontSource "google".
- Look at the canvas with get_canvas_snapshot while you build (after the hero and headline, after each HTML block or font change), at the end and after every change to an existing design; fix what fails the checklist below.
- Designs can be templates: get_workspace lists project variables, and blocks show {{name}} as their value. To make a new version, change the values with set_variables instead of editing blocks.
- Only export an image when the user asks. export_image saves to the user's export folder without a dialog and returns the path; destination "return" gives you the image instead of saving it.

${DESIGN_GUIDE}`;
