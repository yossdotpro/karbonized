import localforage from 'localforage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
	type BrandKit,
	EMPTY_BRAND_KIT,
	normalizeBrandKit,
} from '@/lib/brand/brand-kit';

/**
 * The brand kit (`src/lib/brand/brand-kit.ts`). Kept in IndexedDB: logos are
 * data URLs and would not fit in localStorage.
 */

interface BrandState {
	kit: BrandKit;
	/** The stored kit has been read. */
	hydrated: boolean;
	setKit: (kit: BrandKit) => void;
	updateKit: (patch: Partial<BrandKit>) => void;
}

const storage = localforage.createInstance({
	name: 'karbonized',
	storeName: 'brand',
});

export const useBrandStore = create<BrandState>()(
	persist(
		(set) => ({
			kit: EMPTY_BRAND_KIT,
			hydrated: false,
			setKit: (kit) => set({ kit: normalizeBrandKit(kit) }),
			updateKit: (patch) =>
				set((state) => ({
					kit: normalizeBrandKit({ ...state.kit, ...patch }),
				})),
		}),
		{
			name: 'karbonized:brand-kit',
			storage: createJSONStorage(() => storage),
			partialize: ({ kit }) => ({ kit }),
			merge: (persisted, current) => ({
				...current,
				kit: normalizeBrandKit((persisted as { kit?: unknown })?.kit),
			}),
			onRehydrateStorage: () => () => {
				useBrandStore.setState({ hydrated: true });
			},
		},
	),
);
