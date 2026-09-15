import { app, safeStorage } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Provider API keys, encrypted with the OS keychain (`safeStorage`) and
 * stored in the user data folder. Keys are decrypted only in this process,
 * right before a request; the renderer can store and delete them but never
 * read them back.
 */

const keysFile = () => join(app.getPath('userData'), 'beedly-keys.json');

const PROFILE_ID = /^[\w-]{1,100}$/;

const assertProfileId = (profileId: unknown): string => {
	if (typeof profileId !== 'string' || !PROFILE_ID.test(profileId)) {
		throw new Error('Invalid profile id.');
	}
	return profileId;
};

const readAll = async (): Promise<Record<string, string>> => {
	try {
		const data = JSON.parse(await readFile(keysFile(), 'utf-8'));
		return typeof data === 'object' && data !== null ? data : {};
	} catch {
		return {};
	}
};

const writeAll = (data: Record<string, string>) =>
	writeFile(keysFile(), JSON.stringify(data), { mode: 0o600 });

export const setKey = async (profileId: unknown, key: unknown) => {
	const id = assertProfileId(profileId);
	if (typeof key !== 'string' || key.trim() === '') {
		throw new Error('The API key is empty.');
	}
	if (!safeStorage.isEncryptionAvailable()) {
		throw new Error('Secure storage is not available on this system.');
	}

	const data = await readAll();
	data[id] = safeStorage.encryptString(key.trim()).toString('base64');
	await writeAll(data);
};

export const removeKey = async (profileId: unknown) => {
	const id = assertProfileId(profileId);
	const data = await readAll();
	if (!(id in data)) return;
	delete data[id];
	await writeAll(data);
};

export const hasKey = async (profileId: unknown) =>
	assertProfileId(profileId) in (await readAll());

export const getKey = async (profileId: unknown) => {
	const encrypted = (await readAll())[assertProfileId(profileId)];
	if (!encrypted) return undefined;

	try {
		return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
	} catch {
		return undefined;
	}
};
