# Icons and icon libraries

Karbonized has one icon registry, `src/lib/icons/icons.ts`. Everything that
shows an icon reads it:

- the **Icon block** (its `icon` property),
- **`@type:icon` variables** of HTML blocks and `.kcomponent` files,
- **Agent and the MCP server** (`search_icons`, and the `icon` property of
  icon blocks).

An icon is saved by **name only**, for example `FaRocket` or `FaGithub`. Each
set has its own prefix, so a name says which set it comes from and projects
never store the set separately.

## The set that ships with the app

| Set | Prefix | License |
|---|---|---|
| Font Awesome | `Fa` | CC BY 4.0 |

It loads as its own chunk the first time an icon is shown or the picker opens.
The registry is built for more sets (see the last section), but the app ships
only this one.

## Using icons in your own components

Declare the icon as a variable and draw it with the `.k-icon` helper:

```css
:root {
  /* @type:icon */
  --feature-icon: FaRocket;
  /* @type:color */
  --accent: #f43f5e;
}

.badge {
  color: var(--accent);       /* the icon color */
  font-size: 32px;            /* the icon size */
}
```

```html
<span class="badge">
  <span class="k-icon" style="--k-icon: var(--feature-icon)"></span>
</span>
```

- The properties panel shows an icon picker for every `@type:icon` variable.
- When the block renders, the name is replaced by the image of the icon, so
  `var(--feature-icon)` works anywhere CSS takes an image. `.k-icon` uses it as
  a **mask**: the icon takes `color` and the `font-size` (it is `1em` square).
- You can also use it directly:
  `mask: var(--feature-icon) center / contain no-repeat; background: currentColor;`
- It works without scripts and exports like the rest of the block.
- Quote the name or not: `--icon: FaRocket;` and `--icon: "FaRocket";` are the
  same.

The **Feature Card** in the starter pack (`src/assets/kcomponents/feature-card.kcomponent`)
is a complete example.

## Making an icon library as components

When you want your own drawings (a product's icon set, custom pictograms), you
do not need to touch the app: ship them as `.kcomponent` files.

1. **One component per icon family, variables for the choice.** Put the SVGs
   inline in the HTML and show one with a `@var`:

   ```yaml
   manifest:
     name: "Acme Icons"
     author: "Acme"
     category: "Icons"
     width: 96
     height: 96
     tags: ["icons", "acme"]

   html: |
     <div class="icon" data-icon="cloud">
       <svg data-name="cloud" viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.5 3.5 0 0 0 7 18z"/></svg>
       <svg data-name="bolt" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>
     </div>

   css: |
     :root {
       /* @type:color */
       --color: #111318;
     }
     .icon { width: 100%; height: 100%; display: flex; }
     .icon svg { width: 100%; height: 100%; fill: var(--color); display: none; }
     .icon[data-icon="cloud"] svg[data-name="cloud"],
     .icon[data-icon="bolt"] svg[data-name="bolt"] { display: block; }

   js: |
     // @var icon:string = "cloud"
     htmlBlockAPI.root.querySelector('.icon').dataset.icon = icon;
   ```

   The markup already shows a default icon, so the block looks right with
   scripts off; with scripts on, the `icon` field switches it.

2. **Or one component per icon** when you have a few: simplest to browse in
   the library, and each one gets its own thumbnail.

3. Keep SVGs on a `0 0 24 24` view box with `fill` or `stroke` set from a CSS
   variable, so they recolor from the panel.

4. Tag them (`icons`, the family name) so they are easy to find, and export
   the set with **Export** in the component library to share it.

## Adding a set to the app

For a set every user should have (a new family for the Icon block and for
`@type:icon`), add it to the registry.

1. **Pick a source.** The easiest is a pack of
   [`react-icons`](https://react-icons.github.io/react-icons/), already a
   dependency (`react-icons/tb` for Tabler, `react-icons/hi2` for Heroicons…).
   Any module whose exports are React components named with a common prefix
   works the same way.

2. **Add an entry to `ICON_SETS`** in `src/lib/icons/icons.ts`:

   ```ts
   {
     id: 'tabler',
     name: 'Tabler',
     prefix: 'Tb',
     license: 'MIT',
     url: 'https://tabler.io/icons',
     load: () => import('react-icons/tb'),
   },
   ```

   - `prefix` must be unique among the sets and must be the start of every
     icon name in the module (`TbRocket`). The registry keeps only exports that
     start with it.
   - `load` must be a dynamic `import()` so the set becomes its own chunk.
   - The order of `ICON_SETS` is the order of the picker tabs; the first one
     is the default tab.

3. **Your own SVGs as a set.** Write a module that exports components named
   with your prefix and point `load` at it:

   ```tsx
   // src/lib/icons/sets/acme.tsx
   import type { SVGProps } from 'react';

   const icon = (path: string) =>
     ({ size = '1em', ...props }: SVGProps<SVGSVGElement> & { size?: string | number }) => (
       <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...props}>
         <path d={path} />
       </svg>
     );

   export const AcCloud = icon('M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.5 3.5 0 0 0 7 18z');
   export const AcBolt = icon('M13 2 4 14h7l-1 8 9-12h-7z');
   ```

   ```ts
   { id: 'acme', name: 'Acme', prefix: 'Ac', license: 'Proprietary', url: 'https://acme.example', load: () => import('./sets/acme') },
   ```

   Components must accept `size`, `className` and `style`, and paint with
   `currentColor`, so they follow the icon color in blocks, masks and exports.

4. **Check it:**
   - `yarn test src/lib/icons` (the registry test checks that prefixes are
     unique; add a case for one of your names in `icons.test.ts`),
   - open the Icon block picker and the new tab,
   - ask Agent to `search_icons` in the new set (its id appears in the tool
     description automatically).

5. **Mind the license** of the set, and the size: a big pack only costs
   download time the first time its tab is opened, but it is still shipped in
   the desktop app.

Never rename or remove a set that has shipped: projects store icon names, and a
name without a set falls back to the Font Awesome logo.
