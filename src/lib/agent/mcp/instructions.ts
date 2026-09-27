import { DESIGN_GUIDE } from '../core/design-guide';

/**
 * Instructions the MCP server sends to clients (Claude Desktop, Claude Code,
 * Cursor…) when they connect. Clients that ignore them can still read the
 * same guide with the `get_design_guide` tool.
 */
export const MCP_INSTRUCTIONS = `Karbonized is an editor for social media graphics, code snippets and product mockups. The tools act on the project open in the Karbonized app; the user sees every change live and can undo each tool call.

- Call get_workspace before editing an existing design and use the block ids it returns. Coordinates are canvas pixels from the top-left.
- For a new design, set the canvas size first (create_workspace or set_canvas_size), then the background, then blocks.
- Use html blocks (HTML + CSS) for anything native blocks cannot express: cards, stat tiles, badges, icon lists, charts, testimonials, UI screens.
- Find icon names with search_icons; never guess them. Icon packs (.kcomponent files with type: icon-pack) add icons named <prefix>:<name>.
- Check the result with get_canvas_snapshot and fix what fails the checklist below.
- Designs can be templates: get_workspace lists project variables, and blocks show {{name}} as their value. To make a new version, change the values with set_variables instead of editing blocks.
- Only export an image when the user asks. export_image saves to the user's export folder without a dialog and returns the path; destination "return" gives you the image instead of saving it.

${DESIGN_GUIDE}`;
