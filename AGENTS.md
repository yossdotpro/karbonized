# AGENTS.md

## Purpose

This file summarizes how `karbonized` is organized so an agent or contributor can work on it quickly and safely.

## What This Project Is

Karbonized is a visual image/mockup editor built with React + Vite + TypeScript. The core app allows users to:

- create and edit visual workspaces
- add blocks such as text, code, images, shapes, QR codes, and custom components
- move, resize, rotate, crop, and warp blocks
- export the result as `png`, `jpeg`, or `svg`
- load packaged extensions as `.kext`

There is no in-app agent system in this project. The closest thing to an extensible architecture is the plugin/extension system.

## Main Stack

- Frontend: React 18, TypeScript, Vite
- Global state: Easy Peasy
- UI: Tailwind CSS v4, Radix UI, shadcn/ui (`src/components/ui/`), cmdk command palette
- Code editor: Monaco, bundled locally (`src/lib/monaco/setup.ts`)
- Canvas interaction: `react-moveable`, `react-infinite-viewer`
- Lightweight persistence: `localforage`
- Desktop: Electron, plus signs of Tauri/Capacitor integration
- Exporting: `html-to-image`

## Key Folders

- `src/`: main web/editor app
- `src/pages/`: main screens: `NewProject`, `Editor` and `BlockEditor` (HTML block code editor)
- `src/components/`: canvas, blocks, panels, modals, and reusable controls
- `src/stores/`: Zustand stores split by concern (`workspace-store`, `controls-store`, `history-store`, `ui-store`, …)
- `src/lib/commands/`: command registry and keyboard shortcuts (see below)
- `src/lib/persistence/autosave.ts`: session autosave/restore (IndexedDB)
- `src/utils/`: exporting, platform utilities, helper lists, and static data
- `src/models/Extension.ts`: TypeScript contract for extensions
- `docs/plugin_system.md`: functional documentation for the plugin system
- `src-electron/`: main process/preload for the Vite-based Electron variant
- `electron/`: additional/legacy Electron implementation based on Capacitor; do not assume both runtime paths are equally active without checking

## App Flow

1. `src/main.tsx` mounts `App` inside `StoreProvider`.
2. `src/App.tsx` initializes theme/context and lazy-loads `Editor`.
3. `src/pages/Editor.tsx` composes the main layout:
   - infinite viewer
   - workspace
   - left/right panels
   - status bar
4. `src/components/Workspace.tsx` renders the active canvas and connects `Moveable`.
5. Actual blocks are materialized through `ControlHandler` and the components in `src/components/Blocks/`.

## State Source of Truth

The source of truth is `src/stores/AppStore.ts`.

It contains:

- `workspaces`
- `currentWorkspaceID`
- `ControlProperties` and `initialProperties`
- selected control `currentControlID`
- history via `pastHistory` / `futureHistory`
- editing flags such as `drag`, `crop`, `warp`, `isDrawing`, `isErasing`

When changing editor behavior, check first whether the change should go through a store action instead of only using local React state.

## How the Editor Models Elements

- Each control has an id like `<type>-<random>`
- Many properties are stored as `History` entries with ids like `<controlId>-<property>`
- The active workspace holds the list of controls, but their properties live separately in `ControlProperties`

That means duplicating, importing, or deleting controls usually requires touching both layers:

- the controls list
- the associated properties

## Extension System

Extensions are not compiled into the repo; they are loaded at runtime through Electron.

Important touchpoints:

- `src/components/Panels/ExtensionsPanel.tsx` listens for IPC events and displays extensions
- `src/models/Extension.ts` defines the expected shape
- `docs/plugin_system.md` documents packaging
- `src-electron/main.ts` reads `.kext` files from `%APPDATA%/karbonized/extensions`

Expected extension structure:

```text
my-plugin/
  components/
    component1.jsx
    component1.json
    component1.png
  info.json
```

At runtime, the app consumes objects shaped like:

```ts
interface Extension {
  logo: string;
  info: {
    name: string;
    author: string;
    description: string;
    version: string;
  };
  components: Array<{
    properties: { name: string };
    code: string;
    image: string;
  }>;
}
```

## Exporting and Platforms

- `src/utils/Exporter.ts` exports `png`, `jpeg`, and `svg`
- On web, it downloads through a temporary `a` element
- On native environments, it uses Tauri APIs

The codebase contains mixed support for multiple targets:

- web/PWA
- Electron
- Tauri/Capacitor

Before refactoring platform integration, verify which runtime path is actually used by the target user flow.

## Useful Commands

- `yarn dev`: web development
- `yarn electron:dev`: desktop development with Electron
- `yarn build`: web build
- `yarn electron:build`: desktop build
- `yarn lint`: lint `src` (should report 0 errors)
- `yarn format`: run Prettier on `src`

## Practical Editing Conventions

- Prefer small, localized changes; editor state is fairly coupled.
- Review `AppStore.ts` before changing selection, duplication, undo/redo, or workspaces.
- For new block types, inspect `src/components/Blocks/` and `ControlHandler` first.
- For UI work, use the design tokens in `src/input.css` (`bg-background`, `bg-sidebar`, `border-border`, `text-muted-foreground`, …) and the `rounded-control` / `rounded-surface` radii. Do not change the generic radius scale or `font-block`: canvas blocks use them and exported images would change.
- Monaco themes mirror the tokens in `src/lib/theme/editor-theme.ts`; keep both in sync.
- Shortcuts and command palette entries are registered with `useCommands()` from `src/lib/commands/registry.ts`. Do not add `window.addEventListener('keydown')` handlers; a single handler dispatches every shortcut and skips inputs, Monaco and open overlays unless `allowInInput` is set.
- Restored block properties go through `initialProperties` (consumed by `useControlState` on mount), not `ControlProperties`.
- Use the `@/` alias when the surrounding file already follows that pattern; the repo mixes relative imports and alias-based imports.
- Do not assume commented-out code is dead; some features are in transition, especially templates and desktop runtimes.

## Visible Risks and Technical Debt

- Two Electron areas coexist: `electron/` and `src-electron/`
- `react-hooks` React Compiler rules (`set-state-in-effect`, `immutability`, `refs`) are warnings: existing code still has those patterns
- Part of the templates/community system is commented out or incomplete
- The central store is large and mixes many responsibilities
- There does not appear to be an automated test suite in the repo
- TypeScript is pinned to 6.0 because typescript-eslint does not support TS 7 yet

If you make deep changes, manually validate at least:

- block selection
- drag/resize/rotate
- undo/redo
- workspace switching
- exporting
- extension loading if the change touches desktop/IPC behavior

## Recommendation for Future Agents

Before implementing a feature or fixing a bug:

1. identify whether the problem lives in layout, block rendering, workspace logic, or store logic
2. confirm whether it affects web, Electron, or both
3. check whether a store action or similar pattern already exists
4. then edit the UI

Most of the fragile bugs in this repo are likely not in the visible JSX itself, but in synchronization between:

- `workspaces`
- `ControlProperties`
- `currentControlID`
- editing history
