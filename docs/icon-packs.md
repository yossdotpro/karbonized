# Icon packs

An **icon pack** is a `.kcomponent` file that holds a set of SVG icons instead
of an HTML component. Anyone can make one, share the file, and anyone who
imports it gets its icons everywhere in Karbonized:

- in the **component library**, where the pack shows its icons and a click
  puts one on the canvas as an Icon block,
- in the **Icon block**, whose picker has a tab per installed pack,
- in **components** (`.kcomponent` and HTML blocks), through
  `/* @type:icon */` variables, which only offer icons from packs,
- for **Agent and MCP clients**, through `search_icons`.

Karbonized does not ship icon packs of its own: they come from creators.

## The file

```yaml
manifest:
  name: "Acme Icons"          # required
  type: icon-pack             # required: this is what makes it a pack
  prefix: acme                # icons are named acme:<icon>; defaults to the name as a slug
  author: "Acme Studio"
  version: "1.0.0"
  license: "MIT"              # shown in the library and the picker
  description: "Line icons for product launches."
  category: "Icons"
  tags: ["icons", "line"]

icons:
  cloud: |
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.5 3.5 0 0 0 7 18z"/>
    </svg>
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>'
```

`html`, `css` and `js` are not used by packs. Every other manifest field
works as it does for components (see [`kcomponent-format.md`](kcomponent-format.md)),
including `thumbnail`; without one, the library shows the first icons.

### Names

- **Icon names**: lowercase letters, digits and dashes (`arrow-right`,
  `chart-bar-2`), up to 64 characters. Other names are skipped with a warning.
- **Prefix**: starts with a letter, then lowercase letters, digits and dashes,
  up to 32 characters. An icon is stored in designs as `prefix:name`
  (`acme:cloud`), so:
  - two installed packs cannot share a prefix (the second import is refused),
  - **keep the prefix and the icon names stable across versions**: renaming
    either breaks every design that uses them. Add icons freely; do not rename
    or remove the ones you shipped.

### SVG rules

Each icon is one `<svg>` element:

- **A `viewBox` is required** (or `width` and `height`, from which one is
  made). The size is decided where the icon is used, so `width` and `height`
  are removed.
- **Use `currentColor`** for `fill` and `stroke` if the icon should take the
  color the user picks. Icons with fixed colors keep them (multicolor icons are
  fine) in the Icon block; in components they are used as a mask, where only
  the shape counts.
- Allowed elements: `svg`, `g`, `path`, `circle`, `ellipse`, `line`,
  `polyline`, `polygon`, `rect`, `defs`, `linearGradient`, `radialGradient`,
  `stop`, `clipPath`, `mask`, `use`, `symbol`, `title`, `desc`.
- Allowed attributes are the geometry and presentation ones (`d`, `points`,
  `fill`, `stroke-*`, `opacity`, `transform`, `clip-path`, gradients…).
  `href` only to an element of the same icon (`#id`).
- Everything else is **removed on import**: scripts, event handlers
  (`onload`…), `style` attributes and `<style>`, `<foreignObject>`, `<image>`,
  `<text>`, and any link or `url()` that leaves the icon. An icon that is left
  with nothing to draw is skipped.

### Limits

- Up to 2000 icons per pack, 16 KB per icon, 1 MB for the whole file (the
  library is stored in the browser).
- Bigger sets: split them into several packs (`acme-line`, `acme-solid`).

## Building a pack from a folder of SVGs

The repository has a script that turns a folder of SVG files into a pack:

```bash
yarn icon-pack ./my-icons --name "Acme Icons" --prefix acme \
  --author "Acme Studio" --license MIT --version 1.0.0 --out acme.kcomponent
```

- Each `*.svg` becomes an icon named after its file: `Arrow Right.svg` →
  `arrow-right`.
- It reports files it cannot use (not SVG, no `viewBox`, over 16 KB) and
  skips them; the app checks every icon again when the pack is imported.
- Run your SVGs through [SVGO](https://github.com/svg/svgo) first to keep the
  pack small, and export from Figma/Illustrator with strokes outlined or kept
  as `stroke="currentColor"`.

## Installing and using a pack

1. **File → Import components** (or drag the file onto the dialog). The
   preview says **Icon pack** and shows the prefix. Importing a newer version
   with the same name and author and **Replace** updates it in place.
2. **Component library**: the pack's card shows its first icons and **Browse**
   lists them all with a search; click one to add it to the canvas as an Icon
   block.
3. **Icon block**: the picker has a tab per installed pack.
4. **Components**: a `@type:icon` variable offers the icons of installed
   packs (see below).
5. **Export .kcomponent** in the library gives the pack back as a file, e.g.
   to share it.

Removing a pack removes its icons from the pickers; designs that used them
keep their names and show the icon again when the pack is imported.

## Using pack icons in your components

A component can let people pick an icon from their packs:

```css
:root {
  /* @type:icon */
  --feature-icon: acme:bolt;
}

.badge {
  color: var(--accent);   /* icon color */
  font-size: 32px;        /* icon size */
}
```

```html
<span class="badge">
  <span class="k-icon" style="--k-icon: var(--feature-icon)"></span>
</span>
```

- The panel shows an icon picker with the installed packs.
- When the block renders, the name becomes the image of the icon.
  `.k-icon` (built into every HTML block) uses it as a mask: `1em` square,
  painted with the text color. You can also write
  `mask: var(--feature-icon) center / contain no-repeat; background: currentColor;`.
- It works without scripts and exports with the rest of the block.
- If the pack is not installed, the icon is simply not drawn. When you share a
  component that relies on a pack, say which one (in its `description`), or
  draw the default icon as inline SVG in the HTML and use the variable only to
  let people swap it.
