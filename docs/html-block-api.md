# HTML Block API Reference

## Overview

The HTML Block API provides a comprehensive set of tools and methods for creating interactive components within Karbonized. This API is available through the global `htmlBlockAPI` object and includes DOM manipulation utilities, logging, refresh capabilities, action registration, and advanced file handling. The HTML Block runs in a Shadow DOM environment for secure encapsulation.

## Global API Access

The HTML Block API is automatically injected into the global scope and can be accessed in multiple ways:

```javascript
// Direct access
htmlBlockAPI.log('Hello World');

// Via window object
window.htmlBlockAPI.log('Hello World');

// Safe access with fallback
const api = window.htmlBlockAPI || {};
api.log?.('Hello World');
```

## Core API Methods

### `log(message)`

Logs messages to the parent application console with HTML Block context.

**Parameters:**

- `message` (unknown): The message to log. Can be string, number, object, or any serializable data.

**Returns:** `void`

**Example:**

```javascript
htmlBlockAPI.log('Debug message');
htmlBlockAPI.log({ user: 'John', action: 'click' });
```

### `refresh()`

Requests a refresh of the HTML Block content from the parent application.

**Returns:** `void`

**Example:**

```javascript
htmlBlockAPI.refresh();
```

### `warn(message)`

Logs warning messages to the console with HTML Block context.

**Parameters:**

- `message` (unknown): The warning message to log.

**Returns:** `void`

**Example:**

```javascript
htmlBlockAPI.warn('Deprecated method used');
```

### `error(message)`

Logs error messages to the console with HTML Block context.

**Parameters:**

- `message` (unknown): The error message to log.

**Returns:** `void`

**Example:**

```javascript
htmlBlockAPI.error('Something went wrong');
```

### `registerAction(actionId, handler)`

Registers a custom action handler that can be triggered from the UI.

**Parameters:**

- `actionId` (string): Unique identifier for the action
- `handler` (function): Function to execute when action is triggered

**Returns:** `void`

**Example:**

```javascript
htmlBlockAPI.registerAction('myAction', () => {
	console.log('Action executed');
});
```

## Action Authoring

Karbonized can generate action buttons from JavaScript comments using the `// @action:...` syntax.

### Basic pattern

```javascript
// @action:Say Hello
log('Hello from the action');
```

### Function pattern

If the action block contains a function declaration or a function assigned to a variable, Karbonized will register the action and invoke that function automatically when the action button is pressed.

```javascript
// @action:Add Images
async function addImages() {
	const files = await htmlBlockAPI.uploadFile({
		accept: ['image/*'],
		multiple: true,
	});

	log(`Imported ${Array.isArray(files) ? files.length : 1} images`);
}
```

```javascript
// @action:Refresh Layout
const refreshLayout = () => {
	htmlBlockAPI.refresh();
};
```

### Runtime requirement

Custom actions only run when `Allow Script Execution` is enabled for the HTML Block.

## File Handling API

### `uploadFile(options)`

Uploads files with validation and converts images to data URLs.

**Parameters:**

- `options` (FileUploadOptions, optional): Configuration options
  - `accept` (string[]): Accepted file types (e.g., ['image/*', '.pdf'])
  - `multiple` (boolean): Allow multiple file selection
  - `maxSize` (number): Maximum file size in bytes
  - `maxFiles` (number): Maximum number of files
  - `convertToDataUrl` (boolean): Convert images to data URLs

**Returns:** `Promise<FileInfo | FileInfo[]>`

**Notes:**

- The file picker is mounted temporarily in the DOM before opening, which improves compatibility with Electron and embedded webviews.
- The promise rejects when the user cancels selection, when the selection exceeds `maxFiles`, or when no selected file passes validation.

**Example:**

```javascript
// Upload multiple images
const images = await htmlBlockAPI.uploadFile({
	accept: ['image/*'],
	multiple: true,
	maxSize: 5 * 1024 * 1024, // 5MB
	convertToDataUrl: true,
});

// Upload single PDF
const pdf = await htmlBlockAPI.uploadFile({
	accept: ['application/pdf'],
	maxSize: 10 * 1024 * 1024, // 10MB
});
```

**Common error handling:**

```javascript
try {
	const uploaded = await htmlBlockAPI.uploadFile({
		accept: ['image/*'],
		multiple: true,
		maxFiles: 4,
	});
} catch (error) {
	htmlBlockAPI.warn(`Upload cancelled or rejected: ${error.message}`);
}
```

### `getFile(fileId)`

Retrieves file information by ID.

**Parameters:**

- `fileId` (string): Unique file identifier

**Returns:** `FileInfo | null`

**Example:**

```javascript
const file = htmlBlockAPI.getFile('file_123456');
if (file) {
	console.log('File name:', file.name);
	console.log('File size:', file.size);
	console.log('Data URL:', file.dataUrl);
}
```

### `getAllFiles()`

Returns all uploaded files.

**Returns:** `FileInfo[]`

**Example:**

```javascript
const allFiles = htmlBlockAPI.getAllFiles();
console.log('Total files:', allFiles.length);
```

### `removeFile(fileId)`

Removes a file by ID and cleans up resources.

**Parameters:**

- `fileId` (string): Unique file identifier

**Returns:** `void`

**Example:**

```javascript
htmlBlockAPI.removeFile('file_123456');
```

### `clearFiles()`

Removes all files and cleans up resources.

**Returns:** `void`

**Example:**

```javascript
htmlBlockAPI.clearFiles();
```

### `validateFile(file, options)`

Validates a file against specified options.

**Parameters:**

- `file` (File): File object to validate
- `options` (FileUploadOptions, optional): Validation options

**Returns:** `boolean`

**Example:**

```javascript
const isValid = htmlBlockAPI.validateFile(file, {
	accept: ['image/*'],
	maxSize: 5 * 1024 * 1024,
});
```

### `convertToDataUrl(file)`

Converts a file to a data URL.

**Parameters:**

- `file` (File): File to convert

**Returns:** `Promise<string>`

**Example:**

```javascript
const dataUrl = await htmlBlockAPI.convertToDataUrl(file);
const img = document.createElement('img');
img.src = dataUrl;
```

### `optimizeImage(dataUrl, options)`

Optimizes an image by resizing and compressing.

**Parameters:**

- `dataUrl` (string): Image data URL
- `options` (ImageOptimizationOptions, optional): Optimization settings
  - `maxWidth` (number): Maximum width in pixels
  - `maxHeight` (number): Maximum height in pixels
  - `quality` (number): Quality 0-1 (for JPEG/WebP)
  - `format` ('jpeg' | 'png' | 'webp'): Output format

**Returns:** `Promise<string>`

**Example:**

```javascript
const optimized = await htmlBlockAPI.optimizeImage(dataUrl, {
	maxWidth: 1920,
	maxHeight: 1080,
	quality: 0.8,
	format: 'jpeg',
});
```

## DOM Access Properties

### `host`

Reference to the HTML Block host element in the parent DOM.

**Type:** `HTMLElement`

**Example:**

```javascript
const hostRect = htmlBlockAPI.host.getBoundingClientRect();
console.log('Host width:', hostRect.width);
```

### `root`

Reference to the root element inside the Shadow DOM.

**Type:** `HTMLElement`

**Example:**

```javascript
htmlBlockAPI.root.style.padding = '20px';
htmlBlockAPI.root.classList.add('custom-class');
```

### `shadowRoot`

Reference to the Shadow DOM root object.

**Type:** `ShadowRoot`

**Example:**

```javascript
const button = htmlBlockAPI.shadowRoot.querySelector('button');
if (button) {
	button.addEventListener('click', () => {
		htmlBlockAPI.log('Button clicked');
	});
}
```

### `document`

Reference to a scoped document object for safe DOM manipulation within the Shadow DOM.

**Type:** `Document & ShadowRoot`

**Available Methods:**

- `querySelector(selector: string): Element | null`
- `querySelectorAll(selector: string): NodeListOf<Element>`
- `getElementById(id: string): Element | null`
- `createElement(tagName: string): Element`
- `addEventListener(type: string, listener: EventListener): void`
- `removeEventListener(type: string, listener: EventListener): void`
- `dispatchEvent(event: Event): boolean`
- `activeElement: Element | null`

**Example:**

```javascript
const element = htmlBlockAPI.document.querySelector('.my-class');
const newElement = htmlBlockAPI.document.createElement('div');
```

### `globalDocument`

Reference to the actual browser document object (parent window).

**Type:** `Document`

**Example:**

```javascript
const parentStyles = htmlBlockAPI.globalDocument.getComputedStyle(
	htmlBlockAPI.host,
);
const parentUrl = htmlBlockAPI.globalDocument.URL;
```

### `safeDOM`

Reference to the SafeDOM API for secure DOM manipulation within the Shadow DOM.

**Type:** `SafeDOMAPI`

## SafeDOM API Methods

The `safeDOM` object provides secure methods for DOM manipulation that prevent "Illegal invocation" errors.

### `querySelector(selector: string): Element | null`

Safely selects an element within the Shadow DOM.

**Parameters:**

- `selector` (string): CSS selector string

**Returns:** `Element | null`

### `querySelectorAll(selector: string): NodeListOf<Element>`

Safely selects multiple elements within the Shadow DOM.

**Parameters:**

- `selector` (string): CSS selector string

**Returns:** `NodeListOf<Element>`

### `createElement(tagName: string): Element | null`

Safely creates a new DOM element.

**Parameters:**

- `tagName` (string): Tag name for the element

**Returns:** `Element | null`

### `appendChild(parent: Element, child: Element): boolean`

Safely appends a child element to a parent.

**Parameters:**

- `parent` (Element): Parent element
- `child` (Element): Child element to append

**Returns:** `boolean` - Success status

### `removeChild(parent: Element, child: Element): boolean`

Safely removes a child element from a parent.

**Parameters:**

- `parent` (Element): Parent element
- `child` (Element): Child element to remove

**Returns:** `boolean` - Success status

### `setAttribute(element: Element, name: string, value: string): boolean`

Safely sets an attribute on an element.

**Parameters:**

- `element` (Element): Target element
- `name` (string): Attribute name
- `value` (string): Attribute value

**Returns:** `boolean` - Success status

### `getAttribute(element: Element, name: string): string | null`

Safely gets an attribute from an element.

**Parameters:**

- `element` (Element): Target element
- `name` (string): Attribute name

**Returns:** `string | null` - Attribute value

### `setStyle(element: Element, property: string, value: string): boolean`

Safely sets a CSS style property on an element.

**Parameters:**

- `element` (Element): Target element
- `property` (string): CSS property name
- `value` (string): CSS property value

**Returns:** `boolean` - Success status

### `getStyle(element: Element, property: string): string | null`

Safely gets a CSS style property from an element.

**Parameters:**

- `element` (Element): Target element
- `property` (string): CSS property name

**Returns:** `string | null` - CSS property value

## File Utilities

### `fileUtils`

Reference to the file utilities object with helper functions.

**Type:** `FileUtils`

### `fileUtils.getExtension(filename)`

Gets file extension from filename.

**Parameters:**

- `filename` (string): File name

**Returns:** `string`

**Example:**

```javascript
const ext = htmlBlockAPI.fileUtils.getExtension('photo.jpg'); // returns 'jpg'
```

### `fileUtils.formatFileSize(bytes)`

Formats file size in human readable format.

**Parameters:**

- `bytes` (number): File size in bytes

**Returns:** `string`

**Example:**

```javascript
const size = htmlBlockAPI.fileUtils.formatFileSize(1024); // returns '1 KB'
```

### `fileUtils.isImage(file)`

Checks if file is an image.

**Parameters:**

- `file` (File | FileInfo): File to check

**Returns:** `boolean`

**Example:**

```javascript
const isImg = htmlBlockAPI.fileUtils.isImage(file);
```

### `fileUtils.isVideo(file)`

Checks if file is a video.

**Parameters:**

- `file` (File | FileInfo): File to check

**Returns:** `boolean`

### `fileUtils.isAudio(file)`

Checks if file is an audio file.

**Parameters:**

- `file` (File | FileInfo): File to check

**Returns:** `boolean`

### `fileUtils.getMimeType(extension)`

Gets MIME type from file extension.

**Parameters:**

- `extension` (string): File extension

**Returns:** `string`

**Example:**

```javascript
const mimeType = htmlBlockAPI.fileUtils.getMimeType('pdf'); // returns 'application/pdf'
```

## Type Definitions

### FileInfo

```typescript
interface FileInfo {
	id: string;
	name: string;
	type: string;
	size: number;
	url: string;
	dataUrl?: string;
	lastModified: number;
}
```

### FileUploadOptions

```typescript
interface FileUploadOptions {
	accept?: string[];
	multiple?: boolean;
	maxSize?: number;
	maxFiles?: number;
	convertToDataUrl?: boolean;
}
```

### ImageOptimizationOptions

```typescript
interface ImageOptimizationOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	format?: 'jpeg' | 'png' | 'webp';
}
```

## Security Considerations

### Shadow DOM Encapsulation

HTML Blocks run in a Shadow DOM environment which provides:

- CSS scoping to prevent conflicts with parent page
- JavaScript encapsulation for safe execution
- DOM isolation from the main document

### Safe DOM Manipulation

- Always use `htmlBlockAPI.safeDOM` for DOM manipulation
- Use `htmlBlockAPI.document` for element selection
- Avoid direct access to `window` when possible

### File Security

- Files are stored in memory and referenced by ID
- Data URLs are only generated for images under 5MB by default
- File type validation is performed but should not be supplemented with server-side validation
- Always sanitize file names when displaying them
- Use file size limits to prevent memory exhaustion

### Browser Security Policies

HTML Blocks follow standard browser security policies:

- External resource loading follows CORS policies
- Same-origin policies apply to network requests
- Standard browser permissions and restrictions

## Error Handling

All SafeDOM methods include built-in error handling:

- Errors are logged to console with context
- Methods return `null` or `false` on failure
- No exceptions are thrown to the calling code

## Global Functions

### `safeQuerySelector`

A global safe wrapper for `querySelector` that handles errors gracefully.

**Parameters:**

- `selector` (string): CSS selector string

**Returns:** `Element | null`

**Example:**

```javascript
const element = safeQuerySelector('.my-selector');
if (element) {
	element.textContent = 'Found safely!';
}
```
