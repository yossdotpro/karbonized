/**
 * Default content for HTML Block component
 * A plain tile with an icon: the background is a CSS variable, so it shows up
 * as a color control in the properties panel.
 */

export const defaultHTMLContent = `<div class="tile">
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
    <path d="M20 2v4" />
    <path d="M22 4h-4" />
    <circle cx="4" cy="20" r="2" />
  </svg>
</div>`;

export const defaultCSSContent = `:root {
  --background: #2563eb;
}

.tile {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background);
  border-radius: 24px;
}

.icon {
  height: 40%;
  aspect-ratio: 1;
  color: #ffffff;
}`;

export const defaultJSContent = `// Scripts are optional: turn on "Allow scripts" to run them.
// Add controls with  // @var name:type = value
// and buttons with   // @action:Name
`;

export const defaultAutoRefresh = true;
export const defaultShowDevTools = false;
export const defaultAllowScriptExecution = false;
