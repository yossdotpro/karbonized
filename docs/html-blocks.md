# HTML Blocks Documentation

## Overview

HTML Blocks in Karbonized allow you to create custom components using HTML, CSS, and JavaScript. These blocks run in a secure Shadow DOM environment and provide powerful features like CSS variable controls and custom actions.

## Features

- **Secure Shadow DOM** execution
- **Live HTML/CSS/JavaScript editing**
- **Automatic CSS variable controls** generation
- **JavaScript variable controls** with typed inputs
- **Custom action buttons** for interactive functionality
- **Real-time preview** with auto-refresh
- **Responsive design** with resize capabilities

## Getting Started

1. Click the **HTML** button (globe icon) in the left panel
2. The HTML Block will be added to your workspace
3. Use the control panel to edit your content

## CSS Variables System

The HTML Block automatically detects CSS variables and creates corresponding controls in the panel.

### Variable Naming Conventions

| Pattern                                      | Type    | Control       | Example                                    |
| -------------------------------------------- | ------- | ------------- | ------------------------------------------ |
| `*color*`                                    | Color   | Color Picker  | `--primary-color: #3b82f6`                 |
| `*size*`, `*width*`, `*height*`, `*spacing*` | Number  | Slider        | `--text-size: 16px`                        |
| `*show*`, `*enable*`, `*visible*`            | Boolean | Switch        | `--show-border: true`                      |
| `*shadow*`, `*drop-shadow*`, `*box-shadow*`  | Shadow  | Shadow Editor | `--card-shadow: 0 2px 4px rgba(0,0,0,0.1)` |
| Hex values                                   | Color   | Color Picker  | `--accent: #ff5733`                        |
| Numbers                                      | Number  | Slider        | `--padding: 20`                            |

Annotated variables (`/* @type:color */`, `number`, `shadow`, `boolean` and
`icon`) take precedence over these naming rules; see
[`kcomponent-format.md`](kcomponent-format.md). `@type:icon` variables show an
icon picker and are drawn with `<span class="k-icon" style="--k-icon: var(--my-icon)"></span>`
(see [`icon-libraries.md`](icon-libraries.md)). Google fonts named in
`font-family` are loaded automatically.

### CSS Variable Example

```css
:root {
  --primary-color: #3b82f6;
  --text-size: 16px;
  --show-border: true;
  --spacing: 20px;
  --border-radius: 8px;
  --card-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.container {
  padding: var(--spacing);
  border: var(--show-border) ? 2px solid var(--primary-color) : none;
  border-radius: var(--border-radius);
  box-shadow: var(--card-shadow);
}

.title {
  color: var(--primary-color);
  font-size: var(--text-size);
}
```

This will automatically generate:

- Color picker for `--primary-color`
- Slider for `--text-size` and `--spacing`
- Switch for `--show-border`
- Slider for `--border-radius`
- Shadow Editor for `--card-shadow`

## JavaScript Variables System

The HTML Block also supports JavaScript variables with automatic control generation. These variables are defined using special comment syntax and provide typed editing interfaces.

### JavaScript Variable Syntax

```javascript
// @var variableName:type = value
```

### Supported Variable Types

| Type       | Control         | Example                                                                  | Description                   |
| ---------- | --------------- | ------------------------------------------------------------------------ | ----------------------------- |
| `string`   | Text input      | `// @var message:string = "Hello"`                                       | Basic text input field        |
| `number`   | Number slider   | `// @var count:number = 0`                                               | Slider with min/max/step      |
| `boolean`  | Toggle switch   | `// @var enabled:boolean = true`                                         | On/off switch                 |
| `color`    | Color picker    | `// @var accentColor:color = #ff6b6b`                                    | Color selection interface     |
| `gradient` | Gradient picker | `// @var bgGradient:gradient = linear-gradient(45deg, #667eea, #764ba2)` | Two-color gradient with angle |
| `url`      | URL input       | `// @var imageUrl:url = https://example.com`                             | Text input for URLs           |
| `object`   | Object editor   | `// @var config:object = {"theme": "dark"}`                              | Key-value pair editor         |
| `array`    | Array editor    | `// @var tags:array = ["react", "js"]`                                   | List items with badges        |

### JavaScript Variable Example

```javascript
// @var message:string = "Hello from JS Variables!"
// @var counter:number = 0
// @var isEnabled:boolean = true
// @var accentColor:color = #ff6b6b
// @var bgGradient:gradient = linear-gradient(45deg, #667eea, #764ba2)
// @var imageUrl:url = https://picsum.photos/200
// @var config:object = {"theme": "dark", "animations": true}
// @var tags:array = ["react", "javascript", "html"]

function updateDisplay() {
	const container = document.querySelector('.container');
	if (container) {
		container.style.background = isEnabled ? bgGradient : '#f8f9fa';
		container.style.color = isEnabled ? 'white' : 'black';
	}
}

// Initialize
updateDisplay();
```

### Integration with CSS

JavaScript variables can update CSS custom properties:

```javascript
// @var accentColor:color = #3b82f6

function updateCSSFromJS() {
	const rootElement = document.documentElement;
	rootElement.style.setProperty('--js-accent-color', accentColor);
}

// Call this function whenever accentColor changes
updateCSSFromJS();
```

Then in CSS:

```css
h1 {
	color: var(--js-accent-color);
}
```

## Custom Actions

Create interactive buttons by defining actions in your JavaScript code using the special comment syntax.

### Action Syntax

```javascript
// @action:Button Name
// JavaScript code to execute when button is clicked
```

### Action Example

```javascript
// @action:Change Background Color
document.body.style.backgroundColor =
	'#' + Math.floor(Math.random() * 16777215).toString(16);

// @action:Show Alert
alert('Hello from HTML Block!');

// @action:Fetch Data
fetch('https://api.example.com/data')
	.then((response) => response.json())
	.then((data) => {
		console.log('Data fetched:', data);
		document.getElementById('result').textContent = JSON.stringify(data);
	})
	.catch((error) => console.error('Error:', error));

// @action:Reset Form
document.getElementById('myForm').reset();
```

## Complete Examples

### Example 1: Static Card Component

```html
<div class="card">
	<div class="card-header">
		<h2 class="card-title">Sample Card</h2>
	</div>
	<div class="card-body">
		<p class="card-text">This is a sample card component for visual design.</p>
		<div class="card-button">Sample Button</div>
	</div>
</div>
```

```css
:root {
	/* @type:color */
	--card-bg: #ffffff;
	/* @type:color */
	--card-border: #e5e7eb;
	/* @type:color */
	--primary-color: #3b82f6;
	/* @type:color */
	--text-color: #1f2937;
	/* @type:number min:0 max:50 step:1 unit:px */
	--border-radius: 12px;
	/* @type:shadow */
	--shadow: 0px 2px 4px #000000;
	/* @type:boolean */
	--show-shadow: true;
}

.card {
	background: var(--card-bg);
	border: 2px solid var(--card-border);
	border-radius: var(--border-radius);
	box-shadow: var(--shadow);
	overflow: hidden;
	transition: all 0.3s ease;
}

.card.no-shadow {
	box-shadow: none;
}

.card-header {
	background: var(--primary-color);
	color: white;
	padding: 1rem;
}

.card-title {
	margin: 0;
	font-size: 1.25rem;
}

.card-body {
	padding: 1.5rem;
}

.card-text {
	color: var(--text-color);
	margin-bottom: 1rem;
}

.card-button {
	background: var(--primary-color);
	color: white;
	border: none;
	padding: 0.5rem 1rem;
	border-radius: 6px;
	cursor: pointer;
}

.card-button:hover {
	opacity: 0.9;
}

.card-button.active {
	background: var(--text-color);
}
```

```javascript
// @action:Randomize Colors
const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
const randomColor = colors[Math.floor(Math.random() * colors.length)];
document.documentElement.style.setProperty('--primary-color', randomColor);

// @action:Toggle Shadow
const currentShadow = getComputedStyle(document.documentElement)
	.getPropertyValue('--show-shadow')
	.trim();
const card = document.querySelector('.card');
if (currentShadow === 'true') {
	card.classList.add('no-shadow');
	document.documentElement.style.setProperty('--show-shadow', 'false');
} else {
	card.classList.remove('no-shadow');
	document.documentElement.style.setProperty('--show-shadow', 'true');
}

// @action:Highlight Card
document.querySelector('.card').style.border = '3px solid #3b82f6';

// @action:Reset Border
document.querySelector('.card').style.border = '2px solid #e5e7eb';
```

### Example 2: Data Dashboard Widget

```html
<div class="dashboard">
	<div class="dashboard-header">
		<h3>Live Dashboard</h3>
		<div class="metric" id="metric1">0</div>
	</div>
	<div class="dashboard-content">
		<div class="chart-container">
			<div class="chart-bar" style="height: 20%"></div>
			<div class="chart-bar" style="height: 40%"></div>
			<div class="chart-bar" style="height: 60%"></div>
			<div class="chart-bar" style="height: 80%"></div>
			<div class="chart-bar" style="height: 100%"></div>
		</div>
	</div>
</div>
```

```css
:root {
  --dashboard-bg: #f8fafc;
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --border-radius: 8px;
  --chart-color: #3b82f6;
  --animation-speed: 2s;
  --show-grid: true;
}

.dashboard {
  background: var(--dashboard-bg);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  font-family: Arial, sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.dashboard-header h3 {
  margin: 0;
  color: var(--secondary-color);
}

.metric {
  background: var(--primary-color);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: bold;
}

.chart-container {
  display: flex;
  align-items: end;
  height: 100px;
  gap: 8px;
  border: var(--show-grid) ? 1px dashed #e5e7eb : none;
  padding: 1rem;
}

.chart-bar {
  background: var(--chart-color);
  flex: 1;
  border-radius: 4px 4px 0 0;
}
```

```javascript
let counter = 0;
setInterval(() => {
	counter++;
	document.getElementById('metric1').textContent = counter;
}, 1000);

// @action:Randomize Chart
const bars = document.querySelectorAll('.chart-bar');
bars.forEach((bar) => {
	const randomHeight = Math.floor(Math.random() * 80) + 20;
	bar.style.height = randomHeight + '%';
});

// @action:Change Chart Color
const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
const randomColor = colors[Math.floor(Math.random() * colors.length)];
document.documentElement.style.setProperty('--chart-color', randomColor);

// @action:Reset Counter
counter = 0;
document.getElementById('metric1').textContent = counter;

// @action:Toggle Grid
const currentGrid = getComputedStyle(document.documentElement)
	.getPropertyValue('--show-grid')
	.trim();
document.documentElement.style.setProperty(
	'--show-grid',
	currentGrid === 'true' ? 'false' : 'true',
);
```

### Example 3: Form Component

```html
<div class="form-container">
	<form id="contactForm">
		<div class="form-group">
			<label for="name">Name:</label>
			<input type="text" id="name" name="name" required />
		</div>
		<div class="form-group">
			<label for="email">Email:</label>
			<input type="email" id="email" name="email" required />
		</div>
		<div class="form-group">
			<label for="message">Message:</label>
			<textarea id="message" name="message" rows="4"></textarea>
		</div>
		<button type="submit" class="submit-btn">Send Message</button>
	</form>
	<div id="formResult" class="form-result"></div>
</div>
```

```css
:root {
	--form-bg: #ffffff;
	--primary-color: #3b82f6;
	--text-color: #1f2937;
	--border-color: #d1d5db;
	--success-color: #10b981;
	--error-color: #ef4444;
	--border-radius: 8px;
	--form-padding: 2rem;
}

.form-container {
	background: var(--form-bg);
	border-radius: var(--border-radius);
	padding: var(--form-padding);
	border: 1px solid var(--border-color);
}

.form-group {
	margin-bottom: 1rem;
}

.form-group label {
	display: block;
	margin-bottom: 0.5rem;
	color: var(--text-color);
	font-weight: 500;
}

.form-group input,
.form-group textarea {
	width: 100%;
	padding: 0.75rem;
	border: 1px solid var(--border-color);
	border-radius: 4px;
	font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
	outline: none;
	border-color: var(--primary-color);
}

.submit-btn {
	background: var(--primary-color);
	color: white;
	border: none;
	padding: 0.75rem 1.5rem;
	border-radius: 4px;
	cursor: pointer;
	font-size: 1rem;
	width: 100%;
}

.submit-btn:hover {
	opacity: 0.9;
}

.form-result {
	margin-top: 1rem;
	padding: 1rem;
	border-radius: 4px;
	display: none;
}

.form-result.success {
	background: var(--success-color);
	color: white;
	display: block;
}

.form-result.error {
	background: var(--error-color);
	color: white;
	display: block;
}
```

```javascript
document.getElementById('contactForm').addEventListener('submit', function (e) {
	e.preventDefault();

	const formData = new FormData(this);
	const data = Object.fromEntries(formData);

	// Simulate form submission
	const resultDiv = document.getElementById('formResult');
	resultDiv.textContent = `Form submitted! Name: ${data.name}, Email: ${data.email}`;
	resultDiv.className = 'form-result success';

	setTimeout(() => {
		resultDiv.className = 'form-result';
	}, 3000);
});

// @action:Fill Sample Data
document.getElementById('name').value = 'John Doe';
document.getElementById('email').value = 'john@example.com';
document.getElementById('message').value = 'This is a sample message.';

// @action:Clear Form
document.getElementById('contactForm').reset();
document.getElementById('formResult').className = 'form-result';

// @action:Validate Form
const form = document.getElementById('contactForm');
if (form.checkValidity()) {
	alert('Form is valid!');
} else {
	alert('Please fill in all required fields.');
}
```

## Security Considerations

- HTML Blocks run in a secure Shadow DOM environment
- Shadow DOM provides encapsulation from the main document
- CSS and JavaScript are scoped to prevent conflicts with the parent page
- External resource loading follows standard browser security policies
- Always validate user inputs in your JavaScript code
- DOM access is limited to the Shadow DOM scope for safety

## Best Practices

1. **Use semantic HTML5** for better structure and accessibility
2. **Organize CSS variables** with clear naming conventions
3. **Add comments** to explain complex JavaScript logic
4. **Test actions thoroughly** before using them in production
5. **Use responsive design** principles for better mobile experience
6. **Optimize performance** by avoiding heavy computations in actions

## Troubleshooting

### Common Issues

1. **Variables not appearing in controls**
   - Ensure variables are defined in `:root` selector
   - Check variable naming follows conventions
   - Verify CSS syntax is correct

2. **Actions not working**
   - Check JavaScript syntax for errors
   - Ensure action comment format is correct: `// @action:Name`
   - Check browser console for error messages

3. **Styling not applying**
   - Verify CSS syntax is valid
   - Check if variables are properly referenced
   - Ensure CSS specificity is correct

4. **Shadow DOM not loading**
   - Check if Shadow DOM is properly initialized
   - Verify HTML syntax is valid
   - Check browser console for Shadow DOM errors

## API Reference

For complete API documentation, see [HTML Block API Reference](html-block-api.md).

### Variable Types Summary

#### CSS Variables

| Type    | Control      | Input Range                        |
| ------- | ------------ | ---------------------------------- |
| Color   | Color Picker | Any valid CSS color                |
| Number  | Slider       | Any numeric value (default 0-1000) |
| Boolean | Switch       | true/false                         |
| String  | Text Input   | Any text                           |

#### JavaScript Variables

| Type       | Control         | Features                     |
| ---------- | --------------- | ---------------------------- |
| `string`   | Text Input      | Basic text field             |
| `number`   | Slider          | Min/max/step configuration   |
| `boolean`  | Switch          | On/off toggle                |
| `color`    | Color Picker    | Color selection              |
| `gradient` | Gradient Picker | Two colors + angle           |
| `url`      | Text Input      | URL validation               |
| `object`   | Object Editor   | Key-value pairs + JSON mode  |
| `array`    | Array Editor    | Item badges + inline editing |

## Conclusion

HTML Blocks provide a powerful way to create custom interactive components in Karbonized. By leveraging CSS variables and custom actions, you can build sophisticated user interfaces with real-time editing capabilities.
For more examples and advanced usage patterns, refer to the example blocks included in the documentation or explore the community templates.
