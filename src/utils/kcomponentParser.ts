import * as yaml from 'js-yaml';
import { KComponent, KComponentManifest } from '@/models/KComponent';

export function parseKComponent(yamlContent: string): KComponent {
	try {
		const parsed = yaml.load(yamlContent) as any;

		if (!parsed) {
			throw new Error('Invalid YAML content');
		}

		// Validate required fields
		if (!parsed.manifest) {
			throw new Error('Missing manifest field');
		}
		if (!parsed.manifest.name) {
			throw new Error('Missing manifest.name field');
		}
		if (!parsed.html) {
			throw new Error('Missing html field');
		}
		if (!parsed.css) {
			throw new Error('Missing css field');
		}
		if (!parsed.js) {
			throw new Error('Missing js field');
		}

		return {
			manifest: {
				name: parsed.manifest.name,
				author: parsed.manifest.author,
				description: parsed.manifest.description,
				version: parsed.manifest.version,
				thumbnail: parsed.manifest.thumbnail,
				category: parsed.manifest.category,
				tags: parsed.manifest.tags,
			},
			html: parsed.html,
			css: parsed.css,
			js: parsed.js,
		};
	} catch (error) {
		throw new Error(
			`Failed to parse .kcomponent file: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

export function validateKComponentFile(content: string): {
	valid: boolean;
	error?: string;
} {
	try {
		parseKComponent(content);
		return { valid: true };
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

export function generateKComponentExample(): string {
	return `manifest:
  name: "My Custom Component"
  author: "Your Name"
  description: "A sample custom component with CSS variables"
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
  }
  
  .btn:hover {
    opacity: 0.9;
  }
  
  .btn.no-shadow {
    box-shadow: none;
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
`;
}

export function stringifyKComponent(component: KComponent): string {
	return yaml.dump(
		{
			manifest: {
				name: component.manifest.name,
				author: component.manifest.author,
				description: component.manifest.description,
				version: component.manifest.version,
				thumbnail: component.manifest.thumbnail,
				category: component.manifest.category,
				tags: component.manifest.tags,
			},
			html: component.html,
			css: component.css,
			js: component.js,
		},
		{
			lineWidth: -1,
			noRefs: true,
		},
	);
}
