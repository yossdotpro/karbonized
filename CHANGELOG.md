# Changelog

## Unreleased

### 🚀 Features

- **Beedly, the design assistant** (`Ctrl+L`): a side panel that edits the canvas from a description, with streaming answers, visible tool calls, stop, retry and chat history
- Beedly works with Anthropic, OpenAI, Google Gemini, OpenRouter, Ollama, LM Studio and any OpenAI-compatible server; providers, models and keys are set in **Beedly settings**
- API keys stay on the device: encrypted with the system keychain on desktop (and only sent to the base URL they were saved for), stored in the browser on the web
- Everything Beedly does in one response undoes in one step, with **Undo changes** under the response
- **Beedly** button in the status bar (shows when a response is in progress) and a **Beedly** menu in the menu bar: show or hide the panel, new chat, stop, switch model, settings and, in the desktop app, turn the MCP server on or off
- An **MCP** indicator in the status bar of the desktop app shows the server state and opens its settings
- **New blocks land where you are looking**: in the middle of the visible canvas, whatever the zoom or the panning, and stepping aside instead of piling up on the same spot
- **One active tool**: Select, Pan, Crop and Warp are now a single setting. Holding `Space` pans the canvas and releasing it goes back to the tool you were using, `Esc` leaves the current tool, and pressing a tool's button or shortcut again returns to Select
- **Rotation in degrees**: the Position panel takes the angle of the block as a number; a warped block shows a **Reset warp** button, and blocks report their angle even after being warped
- **Crops are proportional**: a crop is stored in percentages, so it follows the block when it is resized, the crop area can be dragged as a whole, and **Reset crop** in the block menu removes it
- **Fonts for text blocks**: pick any font installed on the machine or one of 65 Google Fonts, previewed in their own font in a searchable picker; Google families are fetched when needed and the exported image keeps them
- **Typography controls** for text: alignment (left, center, right, justified), weight (300–800), line height and letter spacing
- **Edit text on the canvas**: double click a text block to type in place; `Esc` (or clicking away) saves
- **Vector brush** (`B`): draw freehand on the canvas and the stroke is kept as a curve, not as pixels. The points are smoothed and thinned into a bezier path, so it stays sharp at any size; the bar at the bottom sets width, smoothing and color, and each stroke becomes a block that can be moved, resized, rotated, recolored, closed and filled, and undone
- **Shapes are drawn on the canvas**: pick the shape tool (`R`), choose a shape in the bar at the bottom and drag to draw it where and as big as you want; `Shift` keeps it square and `Alt` draws from the center. A click without dragging still drops one at its default size
- **Shapes redrawn**: rectangle with adjustable corners, ellipse, triangle, polygon with 3–12 sides, star with 3–12 points and adjustable depth, heart, line and arrow. Every shape takes a fill, a stroke (width, color, solid, dashed or dotted) and is drawn at the block's real size, so corners and strokes keep their thickness. Shapes from older projects keep working
- **Images frame their picture**: stretch, cover or fit, offset X and Y, zoom, corner radius, a URL field and "use original size"; an image file can be dropped on the block and an image in the clipboard pasted onto it
- **Text blocks fit their text**: new text blocks grow and shrink with their content, font size and style. Resizing with a side handle keeps the width and wraps the text (the height still follows it); a top, bottom or corner handle fixes both. Pick **Auto**, **Auto height** or **Fixed** in the Text section, which now takes several lines. Existing text blocks keep their size
- **MCP server** in the desktop app (off by default): Claude Desktop, Claude Code, Cursor and other MCP clients can read the workspace, create projects, add, edit, align and delete blocks, edit HTML block code, change the background and size, look at the canvas and export images; settings include ready-made client configurations
- **Export options**: scale (0.5×–4×) with the resulting size, transparent background for PNG and SVG, JPEG quality; the export dialog remembers your choices and warns when the image is too large for the browser
- **Copy image to the clipboard** (`Alt+Shift+C`, File menu and export dialog)
- Block "Export layer" uses the same scale and transparency settings
- Notifications for export, copy and project errors instead of browser alerts
- **Zoom indicator** in the status bar with presets, zoom to fit and 100%; zoom steps are proportional and the indicator follows pinch and Ctrl+wheel
- **Block context menu** redesigned: opacity with value, duplicate, arrange (bring to front, forward, backward, send to back), hide, lock, export layer and delete
- **Snapping toggle** (`Shift+S`, also in the status bar); selection handles and snap guides restyled
- **Delete / Backspace** remove the selected block from anywhere on the canvas
- **Arrow keys** move the selected block by 1px (10px with Shift); each step can be undone; locked blocks stay in place
- **Multiple selection**: drag on the canvas to select blocks, `Shift`+click to add or remove one, `Ctrl+A` selects every block and `Esc` clears the selection; selected blocks move together
- **Align and distribute** from the properties panel or with shortcuts (`Alt+A/H/D` left/center/right, `Alt+W/V/S` top/middle/bottom, `Alt+Shift+H/V` distribute); a single block aligns to the canvas
- Duplicate, delete and arrow keys apply to the whole selection; aligning, distributing and moving several blocks undo in one step
- **Undo history is saved with the session**: the last 100 steps can still be undone after reloading or reopening the app
- **Block editor console** also shows errors thrown later by block scripts (timers, event listeners, promises and async actions) and no longer logs every action registration
- **Action scope hint** in `main.js`: each `// @action:` marker shows which lines run with the action, with a gutter bar over its code

### 🧹 Removed

- **Tweet block**: it depended on an external service to load tweets and is no longer available. Projects that used it open without it
- **Badge block**: a text and an avatar in a pill, which a text block and an image cover. Projects that used it open without it
- **Freehand drawing on a canvas layer**: it was never reachable, was not saved with the project and could not be undone. The vector brush replaces it

### 🐛 Fixes

- The crop and warp tools did nothing when they were picked while the pan tool was active
- The crop tool showed no crop handles when the selection handles had not been resolved yet, which also happened while the window was in the background
- Resizing or rotating several blocks at once could not be undone
- Clicking a block without moving it added an empty undo step
- QR codes could not be resized: they were fixed at 100×100
- HTML blocks were limited to 1200×800
- The image block and the block itself kept two different corner radius values
- Undo and redo entries could be applied again later and revert newer edits of the same property, and a block could overwrite a value it had just received with its previous one
- The Electron binary was never downloaded because Yarn 4 skips dependency install scripts; `yarn install` now installs it
- Pressing Delete while typing in a field deleted the selected block
- The view re-centered every time a block was added or removed; it now fits only when switching workspaces or changing the canvas size
- CSS variables without a `@type` annotation were always detected as text, so colors, sizes and booleans got a text field instead of a color picker, slider or switch
- HTML block scripts broke when a JS string variable contained quotes or new lines, or when an action label contained an apostrophe
- Redo after undoing several steps restored the wrong values

### ⚡ Performance

- Monaco is served as its own chunk, so the block editor page drops from 3.7 MB to 61 kB and app updates no longer invalidate the cached editor

### 🧪 Tests

- Vitest test suite (`yarn test`) covering shortcuts, undo/redo history, align/distribute math, the command registry, the canvas viewer helpers, the block console, the CSS/JS block parsers and `.kcomponent` files

## v 2.0.0

### 🚀 Features

- **New interface** — neutral design tokens (light/dark), Geist typography and compact controls across menus, panels, dialogs and the status bar
- **Command palette** (`Ctrl/⌘+K`) listing every available action with its shortcut
- **Session autosave** — workspaces and block properties are stored in IndexedDB and restored on startup
- **Block editor** redesigned as a code editor: activity bar, explorer, file tabs with unsaved state, resizable preview panel and Monaco themes that match the app
- **Block editor console** (`Ctrl+Shift+Y`) showing `console.*` and `htmlBlockAPI.log/warn/error` output, uncaught script errors and failing actions, with error and warning counts in the status bar
- **Monaco is bundled** with the app (HTML, CSS and JavaScript only) instead of loading from a CDN, so the block editor works offline and in the desktop app

### ⌨️ Shortcuts

- Shortcuts are handled in one place and no longer fire while typing in inputs or the code editor
- Tools: `V` select, `H` pan, `C` crop, `W` warp (were `Ctrl+W/E/Y/G`)
- `Ctrl+Shift+L` lock aspect ratio (was `Ctrl+R`), `Shift+1` zoom to fit (was `Ctrl+Space`)
- `Ctrl++` / `Ctrl+−` / `Shift+0` zoom in / out / reset
- `Alt+N` new project (was `Ctrl+N`), `Ctrl+O` open project, `Ctrl+Shift+E` export (was `Ctrl+P`)
- `Ctrl+.` cycle workspace mode (was `Ctrl+Tab`)
- Block editor: `Ctrl+J` toggle preview panel (was `Ctrl+\`), `Ctrl+Enter` refresh preview (was `Ctrl+R`)

### 🐛 Fixes

- `Ctrl+Y` triggered both redo and crop
- The editor crashed on load when the properties panel tried to expand before it was registered
- Block editor preview stayed blank after hiding and showing it, and did not match the canvas rendering
- Tooltips and menus opened from buttons could not anchor to them because `Button` did not forward refs

## v 2.0.0 - Beta 3

### 🐛 Fixes

- Fix HTML Block custom actions declared as local functions so `// @action:...` handlers now invoke the declared function when triggered from the Actions panel
- Fix Blocks API file picker behavior in embedded runtimes by mounting the temporary file input before opening the native selector
- Fix `uploadFile` validation flow to reject when `maxFiles` is exceeded or when no selected files pass validation

### 📝 Documentation

- Update `docs/html-block-api.md` with the real `@action` execution model, `Allow Script Execution` requirement, and file upload error-handling notes

## v 2.0.0 - Beta 2

### 🚀 Features

- **NEW Custom Component System (.kcomponent)**
  - **YAML-based component format** with manifest, HTML, CSS, and JavaScript sections
  - **CSS Variables System** with type annotations for automatic UI control generation
    - Color variables with color pickers
    - Number variables with sliders (min, max, step, unit)
    - Shadow variables with shadow editors
    - Boolean variables with toggle switches
  - **JavaScript Variables System** with typed controls
  - **Custom Actions System** with button generation from JavaScript comments
  - **Shadow DOM Integration** for secure encapsulation
  - **Component validation** with error messages

- **Component Import System**
  - **MenuBar → Components → Import Components** menu option
  - **File upload support** for .kcomponent files
  - **Direct YAML paste** for quick import
  - **Component preview** before import
  - **Example component download** for reference
  - **Automatic validation** with helpful error messages

- **Component Gallery in Left Panel**
  - **Components button** in main toolbar for quick access
  - **Search functionality** filtering by name, author, description, category, and tags
  - **Component cards** with metadata (name, author, description, category, tags)
  - **Add to canvas** button for quick component insertion
  - **Delete component** button for library management
  - **Empty state** with helpful guidance
  - **Persistent storage** using Zustand persist

- **Documentation**
  - **kcomponent-format.md**: Complete format specification with examples
  - **kcomponent-guide.md**: Step-by-step guide for importing and producing components
  - **CSS variable types documentation** with all supported annotations
  - **JavaScript actions documentation** with HTML Block API reference
  - **Best practices** and troubleshooting sections

### 📦 Dependencies

- Add js-yaml: ^4.1.0
- Add @types/js-yaml: ^4.0.9

### 📝 Documentation

- Add docs/kcomponent-format.md
- Add docs/kcomponent-guide.md

## v 2.0.0 - Beta 1 (Internal testing)

### 🚀 Features

- **NEW HTML Block Component** with comprehensive capabilities
  - **Shadow DOM Architecture** for secure encapsulation and CSS scoping
  - **Live HTML/CSS/JavaScript Editor** with real-time preview
  - **CSS Variables System** with automatic control generation (color pickers, sliders, switches)
  - **JavaScript Variables System** with 8 typed controls (string, number, boolean, color, gradient, url, object, array)
  - **Custom Actions System** with button generation from JavaScript comments
  - **SafeDOM API** for secure DOM manipulation preventing "Illegal invocation" errors
  - **Custom Components for Data Editing**: ArrayEditor and ObjectEditor with intuitive UI
  - **Real-time Variable Updates** with automatic UI refresh
  - **Integration with Export System** for static image generation

- **New Routing System** with React Router for better navigation and state management
  - **Separated Routes**: `/new` for project creation and `/editor` for editing
  - **Professional New Project Panel**: Photoshop-style interface without templates
  - **Context-Aware UI**: Menu options and UI elements only appear when relevant
  - **Smart Navigation**: Automatic redirection between routes based on application state

- **Enhanced Project Management**
  - **Custom Project Names**: Workspaces now use the exact project name entered by user
  - **No Auto-Creation**: Eliminated automatic workspace creation on app startup
  - **Smart TabBar**: Only appears when projects exist, hidden in new project view
  - **Contextual Controls**: Editing options disabled outside editor context

- **Improved User Experience**
  - **Cleaner Interface**: TabBar and add tab button hidden in new project view
  - **Logical Menu System**: File menu options disabled when no workspace is active
  - **Professional Workflow**: Similar to professional design applications
  - **Performance Optimization**: Editor components only loaded when needed

- Add a redesigned hierarchy panel with searchable layers, filters, contextual layer actions, and cleaner workspace-oriented UI
- Add layer groups/folders with nested hierarchy, collapse state, visibility/lock controls, duplication, rename, and drag-and-drop reordering
- Add grouped Moveable editing so hierarchy groups can be transformed together directly on the canvas
- Add hierarchy multi-selection with standard click, Shift range selection, and additive Alt/Ctrl/Cmd selection for batch layer actions
- Migrate to Tailwind CSS v4 with new CSS-based configuration
- Migrate to Vite 8 for improved build performance
- Migrate to ESLint 9 with flat config system
- Migrate to Zustand from easy-peace and build a multistore system
- Add new window styles to CodeBlock: Pixel, Konsole, GTK, GNOME, RETRO and Paper
- Improve macOS window style with realistic traffic light buttons and proper spacing
- Improve Windows 11 window style with accurate title bar and window controls
- Enhance Paper window style with better textures, gradients, and paper tear effect
- Add automatic color setting for Paper theme (#fbfaf7) and disable window color picker
- Add rounded corners and shadows to various window styles for better realism
- Add blur effect for workspace backgrounds
- Add noise texture overlay for workspace backgrounds
- New Mesh Gradient Dynamic Background Effect
- New Lava Lamp Background Effect
- New Galaxy and Starfield Background Effect
- Add "Create Dynamic Background" from Image, Phone, and Window block context menus using extracted image colors
- New App Design with glassmorphism effects
- Redesign TabBar with design guide styling
- Add context menu to tabs with bulk closing options: Close, Close others, Close to the right, Close to the left

### 🐛 Fixes

- Fix grouped Moveable crashes caused by invalid multi-target configuration in hierarchy-driven group selection
- Fix control position feedback loops caused by store-to-local property synchronization while dragging active controls
- Fix 800+ ESLint errors (formatting, unused variables, and other linting issues)
- Fix TypeScript strict mode error in ProjectWizard.tsx (explicit comparison for any types)
- Fix Editor component not displaying by default (showWizard state initialization)
- Fix theme toggle not working by centralizing theme state in AppContext and updating CSS for class-based dark mode
- Fix code duplication in new window styles by using common SyntaxHighlighter
- Fix window color picker showing for Paper theme when it should be disabled
- Fix TypeScript and ESLint formatting issues across codebase
- Fix InfiniteViewer zoom being too aggressive when using Ctrl + mouse wheel scroll (added wheelScale and maxPinchWheel parameters)
- Fix ControlMenu Portal not rendering when RightPanel hasn't mounted yet (added useEffect to wait for #menu element)
- Fix ControlMenu disappearing when switching tabs in RightPanel (Portal container now persists within tab)
- Fix Moveable component appearing in exported images (added isExporting state to hide Moveable during export)
- Fix TypeScript errors in workspace store interface for addWorkspace function
- Fix workspace name inheritance from project creation dialog
- Fix TabBar rendering when no workspaces exist
- Fix menu options appearing in inappropriate contexts
- Fix automatic workspace creation on application startup

### 🔄 Changes

- Refactor hierarchy actions into the central store so layer visibility, lock, delete, duplicate, grouping, and structural reorder flow through shared editor logic
- Update TypeScript moduleResolution to "bundler" for better ESM support
- Remove old ESLint config files (.eslintrc.js, .eslintrc.json)
- Remove test message from App.tsx
- Refactor CodeBlock to use common SyntaxHighlighter for all styles to prevent duplication and enable proper stretching
- Update Tailwind CSS v4 gradient syntax (bg-linear-to-_ instead of bg-gradient-to-_)
- **Refactored App Architecture**: Moved from dialog-based to routing-based navigation
- **Updated Workspace Store**: Modified addWorkspace to accept custom project names
- **Enhanced MenuBar Logic**: Added route-based conditional rendering
- **Improved TabBar Behavior**: Context-aware visibility based on workspace state
- **Streamlined User Flow**: Clear separation between project creation and editing phases

### 📦 Dependencies

- Update vite: 5.1.5 → 8.0.0
- Update @vitejs/plugin-react: 4.2.1 → 6.0.0
- Update vite-plugin-electron: 0.28.4 → 0.29.0
- Update vite-plugin-pwa: 0.16.4 → 0.20.0
- Update eslint: 8.57.0 → 9.15.0
- Update eslint-plugin-react: 7.34.0 → 7.37.0
- Update @typescript-eslint/eslint-plugin: 6.1.0 → 8.15.0
- Add @typescript-eslint/parser: 8.15.0
- Update eslint-config-prettier: 8.5.0 → 9.1.0

### ⚙️ Configuration

- Add @tailwindcss/vite plugin to vite.config.ts
- Create eslint.config.js with flat config format
- Update tsconfig.json moduleResolution to "bundler"
- Added React Router DOM for navigation management
- Created new NewProject.tsx component with professional UI
- Updated App.tsx with routing configuration
- Modified MenuBar.tsx for context-aware menu options
- Enhanced TabBar.tsx with conditional rendering logic

## v 1.12.0 - Release (August 24th, 2023)

- feat: New Template System with Community-Generated Content
- New installation formats available for Linux
- All Previous Changes
- Minor Fixes and Improvements

## v 1.11.7

feat: Add a set of predefined gradients for background
fix: Change Background Color of Modals for better Consistency

## v 1.11.6

fix: Missing App Icon on Linux
fix: Lazy Load Templates

## v 1.11.5

- feat: News Panel with App Updates

## v 1.11.4

- fix: Wrong Data on Saving Projects
- fix: Missing Image on Blocks

## v 1.11.3

- feat: Background Images

## v1.11.2

- improve: Save as Template
- fix: Save Transform Properties of Blocks

## v 1.11.1

- feat: Save Project as Template
- improve: Add Device Thumbnails on PhoneBlock Device Selection Menu
- improve: Project Wizard (Added more project templates and implement a new template system)

## v 1.11.0

- feat: New Devices Mockups

## v 1.10.3

- Update App Icons on Desktop Platforms

## v 1.10.2

- feat: Add Download Image Option for Mobile Devices

## v 1.10.1 - Release (August 16th, 2023)

- fix: Show Menu Bar on Mac
- fix: Wrong Position of Drawing Panel

## v 1.10.0

- Android Version Available
- Minor Fixes and Improvements

## v 1.9.1

update: App Branding

## v 1.9.0

- Preparing Android Version
- feat: Save To Gallery (Android)
- feat: Share Image (Android)
- improve: Animation on Change Workspace Size or Colors
- fix: View Menu Disappear

## v 1.8.2

- Reduce App Loading Time
- Various Optimizations and Bug Fixes

## v 1.8.1

- fix: Change Theme Colors On Code Blocks

## v 1.8.0

- Change App The Colors
- Improve UI/UX

## v 1.7.2 - Release (August 6th, 2023)

feat: Auto Scroll Tabs
fix: Minor fixes and improvements

## v 1.7.1

improve: Tabs System
feat: Toggle Aspect Ratio Key Shortcut (Ctrl+R)
fix: Minor UI Fixes
fix: Open Multiples Menus at Time

## v 1.7.0

- New Stable Release
- Some Improvements and minor Bug Fixes

## v 1.6.2

- feat: Background Color for Custom Blocks
- improve: Loading extensions time
- improve: Extensions Progressive Loading
- fix: Can not Duplicate Custom Controls
- fix: Wrong Position of Control Editor on hidden items

## v 1.6.1

- Load Extensions Async

## v 1.6.0

fix: Wait for load plugins
feat: Add Plugin System (Beta)
feat: Logo Property for Extensions

## v 1.5.1

- fix: Some Bugs in Save and Load Projects
- fix: Prevent For Open Multiple Modals at Time

## v 1.5.0

- feat: Save and Load Projects

## v 1.4.3

- add: Donations Panel
- add: Changelog Panel
- fix: Minor UI fixes

## v 1.4.2

- add: Duplicate Option to Menu Bar
- improve: ColorPicker Behavior
- fix: Drawing Bar Wrong Position
- fix: Incorrect Size for Draw Canvas
- fix: Remove Exit Animation for Menus
- fix: You Need at least one Workspace
- fix: Color Picker Position on Drawing Panel
- fix: Snap System not work with multiples Workspaces

## v 1.4.1

- fix: Adding more tap area to Tab Items
- improve: Add loading state in Render Preview
- fix: Hide Controls
- fix: Auto Zoom in Workspace

## v 1.4.0

- New Workspaces System

## v 1.3.7

feat: Duplicate Controls (Shortcut Ctrl+D)
fix: Wrong Control Position in Status Bar

## v 1.3.6

- Improve UI for Web Version

## v 1.3.5

- Added Menu Bar
- Some improvements in Status Bar
- Minor Bug Fixes

## v 1.3.4

fix: Some Text Fields Overflow the Setting Panel
fix: Wrong Position of Drawing Panel

## v 1.3.3

- Change Editor Layout
- Layout Modes
- Various UI/UX Editor Improvements
- Double Click to Edit Control

## v 1.3.2

- fix: Bug in Automatic Centering

## v 1.3.1

- Move Background Settings to Menu Tab Bar

## v 1.3.0

- New Feature: Controls Hierarchy

## v 1.2.1

- Key Shortcut (Ctrl+N) to Create New Project
- Fix: New Elements get the same properties of the latest element before create new project
- Fix: Min Height and Width on Code Blocks

## v 1.2.0

- New Project Wizard
- Improve Redo/Undo System

## v 1.1.3

- Improve Redo Undo System
- Improve Performance
- Fix Github pages Deploy Workflow

## v 1.1.2

- Degree Angles To Snap Rotation
- Change Default Workspace Color
- Center View on Start and With KeyShortcut (Ctrl+Space)

## v 1.1.1

- Controls are now Snappables
- Update Project Dependencies
- Various Editor Improvements
- Some Improvements
- Minor Bug Fixes

## v 1.1.0 - Release (July 13th, 2023)

- Canvas Drawing System
- Transparent Background on Code blocks
- Some Improvements
- Minor Bug Fixes

## v 1.0.4

- Improve UI/UX
- Added Tooltips and Other Feedback controls for the users
- Improve Animations
- Now you can define and save custom gradients inside Color Picker
- Can set control size and position manually
- Add Key Shortcuts

## v 1.0.3 - Release (May 12th, 2023)

- New Design
- Change License to Apache-2.0
- Added Twitter and Badge Controls
- Now has Compiled Version for Desktop Platforms Powered by Tauri
- Added Option To Change App Theme Manually
- Improve Behavior of Editor
- Some Improvements
- Minor Bug Fixes

## v 1.0.2

- Added Light Theme
- Karbonized is now a PWA with offline support
- Added Window Control
- Replaced React-rnd for react-moveable
- Resizable Workspace
- More control over workspace
- Now you can define Workspace Name and Size
- Various improvements and Bug Fixed

## v 1.0.1

- Improve all controls
- Now you can manually define size and position of all controls
- Now you can change background color
- Now you can define colors of QR control
- Added context menu for delete component and take an individual screenshot
- Added Image Control
- Improve UI/UX
- Improve website for mobile devices

## v 1.0.0

First Version

Controls

- Text
- Qr
- Code
