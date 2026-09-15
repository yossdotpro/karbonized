# .kcomponent File Format

## Overview

The `.kcomponent` file format is a YAML-based format for defining custom components that can be imported into Karbonized. It contains a manifest with metadata and the component's HTML, CSS, and JavaScript code.

## File Structure

A `.kcomponent` file is a YAML file with the following structure:

```yaml
manifest:
  name: "Component Name"
  author: "Author Name"
  description: "Component description"
  version: "1.0.0"
  category: "Category Name"
  tags:
    - "tag1"
    - "tag2"

html: |
  <div class="component">
    <!-- HTML content -->
  </div>

css: |
  :root {
    /* CSS variables with type annotations */
    /* @type:color */
    --primary-color: #3b82f6;
    /* @type:number min:0 max:50 step:1 unit:px */
    --spacing: 16px;
  }

js: |
  // JavaScript code
  // @var variable:type = "value"
  // @action:Action Label
  // action code
```

## Manifest Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | The name of the component |
| `author` | string | No | The author of the component |
| `description` | string | No | A brief description of the component |
| `version` | string | No | Version following semantic versioning (e.g., "1.0.0") |
| `category` | string | No | Category for organizing components (e.g., "UI Components", "Forms") |
| `tags` | array of strings | No | Tags for searching and filtering components |

## HTML Section

The `html` field contains the HTML markup for the component. This HTML will be rendered within a Shadow DOM to prevent style conflicts with other components.

Example:

```yaml
html: |
  <div class="custom-button">
    <button class="btn">Click Me</button>
  </div>
```

## CSS Section

The `css` field contains the CSS styles for the component. Karbonized supports a special system of CSS variables with type annotations that automatically generate UI controls in the properties panel.

### CSS Variable Types

#### Color Variables

```css
/* @type:color */
--primary-color: #3b82f6;
```

Generates a color picker in the properties panel.

#### Number Variables

```css
/* @type:number min:0 max:50 step:1 unit:px */
--border-radius: 8px;
```

Generates a slider control with the specified range and unit.

Parameters:
- `min`: Minimum value
- `max`: Maximum value
- `step`: Increment step
- `unit`: Unit to display (e.g., "px", "em", "%")

#### Shadow Variables

```css
/* @type:shadow */
--box-shadow: 0px 2px 4px rgba(0,0,0,0.2);
```

Generates a shadow editor in the properties panel.

#### Boolean Variables

```css
/* @type:boolean */
--show-shadow: true;
```

Generates a toggle switch in the properties panel.

### Example CSS

```yaml
css: |
  :root {
    /* @type:color */
    --btn-color: #3b82f6;
    /* @type:color */
    --btn-text: #ffffff;
    /* @type:number min:0 max:50 step:1 unit:px */
    --btn-radius: 8px;
    /* @type:number min:8 max:32 step:1 unit:px */
    --btn-padding: 12px;
    /* @type:shadow */
    --btn-shadow: 0px 2px 4px rgba(0,0,0,0.2);
    /* @type:boolean */
    --show-shadow: true;
  }
  
  .btn {
    background: var(--btn-color);
    color: var(--btn-text);
    padding: var(--btn-padding) 24px;
    border-radius: var(--btn-radius);
    box-shadow: var(--btn-shadow);
  }
```

## JavaScript Section

The `js` field contains JavaScript code that can interact with the component and the Karbonized environment.

### JavaScript Variables

You can define JavaScript variables that will appear in the properties panel:

```javascript
// @var message:string = "Hello!"
```

This creates a text input in the properties panel for the `message` variable.

### Custom Actions

You can define custom actions that can be triggered from the component or the properties panel:

```javascript
// @action:Show Alert
alert(message);
```

This creates a button labeled "Show Alert" in the properties panel that executes the code.

### HTML Block API

The JavaScript code has access to the `htmlBlockAPI` object with the following methods:

- `log(message)`: Log a message to the dev console
- `warn(message)`: Log a warning
- `error(message)`: Log an error
- `refresh()`: Force refresh the Shadow DOM
- `registerAction(label, callback)`: Register a custom action
- `getVariable(name)`: Get the value of a CSS variable
- `setVariable(name, value)`: Set the value of a CSS variable

### Example JavaScript

```yaml
js: |
  // @var message:string = "Hello from custom component!"
  
  // @action:Show Alert
  alert(message);
  
  // @action:Change Color
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  document.documentElement.style.setProperty('--btn-color', randomColor);
```

## Complete Example

```yaml
manifest:
  name: "Custom Button"
  author: "Your Name"
  description: "A customizable button component"
  version: "1.0.0"
  category: "UI Components"
  tags:
    - "button"
    - "interactive"

html: |
  <div class="custom-button">
    <button class="btn">Click Me</button>
  </div>

css: |
  :root {
    /* @type:color */
    --btn-color: #3b82f6;
    /* @type:color */
    --btn-text: #ffffff;
    /* @type:number min:0 max:50 step:1 unit:px */
    --btn-radius: 8px;
    /* @type:number min:8 max:32 step:1 unit:px */
    --btn-padding: 12px;
    /* @type:number min:12 max:24 step:1 unit:px */
    --btn-font-size: 16px;
    /* @type:shadow */
    --btn-shadow: 0px 2px 4px rgba(0,0,0,0.2);
    /* @type:boolean */
    --show-shadow: true;
  }
  
  .custom-button {
    padding: 20px;
  }
  
  .btn {
    background: var(--btn-color);
    color: var(--btn-text);
    border: none;
    padding: var(--btn-padding) 24px;
    border-radius: var(--btn-radius);
    cursor: pointer;
    font-size: var(--btn-font-size);
    transition: opacity 0.2s;
    box-shadow: var(--btn-shadow);
  }
  
  .btn:hover {
    opacity: 0.9;
  }

js: |
  // @var message:string = "Hello from custom component!"
  
  // @action:Show Alert
  alert(message);
  
  // @action:Change Color
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  document.documentElement.style.setProperty('--btn-color', randomColor);
  
  // @action:Toggle Shadow
  const currentShadow = getComputedStyle(document.documentElement)
    .getPropertyValue('--show-shadow')
    .trim();
  const btn = document.querySelector('.btn');
  if (currentShadow === 'true') {
    btn.classList.add('no-shadow');
    document.documentElement.style.setProperty('--show-shadow', 'false');
  } else {
    btn.classList.remove('no-shadow');
    document.documentElement.style.setProperty('--show-shadow', 'true');
  }
```

## Validation Rules

- The `manifest` field is required
- `manifest.name` is required
- `html`, `css`, and `js` fields are required
- The YAML must be valid
- All fields must use the correct syntax

## Best Practices

1. **Use Shadow DOM-safe CSS**: Since components render in Shadow DOM, avoid relying on global styles
2. **Use CSS Variables**: Leverage the variable system for easy customization
3. **Provide meaningful descriptions**: Help users understand what your component does
4. **Use appropriate tags**: Make your components discoverable through search
5. **Version your components**: Use semantic versioning to track changes
6. **Test actions**: Ensure all custom actions work correctly
7. **Provide sensible defaults**: Set reasonable default values for CSS variables
