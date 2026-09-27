import { KComponent } from '@/models/KComponent';
import { parseKComponentDocument } from './kcomponentParser';

/**
 * The bundled starter pack. The files are loaded lazily so the YAML never
 * reaches the main chunk: nothing is fetched until someone asks for the pack.
 */
const starterFiles = import.meta.glob('../assets/kcomponents/*.kcomponent', {
	query: '?raw',
	import: 'default',
}) as Record<string, () => Promise<string>>;

export const STARTER_PACK_SIZE = Object.keys(starterFiles).length;

/** Parses every bundled component, skipping any that fails to load. */
export async function loadStarterPack(): Promise<KComponent[]> {
	const entries = Object.entries(starterFiles).sort(([a], [b]) =>
		a.localeCompare(b),
	);

	const components: KComponent[] = [];

	for (const [path, load] of entries) {
		try {
			const { component, errors } = parseKComponentDocument(await load());

			if (component) components.push(component);
			else console.error(`Starter pack: ${path} — ${errors.join(' ')}`);
		} catch (error) {
			console.error(`Starter pack: could not load ${path}`, error);
		}
	}

	return components;
}
