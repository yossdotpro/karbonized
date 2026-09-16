# KComponent Guide: Importing and Producing Components

## Overview

This guide explains how to import custom `.kcomponent` files into Karbonized and how to create your own components.

## The Starter Pack

Karbonized ships with eight worked examples. Open the component library with an
empty library and click **Load starter pack**, or import any single file from
`src/assets/kcomponents/`.

They are the reference implementations of this format: between them they cover
every binding the properties panel can generate (colors, numbers with units,
shadows, `@var` strings and numbers, and `@action` buttons), and every one is
written to look finished with scripts disabled. `src/assets/kcomponents/README.md`
lists the house rules they follow — worth reading before authoring your own.

## Importing Components

### Method 1: Using the Menu Bar

1. Navigate to **MenuBar → Components → Import Components** (or run
   *Import components…* from the command palette)
2. Choose a file, drop one on the dialog, or paste the YAML

### Method 2: File Upload or Drag and Drop

1. Open the Import Components dialog
2. Click **Choose files** and pick one or more `.kcomponent`, `.yaml` or `.yml`
   files, or drop them straight onto the drop zone
3. Every file is parsed and added to the library, and the dialog lists what
   happened to each one: added, updated, or why it was rejected
4. A single file that fails to parse is loaded into the editor below so you can
   fix it without leaving the dialog

### Method 3: Paste YAML Content

1. Open the Import Components dialog
2. Paste the YAML content into the text area
3. The content is validated as you type: errors are shown in red and warnings
   (dropped or normalized fields) in amber
4. Click **Add to library**, or **Add to canvas** to import it and drop it on
   the workspace right away

If a component with the same name and author already exists, the button becomes
**Replace in library** and updates the existing entry instead of creating a
duplicate.

### Downloading an Example

If you're new to creating components, you can download an example
`.kcomponent` file:

1. Open the Import Components dialog
2. Click **Download example**
3. Use the example as a reference for creating your own components

## Managing Imported Components

### Viewing the Component Library

1. In the Left Panel, click on the **Components** button (package icon), or use
   **MenuBar → Components → Component Library**
2. The library shows every imported component as a card with its thumbnail,
   name, version, author, description and tags

### Searching and Filtering Components

- Use the search bar to filter by name, author, description, category or tags
- Use the category chips to narrow the list to one category, or to your
  favorites
- Use the sort menu to order by recently imported, name, or most used

### Adding Components to Canvas

1. Open the component library
2. Click the card preview, or the **Add** button
3. The component is added to the canvas as an HTML block with its HTML, CSS and
   JS pre-loaded, sized from `manifest.width`/`manifest.height` when present

### Favorites, Export and Deletion

- **Star**: marks a component as a favorite so it gets its own filter chip
- **Download**: exports the component back to a `.kcomponent` file to share it
- **Trash**: deletes the component; click it twice to confirm

## Producing Components

### Step 1: Create the YAML File

Create a new file with the `.kcomponent` extension and add the YAML structure:

```yaml
manifest:
  name: "My Component"
  author: "Your Name"
  description: "A description of your component"
  version: "1.0.0"
  category: "Category"
  tags:
    - "tag1"
    - "tag2"

html: |
  <!-- Your HTML here -->

css: |
  /* Your CSS here */

js: |
  // Your JavaScript here
```

### Step 2: Write the HTML

Add your HTML markup in the `html` field:

```yaml
html: |
  <div class="my-component">
    <h1>Hello World</h1>
    <p>This is my custom component</p>
  </div>
```

**Tips:**
- Keep HTML simple and semantic
- Use meaningful class names
- Remember that your component will render in Shadow DOM

### Step 3: Write the CSS with Variables

Add your CSS in the `css` field, using CSS variables with type annotations:

```yaml
css: |
  :root {
    /* @type:color */
    --primary-color: #3b82f6;
    /* @type:color */
    --text-color: #1f2937;
    /* @type:number min:0 max:50 step:1 unit:px */
    --border-radius: 12px;
    /* @type:shadow */
    --box-shadow: 0px 2px 4px rgba(0,0,0,0.1);
    /* @type:boolean */
    --show-shadow: true;
  }
  
  .my-component {
    background: var(--primary-color);
    color: var(--text-color);
    padding: 20px;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
  }
```

**Tips:**
- Use CSS variables for all customizable properties
- Add type annotations to generate UI controls automatically
- Test your styles in isolation
- Use the `:root` selector for variable definitions

### Step 4: Write the JavaScript

Add your JavaScript in the `js` field:

```yaml
js: |
  // @var greeting:string = "Hello!"
  
  // @action:Show Greeting
  alert(greeting);
  
  // @action:Change Color
  const colors = ['#3b82f6', '#ef4444', '#10b981'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  document.documentElement.style.setProperty('--primary-color', randomColor);
```

**Tips:**
- Use `@var` annotations to create editable variables
- Use `@action` annotations to create triggerable actions
- Access CSS variables using `document.documentElement.style.setProperty()`
- Keep JavaScript simple and focused

### Step 5: Test Your Component

1. Import your `.kcomponent` file into Karbonized
2. Add it to the canvas
3. Test all CSS variables by adjusting them in the properties panel
4. Test all custom actions by clicking the action buttons
5. Verify the component looks and behaves as expected

### Step 6: Validate Your Component

Before sharing your component, ensure:

- [ ] The required fields are present (`manifest.name` and `html`)
- [ ] Manifest has a name, and an author if you plan to share it
- [ ] YAML is valid and properly formatted
- [ ] CSS variables have correct type annotations
- [ ] JavaScript actions work correctly
- [ ] Component renders properly in Shadow DOM
- [ ] Description and tags are helpful for discovery

## Advanced Features

### Using the HTML Block API

Your JavaScript code has access to the `htmlBlockAPI` object:

```javascript
// Log to the dev console
htmlBlockAPI.log('Message');
htmlBlockAPI.warn('Warning');
htmlBlockAPI.error('Error');

// Force refresh the Shadow DOM
htmlBlockAPI.refresh();

// Get a CSS variable value
const color = htmlBlockAPI.getVariable('--primary-color');

// Set a CSS variable value
htmlBlockAPI.setVariable('--primary-color', '#ff0000');

// Register a custom action programmatically
htmlBlockAPI.registerAction('My Action', () => {
  // Action code
});
```

### Complex CSS Variables

You can create more complex variable definitions:

```css
/* Color with alpha transparency */
/* @type:color */
--bg-color: rgba(59, 130, 246, 0.5);

/* Number with different units */
/* @type:number min:0 max:100 step:5 unit:% */
--width: 50%;
/* @type:number min:0.5 max:3 step:0.1 unit:em */
--font-size: 1.5em;

/* Shadow with multiple values */
/* @type:shadow */
--complex-shadow: 4px 4px 8px rgba(0,0,0,0.3), -2px -2px 4px rgba(255,255,255,0.1);
```

### Multiple Actions

You can define multiple actions in your JavaScript:

```javascript
// @action:Action 1
// Code for action 1

// @action:Action 2
// Code for action 2

// @action:Action 3
// Code for action 3
```

Each action will appear as a separate button in the properties panel.

## Best Practices for Component Creation

### 1. Keep Components Focused
- Each component should have a single, clear purpose
- Avoid creating monolithic components that do too much

### 2. Use Semantic HTML
- Use proper HTML elements (`<button>`, `<input>`, etc.)
- Include accessibility attributes where needed
- Ensure proper heading hierarchy

### 3. Provide Good Defaults
- Set sensible default values for all CSS variables
- Make the component look good out of the box
- Ensure text is readable and interactive elements are obvious

### 4. Document Your Component
- Write clear, concise descriptions
- Use meaningful tags for discoverability
- Include version information

### 5. Test Thoroughly
- Test with different variable values
- Test all custom actions
- Test in different screen sizes if relevant
- Ensure no JavaScript errors in the console

### 6. Use Descriptive Names
- Use clear class names in HTML
- Use descriptive variable names
- Use meaningful action labels

### 7. Optimize Performance
- Keep CSS efficient
- Avoid expensive JavaScript operations
- Use CSS transitions instead of JavaScript animations when possible

## Sharing Components

You can export any component back to a `.kcomponent` file from the library
(the download button on its card), or export the block you are editing from
**Block Editor → Export .kcomponent**.


Once you've created and tested your component:

1. **Save the `.kcomponent` file** - Keep the source YAML file
2. **Document usage** - Create a README if your component is complex
3. **Version properly** - Use semantic versioning for updates
4. **Provide examples** - Show how to use your component effectively

## Troubleshooting

### Component Not Importing

- Read the error in the dialog: it names the offending field, and reports the
  line number for YAML syntax errors
- Check that `manifest.name` and `html` are present and that `html` is not empty
- Verify the file extension is `.kcomponent`, `.yaml` or `.yml`
- Check the size limits: 512 KB per section and 1 MB per file
- If the import says the component already exists, use **Replace in library**

### CSS Variables Not Working

- Check that type annotations are correct
- Ensure variables are defined in `:root`
- Verify variable names match in CSS and JavaScript

### JavaScript Actions Not Appearing

- Check that `@action` annotations are correct
- Ensure JavaScript syntax is valid
- Check for JavaScript errors in the dev console

### Component Not Rendering

- Check HTML syntax
- Ensure CSS is valid
- Verify JavaScript doesn't have errors that prevent rendering

## Resources

- [KComponent Format Documentation](./kcomponent-format.md) - Detailed format specification
- [HTML Blocks Documentation](./html-blocks.md) - HTML Block features and API
- [HTML Block API Documentation](./html-block-api.md) - Available API methods

## Example Workflow

Here's a complete workflow for creating and using a component:

1. **Create** a new file `my-button.kcomponent`
2. **Write** the YAML structure with manifest, HTML, CSS, and JS
3. **Test** by importing into Karbonized
4. **Iterate** based on testing results
5. **Refine** CSS variables and JavaScript actions
6. **Validate** all features work correctly
7. **Share** the `.kcomponent` file with others

By following this guide, you can create powerful, reusable custom components that integrate seamlessly with Karbonized's component system.
