import { KComponent } from '@/models/KComponent';
import {
	KComponentParseResult,
	parseKComponentDocument,
	slugifyComponentName,
	stringifyKComponent,
} from './kcomponentParser';

export const KCOMPONENT_FILE_ACCEPT = '.kcomponent,.yaml,.yml';

const KCOMPONENT_EXTENSIONS = ['.kcomponent', '.yaml', '.yml'];

/** True for files the import flow knows how to read. */
export const isKComponentFile = (file: File): boolean =>
	KCOMPONENT_EXTENSIONS.some((extension) =>
		file.name.toLowerCase().endsWith(extension),
	);

export interface KComponentFileResult extends KComponentParseResult {
	fileName: string;
}

const readFileAsText = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve((reader.result as string) ?? '');
		reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
		reader.readAsText(file);
	});

/** Reads and parses one file, turning read failures into parse errors. */
export async function readKComponentFile(
	file: File,
): Promise<KComponentFileResult> {
	try {
		const content = await readFileAsText(file);
		return { fileName: file.name, ...parseKComponentDocument(content) };
	} catch (error) {
		return {
			fileName: file.name,
			component: null,
			errors: [error instanceof Error ? error.message : 'Could not read file.'],
			warnings: [],
		};
	}
}

/** Reads a list of files in order, so results line up with the drop order. */
export async function readKComponentFiles(
	files: File[],
): Promise<KComponentFileResult[]> {
	const results: KComponentFileResult[] = [];
	for (const file of files) results.push(await readKComponentFile(file));
	return results;
}

/** Saves a component as a `.kcomponent` file. */
export function downloadKComponent(component: KComponent): void {
	const yamlContent = stringifyKComponent(component);
	const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = `${slugifyComponentName(component.manifest.name)}.kcomponent`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
