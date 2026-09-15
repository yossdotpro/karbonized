import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ImportedComponent, KComponent } from '@/models/KComponent';

interface KComponentState {
	importedComponents: ImportedComponent[];
	isImportDialogOpen: boolean;
}

interface KComponentActions {
	addImportedComponent: (component: KComponent) => string;
	componentExists: (name: string, author?: string) => boolean;
	removeImportedComponent: (id: string) => void;
	getImportedComponent: (id: string) => ImportedComponent | undefined;
	setImportDialogOpen: (open: boolean) => void;
	clearImportedComponents: () => void;
}

type KComponentStore = KComponentState & KComponentActions;

export const useKComponentStore = create<KComponentStore>()(
	persist(
		(set, get) => ({
			importedComponents: [],
			isImportDialogOpen: false,

			addImportedComponent: (component) => {
				const id = `kcomponent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				const importedComponent: ImportedComponent = {
					id,
					component,
					importedAt: new Date(),
				};
				set((state) => ({
					importedComponents: [...state.importedComponents, importedComponent],
				}));
				return id;
			},

			componentExists: (name, author) => {
				return get().importedComponents.some(
					(c) =>
						c.component.manifest.name === name &&
						c.component.manifest.author === author,
				);
			},

			removeImportedComponent: (id) => {
				set((state) => ({
					importedComponents: state.importedComponents.filter(
						(c) => c.id !== id,
					),
				}));
			},

			getImportedComponent: (id) => {
				return get().importedComponents.find((c) => c.id === id);
			},

			setImportDialogOpen: (open) => {
				set({ isImportDialogOpen: open });
			},

			clearImportedComponents: () => {
				set({ importedComponents: [] });
			},
		}),
		{
			name: 'kcomponent-storage',
		},
	),
);
