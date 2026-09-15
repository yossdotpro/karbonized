import localforage from 'localforage';
import { getBeedlyBridge } from './bridge';

/**
 * API keys of provider profiles. They stay on the device and are never
 * logged:
 * - Electron: encrypted by the main process with the OS keychain
 *   (`safeStorage`); the page can store or delete a key but not read it.
 * - Web, Android, Tauri: IndexedDB of this site, readable by the page.
 */
export interface KeyStore {
	/** True when keys can be read back by the page (web). */
	readable: boolean;
	/** On desktop the key only works with the origin of `baseUrl`. */
	set: (profileId: string, key: string, baseUrl: string) => Promise<void>;
	remove: (profileId: string) => Promise<void>;
	has: (profileId: string, baseUrl: string) => Promise<boolean>;
	/** Web only; undefined on Electron. */
	get: (profileId: string) => Promise<string | undefined>;
}

let webStorage: LocalForage | undefined;
const storage = () => {
	webStorage ??= localforage.createInstance({
		name: 'karbonized',
		storeName: 'beedly-keys',
	});
	return webStorage;
};

const webKeyStore: KeyStore = {
	readable: true,
	set: async (profileId, key) => {
		await storage().setItem(profileId, key);
	},
	remove: async (profileId) => {
		await storage().removeItem(profileId);
	},
	has: async (profileId) => Boolean(await storage().getItem(profileId)),
	get: async (profileId) =>
		(await storage().getItem<string>(profileId)) ?? undefined,
};

export const getKeyStore = (): KeyStore => {
	const bridge = getBeedlyBridge();
	if (!bridge) return webKeyStore;

	return {
		readable: false,
		set: bridge.keys.set,
		remove: bridge.keys.remove,
		has: bridge.keys.has,
		get: async () => undefined,
	};
};
