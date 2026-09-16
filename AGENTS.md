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

The app includes **Beedly**, an in-app AI assistant, and a local **MCP server** in the Electron app; both use the same editor tools (see "Beedly and MCP" below). Besides that, the extensible part of the app is the plugin/extension system.

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
- `src/lib/editor/`: editor actions with arguments (`actions.ts`) and undo/redo helpers (`history.ts`)
- `src/lib/blocks/registry.tsx`: which block types exist in the editor (label, icon, component). The toolbar, the canvas and the hierarchy icons read it
- `src/lib/blocks/catalog.ts`: what each block type stores: properties, defaults and size limits
- `src/lib/canvas/placement.ts`: where a new block lands (the middle of the visible canvas, stepping aside from the blocks already there)
- `src/lib/canvas/drawing.ts`, `stroke.ts`, `nodes.ts`, `rulers.ts`: the geometry behind the tools that draw — the box of a drag, the curve and the variable width of a brush stroke, the points of a stroke, and the ticks of a ruler. All pure and covered by tests
- `src/stores/ui-store.ts`: `activeTool` says what a drag on the canvas does (`select`, `pan`, `crop`, `warp`, `draw`, `brush`, `nodes`, `eraser`) and holds the settings of the brush. `src/components/Workspace.tsx` renders one layer per tool over the canvas
- `src/lib/beedly/`: Beedly assistant (tools, provider adapters, agent loop, settings, conversations) and the renderer side of the MCP server
- `src/components/Beedly/`: Beedly panel, settings dialog and MCP settings
- `src/utils/`: exporting, platform utilities, helper lists, and static data
- `src/models/Extension.ts`: TypeScript contract for extensions
- `docs/plugin_system.md`: functional documentation for the plugin system
- `src-electron/`: main process/preload for the Vite-based Electron variant, including `beedly/` (API keys, provider requests) and `mcp/` (MCP server and stdio bridge)
- `scripts/install-electron.cjs`: postinstall that downloads the Electron binary (Yarn 4 skips dependency install scripts)
- `scripts/update-google-fonts.mjs`: regenerates `src/lib/fonts/google-fonts.ts` from the public Google Fonts catalog (no key). Run it to refresh the families the text block offers
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
5. Actual blocks are materialized through `ControlHandler`, which renders the component the block registry gives for the type (`src/components/Blocks/`).

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

## Beedly and MCP

Beedly (assistant panel, `Mod+L`) and the MCP server share one set of tools. Full user and contributor docs: `docs/beedly.md`.

- **Tools** (`src/lib/beedly/tools/`): `defineTool` with a zod schema (validation + JSON Schema for providers and MCP). `executeTool` runs mutating tools synchronously inside `useHistoryStore.getState().transaction()`, waits for the canvas to re-render, then folds every step recorded during the call into one undo step.
- **Editor actions** (`src/lib/editor/actions.ts`): add/update/delete/select/align blocks, HTML block code, canvas settings, workspaces. Use them instead of touching stores from tools or new UI. Blocks that have not mounted yet receive properties through `initialProperties`; mounted blocks through `ControlProperties` plus a history batch.
- **History**: batch entries can mix property changes, `workspace-structure-*` snapshots and `workspace-settings-*` snapshots. Apply undo/redo with `undo()`/`redo()` from `src/lib/editor/history.ts`, which handles all of them.
- **Block catalog** (`src/lib/blocks/catalog.ts`): mirrors the `useControlState` keys and defaults of each block. Update it when a block gains or renames a property.
- **Component library** (`src/lib/beedly/tools/components.ts`): `list_components`, `import_component`, `add_component`, `export_component` and `load_starter_pack` read and write the `.kcomponent` library (`src/stores/kcomponent-store.ts`, persisted) and put components on the canvas through `addBlock`. Adding one goes through `kcomponentBlockInput()` so an empty `css`/`js` section does not fall back to the demo content of a blank HTML block.
- **Command allowlist** (`src/lib/beedly/tools/commands.ts`): `run_command` only runs `edit.*`, `arrange.*`, `view.*` and individually vetted ids. `tools.*` stays out on purpose (a model cannot drag on the canvas, so picking a tool would only strand the editor in a mode); dialogs, saving and `workspace.clean` stay out too. Widen it there, with the reason in the comment.
- **Providers** (`src/lib/beedly/providers/`): pure adapters (Anthropic Messages, OpenAI Chat Completions, Gemini) that build requests and parse SSE streams; presets add base URLs and hints. The UI never depends on the provider.
- **Transports**: the web uses `fetch` from the page (the provider must allow CORS). Electron sends requests from the main process (`src-electron/beedly/http.ts`), which adds the API key; keys are encrypted with `safeStorage` and bound to the origin they were saved for. Never log requests, headers or keys; use `redactSecrets()` for error text.
- **MCP server** (`src-electron/mcp/server.ts`): Streamable HTTP on 127.0.0.1, stateless, bearer token, Host/Origin checks. Tool calls are forwarded over IPC to the renderer (`src/lib/beedly/mcp/renderer.ts`, mounted in `App.tsx` on desktop). `mcp-stdio.cjs` bridges stdio clients (Claude Desktop) to it and is unpacked from the asar archive.
- Tests for tools, adapters (recorded streams), the agent loop, history transactions and MCP request checks live next to the code.

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
- `yarn test`: run the Vitest unit tests
- `yarn lint`: lint `src` (should report 0 errors)
- `yarn format`: run Prettier on `src`

## Practical Editing Conventions

- Prefer small, localized changes; editor state is fairly coupled.
- Review `AppStore.ts` before changing selection, duplication, undo/redo, or workspaces.
- A new block type needs three things: its component in `src/components/Blocks/`, an entry in `src/lib/blocks/registry.tsx` (label, icon, component) and one in `src/lib/blocks/catalog.ts` (its properties and sizes). The toolbar, the canvas and Beedly follow from those.
- For UI work, use the design tokens in `src/input.css` (`bg-background`, `bg-sidebar`, `border-border`, `text-muted-foreground`, …) and the `rounded-control` / `rounded-surface` radii. Do not change the generic radius scale or `font-block`: canvas blocks use them and exported images would change.
- Monaco themes mirror the tokens in `src/lib/theme/editor-theme.ts`; keep both in sync.
- Shortcuts and command palette entries are registered with `useCommands()` from `src/lib/commands/registry.ts`. Do not add `window.addEventListener('keydown')` handlers; a single handler dispatches every shortcut and skips inputs, Monaco and open overlays unless `allowInInput` is set.
- Restored block properties go through `initialProperties` (consumed by `useControlState` on mount), not `ControlProperties`.
- `useControlState` applies each history entry in `controlState` once (when it changes) and saves the local value only when it changes. Don't rely on `controlState` being re-applied later.
- Blocks can size themselves from their content with `ControlTemplate`'s `autoSize` (`both` or `height`); the measured size is written to the store, never to the local state. Text blocks use it through their `sizing` property (`auto`, `fixed-width`, `fixed`, see `src/lib/blocks/text-sizing.ts`), and resizing them with Moveable switches the mode in the same undo step.
- Use the `@/` alias when the surrounding file already follows that pattern; the repo mixes relative imports and alias-based imports.
- Do not assume commented-out code is dead; some features are in transition, especially templates and desktop runtimes.

## Visible Risks and Technical Debt

- Two Electron areas coexist: `electron/` and `src-electron/`
- `react-hooks` React Compiler rules (`set-state-in-effect`, `immutability`, `refs`) are warnings: existing code still has those patterns
- Part of the templates/community system is commented out or incomplete
- The central store is large and mixes many responsibilities
- Unit tests (Vitest, jsdom) live next to the code as `*.test.ts`; they cover shortcuts, commands, viewer helpers, block parsers and `.kcomponent` files, not React components or canvas interactions
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
