import { app, safeStorage } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Provider API keys, encrypted with the OS keychain (`safeStorage`) and
 * stored in the user data folder. Keys are decrypted only in this process,
 * right before a request; the renderer can store and delete them but never
 * read them back.
 *
 * Each key is bound to the origin of the base URL it was saved for, so page
 * code (e.g. a script in an HTML block) cannot send it anywhere else.
 */

interface StoredKey {
	/** Base64 of the encrypted key. */
	data: string;
	origin: string;
}

const keysFile = () => join(app.getPath('userData'), 'beedly-keys.json' /* legacy name, keeps saved keys */);

const PROFILE_ID = /^[\w-]{1,100}$/;

const assertProfileId = (profileId: unknown): string => {
	if (typeof profileId !== 'string' || !PROFILE_ID.test(profileId)) {
		throw new Error('Invalid profile id.');
	}
	return profileId;
};

export const originOf = (url: unknown): string => {
	try {
		const parsed = new URL(String(url));
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			throw new Error();
		}
		return parsed.origin;
	} catch {
		throw new Error('Invalid base URL.');
	}
};

const readAll = async (): Promise<Record<string, StoredKey>> => {
	try {
		const data = JSON.parse(await readFile(keysFile(), 'utf-8'));
		return typeof data === 'object' && data !== null ? data : {};
	} catch {
		return {};
	}
};

const writeAll = (data: Record<string, StoredKey>) =>
	writeFile(keysFile(), JSON.stringify(data), { mode: 0o600 });

export const setKey = async (
	profileId: unknown,
	key: unknown,
	baseUrl: unknown,
) => {
	const id = assertProfileId(profileId);
	const origin = originOf(baseUrl);
	if (typeof key !== 'string' || key.trim() === '') {
		throw new Error('The API key is empty.');
	}
	if (!safeStorage.isEncryptionAvailable()) {
		throw new Error('Secure storage is not available on this system.');
	}

	const data = await readAll();
	data[id] = {
		data: safeStorage.encryptString(key.trim()).toString('base64'),
		origin,
	};
	await writeAll(data);
};

export const removeKey = async (profileId: unknown) => {
	const id = assertProfileId(profileId);
	const data = await readAll();
	if (!(id in data)) return;
	delete data[id];
	await writeAll(data);
};

/** A key is stored for the profile and can be used with `baseUrl`. */
export const hasKey = async (profileId: unknown, baseUrl: unknown) => {
	const stored = (await readAll())[assertProfileId(profileId)];
	if (!stored) return false;
	try {
		return stored.origin === originOf(baseUrl);
	} catch {
		return false;
	}
};

/** The key of a profile for a request to `url`, if it was saved for its origin. */
export const getKeyFor = async (profileId: unknown, url: string) => {
	const stored = (await readAll())[assertProfileId(profileId)];
	if (!stored) return undefined;

	if (stored.origin !== originOf(url)) {
		throw new Error(
			`The API key was saved for ${stored.origin}. Save it again in Agent settings to use it with ${originOf(url)}.`,
		);
	}

	try {
		return safeStorage.decryptString(Buffer.from(stored.data, 'base64'));
	} catch {
		return undefined;
	}
};
