import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
	ImportedComponent,
	KComponent,
	KComponentManifest,
	getComponentKey,
} from '@/models/KComponent';

/** Imports are capped so the persisted library cannot fill up localStorage. */
export const MAX_IMPORTED_COMPONENTS = 200;

export type ImportOutcome = 'added' | 'replaced' | 'duplicate' | 'limit';

export interface ImportResult {
	name: string;
	outcome: ImportOutcome;
	id?: string;
}

interface KComponentState {
	importedComponents: ImportedComponent[];
	isImportDialogOpen: boolean;
	isGalleryOpen: boolean;
}

interface KComponentActions {
	addImportedComponent: (component: KComponent) => string;
	importComponents: (
		components: KComponent[],
		options?: { replace?: boolean },
	) => ImportResult[];
	componentExists: (name: string, author?: string) => boolean;
	findComponentByManifest: (
		manifest: KComponentManifest,
	) => ImportedComponent | undefined;
	updateComponent: (id: string, component: KComponent) => void;
	renameComponent: (id: string, name: string) => void;
	toggleFavorite: (id: string) => void;
	markComponentUsed: (id: string) => void;
	removeImportedComponent: (id: string) => void;
	getImportedComponent: (id: string) => ImportedComponent | undefined;
	setImportDialogOpen: (open: boolean) => void;
	setGalleryOpen: (open: boolean) => void;
	clearImportedComponents: () => void;
}

type KComponentStore = KComponentState & KComponentActions;

const createId = () =>
	`kcomponent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;

const createEntry = (component: KComponent): ImportedComponent => ({
	id: createId(),
	component,
	importedAt: new Date().toISOString(),
	usageCount: 0,
	favorite: false,
});

/** Older builds stored `importedAt` as a Date and had no usage metadata. */
const normalizeEntry = (entry: unknown): ImportedComponent | null => {
	if (typeof entry !== 'object' || entry === null) return null;

	const legacy = entry as Omit<Partial<ImportedComponent>, 'importedAt'> & {
		importedAt?: unknown;
	};
	if (!legacy.id || !legacy.component?.manifest?.name) return null;

	const importedAt =
		legacy.importedAt instanceof Date
			? legacy.importedAt.toISOString()
			: typeof legacy.importedAt === 'string'
				? legacy.importedAt
				: new Date().toISOString();

	return {
		id: legacy.id,
		component: {
			manifest: legacy.component.manifest,
			html: legacy.component.html ?? '',
			css: legacy.component.css ?? '',
			js: legacy.component.js ?? '',
		},
		preview: legacy.preview,
		importedAt,
		updatedAt: legacy.updatedAt,
		lastUsedAt: legacy.lastUsedAt,
		usageCount: legacy.usageCount ?? 0,
		favorite: legacy.favorite ?? false,
	};
};

const normalizeEntries = (value: unknown): ImportedComponent[] =>
	Array.isArray(value)
		? value
				.map(normalizeEntry)
				.filter((entry): entry is ImportedComponent => entry !== null)
		: [];

export const useKComponentStore = create<KComponentStore>()(
	persist(
		(set, get) => ({
			importedComponents: [],
			isImportDialogOpen: false,
			isGalleryOpen: false,

			addImportedComponent: (component) => {
				const entry = createEntry(component);
				set((state) => ({
					importedComponents: [...state.importedComponents, entry],
				}));
				return entry.id;
			},

			importComponents: (components, options) => {
				const results: ImportResult[] = [];

				set((state) => {
					const library = [...state.importedComponents];

					for (const component of components) {
						const key = getComponentKey(component.manifest);
						const index = library.findIndex(
							(item) => getComponentKey(item.component.manifest) === key,
						);

						if (index >= 0) {
							if (!options?.replace) {
								results.push({
									name: component.manifest.name,
									outcome: 'duplicate',
									id: library[index].id,
								});
								continue;
							}

							library[index] = {
								...library[index],
								component,
								updatedAt: new Date().toISOString(),
							};
							results.push({
								name: component.manifest.name,
								outcome: 'replaced',
								id: library[index].id,
							});
							continue;
						}

						if (library.length >= MAX_IMPORTED_COMPONENTS) {
							results.push({ name: component.manifest.name, outcome: 'limit' });
							continue;
						}

						const entry = createEntry(component);
						library.push(entry);
						results.push({
							name: component.manifest.name,
							outcome: 'added',
							id: entry.id,
						});
					}

					return { importedComponents: library };
				});

				return results;
			},

			componentExists: (name, author) =>
				get().importedComponents.some(
					(item) =>
						getComponentKey(item.component.manifest) ===
						getComponentKey({ name, author }),
				),

			findComponentByManifest: (manifest) => {
				const key = getComponentKey(manifest);
				return get().importedComponents.find(
					(item) => getComponentKey(item.component.manifest) === key,
				);
			},

			updateComponent: (id, component) => {
				set((state) => ({
					importedComponents: state.importedComponents.map((item) =>
						item.id === id
							? { ...item, component, updatedAt: new Date().toISOString() }
							: item,
					),
				}));
			},

			renameComponent: (id, name) => {
				const trimmed = name.trim();
				if (!trimmed) return;

				set((state) => ({
					importedComponents: state.importedComponents.map((item) =>
						item.id === id
							? {
									...item,
									component: {
										...item.component,
										manifest: { ...item.component.manifest, name: trimmed },
									},
									updatedAt: new Date().toISOString(),
								}
							: item,
					),
				}));
			},

			toggleFavorite: (id) => {
				set((state) => ({
					importedComponents: state.importedComponents.map((item) =>
						item.id === id ? { ...item, favorite: !item.favorite } : item,
					),
				}));
			},

			markComponentUsed: (id) => {
				set((state) => ({
					importedComponents: state.importedComponents.map((item) =>
						item.id === id
							? {
									...item,
									usageCount: item.usageCount + 1,
									lastUsedAt: new Date().toISOString(),
								}
							: item,
					),
				}));
			},

			removeImportedComponent: (id) => {
				set((state) => ({
					importedComponents: state.importedComponents.filter(
						(item) => item.id !== id,
					),
				}));
			},

			getImportedComponent: (id) =>
				get().importedComponents.find((item) => item.id === id),

			setImportDialogOpen: (open) => set({ isImportDialogOpen: open }),

			setGalleryOpen: (open) => set({ isGalleryOpen: open }),

			clearImportedComponents: () => set({ importedComponents: [] }),
		}),
		{
			name: 'kcomponent-storage',
			version: 1,
			/* Dialog flags are session state, only the library is worth persisting. */
			partialize: (state) => ({
				importedComponents: state.importedComponents,
			}),
			migrate: (persisted) => persisted as KComponentState,
			/* Normalizing here covers both migrated and same-version payloads. */
			merge: (persisted, current) => ({
				...current,
				importedComponents: normalizeEntries(
					(persisted as Partial<KComponentState> | undefined)
						?.importedComponents,
				),
			}),
		},
	),
);

/** Every category present in the library, sorted, without duplicates. */
export const selectCategories = (state: KComponentStore): string[] =>
	Array.from(
		new Set(
			state.importedComponents
				.map((item) => item.component.manifest.category?.trim())
				.filter((category): category is string => Boolean(category)),
		),
	).sort((a, b) => a.localeCompare(b));
