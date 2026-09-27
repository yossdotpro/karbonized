# Starter pack

Eight `.kcomponent` files that ship with Karbonized. They are the worked
examples of the format: every one is a real block you can drop on the canvas,
and between them they exercise every binding the properties panel knows how to
generate.

Load them from the component library's empty state ("Load starter pack"), or
import any single file from **File → Import components**.

| Component | Size | Shows off |
|---|---|---|
| Terminal Window | 640×260 | color, number and shadow variables; an action that edits the DOM |
| Commit Card | 540×180 | `@var` strings driving the markup; an action that regenerates the hash |
| Diff Viewer | 620×275 | `color-mix()` tinting from a `%` variable; an action that recounts rows |
| Stat Tile | 380×230 | an inline SVG sparkline; a delta whose colour follows direction × intent |
| Quote Card | 540×260 | a light surface; initials derived from a `@var` |
| Keyboard Shortcut | 400×150 | a variable-driven keycap row rebuilt from a single string |
| Progress Ring | 300×300 | a conic gradient driven by a `%` variable; an action that syncs the label |
| Chat Bubble | 440×230 | two speech bubbles with per-side styling from shared variables |

## House rules these files follow

They are written against how the HTML block actually renders, which is worth
knowing before you author your own:

- **Scripts are off by default.** Every component must look finished with no JS
  running. The `js` section only *re-applies* what the markup already says, so
  enabling scripts changes nothing visually until you edit a variable.
- **The block is mounted in a flex wrapper**, so the root element sets
  `width: 100%` and lets the manifest's `width`/`height` decide the box.
- **`:root` becomes `:host`.** Keep all annotated variables in one `:root`
  block, with no nested braces inside it.
- **Colors must be hex.** A `@type:color` value that is not `#rrggbb` gets a
  `#` glued to the front by the parser.
- **Numbers need a unit the parser knows**: `px`, `em`, `rem`, `%`, `vh`, `vw`,
  `vmin`, `vmax`, `ch`, `ex`, `in`, `cm`, `mm`, `pt`, `pc`. `deg` is *not* on
  that list — the progress ring uses `%` for exactly this reason.
- **No `@keyframes`.** The CSS scoper rewrites every selector it sees, and it
  would turn keyframe stops (`0%`, `from`) into selectors. Animations also
  export as a random frame, so they earn nothing in a still image.
- **Shadows use 8-digit hex**, e.g. `#00000073 0px 24px 48px 0px`, which is the
  format the shadow editor writes back.
- **Nothing is fetched at render time** — no remote fonts, images or scripts,
  so exports are identical offline.

See `docs/kcomponent-format.md` for the full format and `docs/kcomponent-guide.md`
for the authoring walkthrough.
