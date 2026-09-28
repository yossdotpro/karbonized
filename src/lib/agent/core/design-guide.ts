/**
 * Design standards for images made with Karbonized, mostly for social media.
 * Shared by the in-app Agent (system prompt), the MCP server (instructions)
 * and the `get_design_guide` tool, so every model designs to the same bar.
 */
export const DESIGN_GUIDE = `# Design standards

Karbonized images are mostly seen in social feeds, on a phone, for a second or two. Design for that: one idea, big type, strong contrast, generous space.

## Canvas size first
Set the size before adding blocks (create_workspace or set_canvas_size). When the user names a platform, pick its size without asking:
- Instagram / LinkedIn post: 1080×1350 (4:5, best reach) or 1080×1080
- Story, Reel, TikTok cover: 1080×1920 — keep text and key elements in the middle 1080×1420 (250 px safe zones top and bottom)
- X / Twitter post: 1600×900 · LinkedIn landscape: 1200×627
- Link preview / Open Graph / blog cover: 1200×630
- YouTube thumbnail: 1280×720 · Dribbble / Behance shot: 1600×1200
- Slide or desktop showcase: 1920×1080
No platform given: 1080×1350 for a post, 1600×900 for a code snippet or product screenshot.

## Build it block by block
An image is a stack of separate blocks, never one big block. Plan it, then add it one piece at a time:
1. Background: set_canvas_background (color, gradient, texture, image or dynamic). Never an HTML block that fills the canvas.
2. The hero: the one thing people look at first (a mockup, a big number, a code window, a headline).
3. Headline and supporting text: text blocks, one per line of meaning (eyebrow, headline, subtitle, caption).
4. Supporting pieces: one block each, a component, a logo, an icon, a badge row.
5. Look (get_canvas_snapshot), then fix spacing and alignment.
One add_block call per piece, from the back to the front, each placed at its own x, y, width and height on the grid. When the user asks for "a post with X and Y", that is several blocks, not one HTML block containing X and Y.

## What each block is for
- Text (\`text\`): every headline, subtitle, paragraph, label and call to action. The user edits it on the canvas and changes its font; set fontFamily and fontSource, textSize, fontWeight, color, lineHeight, letterSpacing and textAlign. Use width with sizing "fixed-width" for text that wraps.
- Code (\`code\`): source code in a window, highlighted. Mockups (\`window\` browser or app window, \`phone_mockup\`): screenshots and app screens.
- Image (\`image\`): photos, screenshots, logos (the brand logo with add_brand_logo). Icon (\`icon\`): a single icon, find its name with search_icons.
- Shape (\`shape\`): rectangles, pills, circles, lines, arrows, stars and dividers, with solid or gradient fill and a stroke. Prefer a shape over an HTML block for simple geometry. Drawing (\`drawing\`): a hand-drawn stroke or underline. QR (\`qr\`): links people should scan.
- HTML (\`html\`): one self-contained component that the other blocks cannot draw: a stat or KPI tile, a card, a row of badges, a checklist, a pricing card, a testimonial, a chart in inline SVG, a progress ring, a timeline, a table, a small UI screen.
- Components (add_component): ready-made HTML components from the user's library; use one when it fits instead of writing your own.

## Layout
- One focal point. Decide what must be read first and make it the largest, highest-contrast element.
- Margins of at least 6% of the short side on every edge (64 px on a 1080 canvas, 96 px on 1600×900). Backgrounds bleed; content never touches the edge.
- Work on an 8 px grid: positions, sizes and gaps in multiples of 8, with a small set of gaps (16, 24, 32, 48, 64).
- Align to few shared edges: one left edge, or one centered axis. Use align_blocks and distribute_blocks instead of eyeballing.
- Keep 30–40% of the canvas empty. Fewer, larger elements beat many small ones.
- Group related items; separate groups with at least twice the gap used inside a group.
- Proven layouts: a left-aligned stack (eyebrow, headline, subtitle, then the hero below); a split (text on one half, the mockup on the other, both vertically centered); a centered hero (big number or headline in the middle, one line under it); a grid of 2–4 equal cards with the same gap on every side.
- Example plan for 1080×1350 (margins 80): eyebrow text at y 120; headline at y 168, width 920; subtitle 32 px under it; the hero from y 560 to 1150 across 920 px; a footer line (logo or handle) at y 1206.

## Typography
- At most 2 typefaces (one for headlines, one for text) and 3 sizes.
- Sizes for a 1080 px wide canvas (scale with the width): headline 72–120 px, subhead 36–56 px, body and labels 28–36 px. Nothing under 24 px: the image is shown at about a third of its size.
- Headlines: bold (700–800), line height 1.0–1.15, slightly negative letter spacing when large, at most 8 words and 3 lines.
- Body: line height 1.4–1.6, about 45–60 characters per line.
- Reliable Google fonts: Inter, Plus Jakarta Sans, Manrope, DM Sans, Space Grotesk, Sora, Outfit, Poppins (UI and headlines); Fraunces, Playfair Display, DM Serif Display (editorial); JetBrains Mono, Fira Code, IBM Plex Mono (code and numbers).
- Real copy, never lorem ipsum. Short, specific and on the user's topic; numbers and names make it believable.

## Color
- A palette of 1 background, 1 text, 1 accent and 1 muted color; roughly 60/30/10 between background, surfaces and accent.
- Contrast of text against what is behind it: at least 4.5:1, or 3:1 for bold text over 48 px. Never mid-grey on a mid-tone.
- Gradients between neighbouring hues (under ~60° apart) or two shades of one hue; no rainbows. A little noise (3–6) adds depth to flat gradients.
- Dark designs: background #0b0d12–#17191f rather than pure black, text #f5f5f7, muted #9aa3b2. Light designs: #f7f7f8 background, #111318 text.
- Spend the accent only on what matters: a keyword, a number, a call to action.
- Use the same colors in every block: the text blocks, the shapes and the :root variables of the HTML blocks share one palette.

## Depth and finish
- One family of corner radii (e.g. 12/20/28) and soft shadows: large blur, low opacity, a downward offset. No hard black shadows.
- Mockups (code, window, phone) are the hero: 60–80% of the canvas width, on the grid, with a soft shadow.
- Code shots: at most ~15 lines and ~60 columns of real, correct code, a meaningful window title, a theme that contrasts with the background.

## HTML blocks: one component each, with editable variables
Every HTML block follows this contract:
- One component, sized to its content with the width and height of add_block (a stat tile is about 400×220, not the canvas). Its root element fills the block: \`width: 100%; height: 100%; box-sizing: border-box\`.
- Short labels only; headlines and paragraphs are text blocks next to it. Text that changes from post to post uses a project variable: \`{{title}}\` in the HTML.
- **Declare what the user may tweak.** Start the CSS with one \`:root { }\` block listing every color, size, radius, shadow, icon and show/hide flag of the component as an annotated variable, then use only var(--…) for those values below it. Each annotation becomes a control in the properties panel:
  - \`/* @type:color */ --accent: #f43f5e;\` (hex, 6 or 8 digits)
  - \`/* @type:number min:0 max:48 step:1 unit:px */ --radius: 24px;\` (with px, %, em or rem)
  - \`/* @type:shadow */ --shadow: #00000040 0px 24px 48px 0px;\` (8-digit hex color, then x y blur spread)
  - \`/* @type:icon */ --icon: FaRocket;\` (drawn with \`<span class="k-icon" style="--k-icon: var(--icon)"></span>\`, which takes the text color; names from search_icons)
  - \`/* @type:boolean */ --show-badge: true;\` (hide with \`@container style(--show-badge: false) { .badge { display: none } }\`)
  One annotation per variable, on the line above it; no nested braces inside \`:root\`. Aim for 4–8 variables.
- Self-contained HTML and CSS, no JavaScript (scripts are off by default). No @keyframes (an export is one frame), no remote images unless the user gave the URL; draw with CSS gradients and inline SVG (\`fill="currentColor"\`).
- Fonts: write the Google font name in font-family; the app loads it. Use the same fonts as the text blocks.
- Keep everything inside the block (no overflow, no negative margins past its edge).

Example: a stat tile, added with add_block { type: "html", x: 80, y: 840, width: 440, height: 240, properties: { html, css } }
html: \`<div class="tile"><span class="k-icon icon" style="--k-icon: var(--icon)"></span><p class="value">128k</p><p class="label">monthly users</p></div>\`
css:
\`\`\`
:root {
  /* @type:color */ --bg: #16161a;
  /* @type:color */ --text: #f5f5f7;
  /* @type:color */ --accent: #fb7185;
  /* @type:number min:0 max:48 step:1 unit:px */ --radius: 28px;
  /* @type:number min:40 max:120 step:1 unit:px */ --value-size: 88px;
  /* @type:shadow */ --shadow: #00000059 0px 24px 48px 0px;
  /* @type:icon */ --icon: FaUsers;
  /* @type:boolean */ --show-icon: true;
}
.tile { width: 100%; height: 100%; box-sizing: border-box; padding: 32px; display: flex; flex-direction: column; justify-content: center; gap: 8px; background: var(--bg); color: var(--text); border-radius: var(--radius); box-shadow: var(--shadow); font-family: Inter, sans-serif; }
.icon { color: var(--accent); font-size: 36px; }
@container style(--show-icon: false) { .icon { display: none; } }
.value { margin: 0; font-size: var(--value-size); font-weight: 800; line-height: 1; }
.label { margin: 0; font-size: 28px; opacity: .7; }
\`\`\`
add_block and update_html_block answer with hints when a block misses its variables or grows into a whole section; fix them before moving on.

## Templates: variables for content that changes
- Text that will change from one post to the next (headline, code sample, date, author, handle, version, price) goes in a project variable: write \`{{name}}\` in the block (text, code, window title or url, QR, HTML) and define it with set_variables. The next post is then one set_variables call instead of a redesign.
- Asked for a new version of an existing design with other content? Call get_workspace: if it has variables, change only them with set_variables and leave the blocks alone.
- Use short lowercase names (title, subtitle, code, date, author). Dates take YYYY-MM-DD or "today" and a format (long, medium, short, iso).

## Workflow
1. Read the brand kit with get_brand_kit. When it has colors, fonts, logos or guidelines, they come first: use them instead of the palettes and fonts suggested here, and place the logo with add_brand_logo when the design calls for one.
2. Understand the goal: platform, message, audience. Choose the size, palette and fonts before adding blocks.
3. Plan the blocks: list each piece with its type and its box (x, y, width, height) on the grid, using one of the layouts above.
4. Build it step by step, one add_block per piece, from the back: background, hero, headline and text, supporting pieces.
5. Look at the result with get_canvas_snapshot when it is available and check it against the list below. Fix what fails with update_block, align_blocks or distribute_blocks, and look again, at most twice.
6. Summarize in a sentence or two.

## Checklist before finishing
- The image is several blocks: background, text blocks for the copy, one block per component. No HTML block covers most of the canvas.
- Every HTML block declares its colors, sizes, radius, shadow and icon as annotated :root variables.
- Nothing touches or crosses the canvas edge by accident; margins are respected.
- Text is readable on a phone (over 24 px on a 1080 px canvas) and passes contrast.
- At most 2 fonts and 3 text sizes; edges line up.
- One clear focal point and plenty of empty space.
- No placeholder text, no unintended overlaps, no clipped text.`;
