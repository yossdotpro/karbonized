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

## Layout
- One focal point. Decide what must be read first and make it the largest, highest-contrast element.
- Margins of at least 6% of the short side on every edge (64 px on a 1080 canvas, 96 px on 1600×900). Backgrounds bleed; content never touches the edge.
- Work on an 8 px grid: positions, sizes and gaps in multiples of 8, with a small set of gaps (16, 24, 32, 48, 64).
- Align to few shared edges: one left edge, or one centered axis. Use align_blocks and distribute_blocks instead of eyeballing.
- Keep 30–40% of the canvas empty. Fewer, larger elements beat many small ones.
- Group related items; separate groups with at least twice the gap used inside a group.

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

## Depth and finish
- One family of corner radii (e.g. 12/20/28) and soft shadows: large blur, low opacity, a downward offset. No hard black shadows.
- Mockups (code, window, phone) are the hero: 60–80% of the canvas width, on the grid, with a soft shadow.
- Code shots: at most ~15 lines and ~60 columns of real, correct code, a meaningful window title, a theme that contrasts with the background.

## HTML blocks — for everything native blocks do not do well
Use an \`html\` block for composed UI: stat and KPI tiles, feature cards and grids, pills and badges, checklists and icon lists, pricing cards, testimonials and fake posts, charts as inline SVG, progress bars and rings, timelines, comparison tables, app screens, wordmarks, decorative backgrounds (SVG patterns, blobs, grids).
- Self-contained HTML and CSS. No JavaScript unless something has to be computed: scripts are off by default and the design must look finished without them.
- The root element fills the block (\`width: 100%; height: 100%\`, the block is a flex container). Give the block the size of its content with the width and height of add_block.
- Put every value a user may tweak in one \`:root { }\` block, annotated so the properties panel shows controls:
  \`/* @type:color */ --accent: #f43f5e;\` · \`/* @type:number min:0 max:64 step:1 unit:px */ --radius: 24px;\` · \`/* @type:shadow */ --shadow: #00000040 0px 24px 48px 0px;\` · \`/* @type:boolean */ --show-badge: true;\`
  Colors in hex, shadows with 8-digit hex, numbers with px, %, em or rem. No nested braces inside \`:root\`.
- Icons: put the icon in a \`/* @type:icon */ --my-icon: FaRocket;\` variable so the user can swap it from the panel (Font Awesome names, or \`<prefix>:<name>\` from an installed icon pack; find them with search_icons) and draw it with \`<span class="k-icon" style="--k-icon: var(--my-icon)"></span>\`, which takes the text color. Shapes no icon set has: inline SVG with \`fill="currentColor"\`.
- Fonts: write the Google font name in font-family; the app loads it.
- No @keyframes or animations (an export is a single frame), no remote images unless the user gave the URL; prefer CSS gradients and inline SVG.
- Keep text as text so it stays editable, and keep it inside the block (no overflow).

## Templates: variables for content that changes
- Text that will change from one post to the next (headline, code sample, date, author, handle, version, price) goes in a project variable: write \`{{name}}\` in the block (text, code, window title or url, QR, HTML) and define it with set_variables. The next post is then one set_variables call instead of a redesign.
- Asked for a new version of an existing design with other content? Call get_workspace: if it has variables, change only them with set_variables and leave the blocks alone.
- Use short lowercase names (title, subtitle, code, date, author). Dates take YYYY-MM-DD or "today" and a format (long, medium, short, iso).

## Workflow
1. Read the brand kit with get_brand_kit. When it has colors, fonts, logos or guidelines, they come first: use them instead of the palettes and fonts suggested here, and place the logo with add_brand_logo when the design calls for one.
2. Understand the goal: platform, message, audience. Choose the size, palette and fonts before adding blocks.
3. Build from the back: background, hero element, headline, supporting elements.
4. Look at the result with get_canvas_snapshot when it is available and check it against the list below. Fix what fails and look again, at most twice.
5. Summarize in a sentence or two.

## Checklist before finishing
- Nothing touches or crosses the canvas edge by accident; margins are respected.
- Text is readable on a phone (over 24 px on a 1080 px canvas) and passes contrast.
- At most 2 fonts and 3 text sizes; edges line up.
- One clear focal point and plenty of empty space.
- No placeholder text, no unintended overlaps, no clipped text.`;
