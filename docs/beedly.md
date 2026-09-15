# Beedly and the MCP server

**Beedly** is the design assistant built into Karbonized. You describe what you want and it edits the canvas with the same actions you use: it adds and updates blocks, aligns them, changes the background and exports images. It works with the model provider you choose.

The desktop app can also expose those actions as a local **MCP server**, so Claude Desktop, Claude Code, Cursor and other MCP clients can control Karbonized.

- [Using Beedly](#using-beedly)
- [Model providers](#model-providers)
- [API keys](#api-keys)
- [Undo](#undo)
- [Tools](#tools)
- [MCP server (desktop app)](#mcp-server-desktop-app)
- [Troubleshooting](#troubleshooting)
- [For contributors](#for-contributors)

## Using Beedly

Open the panel with <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>L</kbd>, the **Beedly** button in the status bar, the **Beedly** menu in the menu bar or **Show Beedly** in the command palette. It sits next to the properties panel.

- Type a request and press <kbd>Enter</kbd> (<kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line).
- Answers stream in. Every action shows up as a card; open it to see its arguments, its result and how long it took.
- **Stop** ends the response at any point. **Retry** asks again from your last message.
- The model picker under the message box switches between your providers.
- **New chat** starts over; the history button reopens the last 30 chats. Chats are stored on your device.

When the model accepts images, Beedly can look at a snapshot of the canvas to check its work.

## Model providers

Open **Beedly settings** (gear in the panel, or the command palette) and add a provider:

| Provider | Base URL | Key | Notes |
| --- | --- | --- | --- |
| Anthropic | `https://api.anthropic.com` | Required | |
| OpenAI | `https://api.openai.com/v1` | Required | |
| Google Gemini | `https://generativelanguage.googleapis.com` | Required | |
| OpenRouter | `https://openrouter.ai/api/v1` | Required | Any model on OpenRouter |
| Ollama | `http://localhost:11434/v1` | No | Local models |
| LM Studio | `http://localhost:1234/v1` | No | Local models |
| OpenAI-compatible | your server | Optional | Any server that speaks the Chat Completions API |

**Browse** lists the models of the provider, and **Test connection** checks the base URL and key. Pick a model that supports tool calling; small local models may struggle with multi-step edits.

### Web version and CORS

The web app calls providers straight from the browser. Anthropic, OpenAI, Gemini and OpenRouter allow it. For local servers:

- **Ollama**: allow the site with the `OLLAMA_ORIGINS` environment variable (set it to the address of the site, for example `OLLAMA_ORIGINS=https://example.github.io`) and restart Ollama.
- **LM Studio**: turn on **Enable CORS** in the server settings.
- **Other servers**: enable CORS on the server, or use the desktop app.

The desktop app sends provider requests from its main process, so CORS never applies there.

## API keys

Keys never leave your device except in requests to their provider, and they are never logged.

- **Desktop app**: keys are encrypted with the system keychain and only decrypted by the main process when it sends a request. The page cannot read them back, and a key only works with the base URL it was saved for. If you change the base URL, save the key again.
- **Web app**: keys are stored in this browser (IndexedDB).

## Undo

Everything Beedly does in one response is **one undo step**: press <kbd>Ctrl</kbd> + <kbd>Z</kbd> on the canvas, or **Undo changes** under the response. Changes made by MCP clients undo one tool call at a time. Your own edits made while Beedly works are never merged into its step.

## Tools

Beedly and the MCP server share the same tools:

| Tool | What it does |
| --- | --- |
| `get_workspace` | Canvas size, background, selection and every block with its position, size and properties |
| `create_workspace` | New project with a canvas size, opened in the editor |
| `set_canvas_background` | Color, gradient, texture, wallpaper or dynamic background, blur and noise |
| `set_canvas_size` | Resize the canvas |
| `list_block_types` | Block types, their properties and size limits, code themes |
| `add_block` | Add a block (code, text, image, window, phone, shape, icon, QR, badge, HTML) |
| `update_block` | Name, position, size, rotation, visibility, lock and properties |
| `delete_blocks` | Delete blocks |
| `select_blocks` | Select blocks in the editor |
| `align_blocks` / `distribute_blocks` | Align or space blocks; one block aligns to the canvas |
| `reorder_block` | Bring to front, forward, backward, send to back |
| `get_html_block` / `update_html_block` | Read or replace the HTML, CSS and JavaScript of an HTML block |
| `get_canvas_snapshot` | PNG of the canvas (models with image input) |
| `export_image` | Export PNG, JPEG or SVG through the normal save flow |
| `list_commands` / `run_command` | Editor commands such as undo, duplicate, zoom or snapping |

## MCP server (desktop app)

1. Turn on **Beedly → MCP server** in the menu bar, or open **Beedly settings → MCP server** and turn on **Allow other apps to control Karbonized**. While it is on, the **MCP** indicator in the status bar shows its state and opens these settings.
2. Pick your client and copy its configuration. It already contains the URL and your token.
3. Keep Karbonized open while the client works. Karbonized can stay in the background.

### Claude Desktop

Claude Desktop starts MCP servers as local processes, so Karbonized ships a small bridge (`mcp-stdio.cjs`) that runs with the Karbonized executable itself; Node.js is not needed. Paste the configuration in **Settings → Developer → Edit Config** and restart Claude Desktop. It looks like this:

```json
{
  "mcpServers": {
    "karbonized": {
      "command": "C:\\Users\\you\\AppData\\Local\\Programs\\Karbonized\\Karbonized.exe",
      "args": ["C:\\Users\\you\\AppData\\Local\\Programs\\Karbonized\\resources\\app.asar.unpacked\\dist-electron\\mcp-stdio.cjs"],
      "env": {
        "ELECTRON_RUN_AS_NODE": "1",
        "KARBONIZED_MCP_URL": "http://127.0.0.1:7824/mcp",
        "KARBONIZED_MCP_TOKEN": "<your token>"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport http karbonized http://127.0.0.1:7824/mcp --header "Authorization: Bearer <your token>"
```

### Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "karbonized": {
      "url": "http://127.0.0.1:7824/mcp",
      "headers": { "Authorization": "Bearer <your token>" }
    }
  }
}
```

### Security

- The server is off by default and only listens on `127.0.0.1`.
- Every request needs the token. Requests that come from web pages (a foreign `Origin` or `Host`) are refused.
- Anyone with the token can edit your canvas: keep it private, and regenerate it in settings if it leaks (then update your clients).

## Troubleshooting

- **"Add your API key"**: the active provider needs a key. On desktop, save it again after changing the base URL.
- **"Could not reach the provider"**: check the base URL and that local servers are running. On the web, see [CORS](#web-version-and-cors).
- **The model answers but does nothing**: choose a model with tool calling.
- **MCP client: "Could not reach Karbonized"**: open the app and turn the server on. **"rejected the token"**: copy the configuration again.
- **MCP client: "No workspace is open"**: open a project, or let the client call `create_workspace`.
- **Port already in use**: choose another port in settings and update your clients.

## For contributors

- `src/lib/editor/actions.ts`: editor actions with arguments (blocks, canvas, workspaces), all undoable.
- `src/lib/blocks/catalog.ts`: block types, properties, defaults and size limits. Keep it in sync with the `useControlState` calls of each block.
- `src/lib/beedly/tools/`: tool definitions (zod schemas) and `executeTool`, shared by Beedly and the MCP server.
- `src/lib/beedly/core/`: provider-neutral chat types, SSE parser, agent loop, errors and key redaction.
- `src/lib/beedly/providers/`: Anthropic, OpenAI Chat Completions and Gemini adapters, and the provider presets.
- `src/lib/beedly/transport/`: browser `fetch` and Electron main-process transports.
- `src-electron/beedly/`: key storage and provider requests in the main process.
- `src-electron/mcp/`: MCP server and stdio bridge; the renderer side is `src/lib/beedly/mcp/renderer.ts`.

To add a tool, define it with `defineTool` in `src/lib/beedly/tools/`, add it to `editorTools` and write a test. Mutating tools must change the document synchronously in `execute` (it runs inside a history transaction) and can wait in `settle`.
