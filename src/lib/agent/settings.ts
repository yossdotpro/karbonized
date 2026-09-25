import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAgentBridge } from './bridge';
import type { ProviderProfile } from './core/client';
import type { Transport } from './core/types';
import { ProviderError } from './core/errors';
import { getKeyStore } from './keys';
import { type ProviderKind, getPreset } from './providers/presets';
import { createBrowserTransport } from './transport/browser';
import { createElectronTransport } from './transport/electron';

/**
 * Agent settings: provider profiles (without keys) and the active one.
 */

interface AgentSettingsState {
	profiles: ProviderProfile[];
	activeProfileId: string | null;
	/** Profiles with a stored key (keys themselves live in the key store). */
	profilesWithKey: string[];
	/** `profilesWithKey` was read from the key store at least once. */
	keysChecked: boolean;
}

interface AgentSettingsActions {
	addProfile: (kind: ProviderKind) => ProviderProfile;
	updateProfile: (
		id: string,
		patch: Partial<Omit<ProviderProfile, 'id'>>,
	) => void;
	removeProfile: (id: string) => Promise<void>;
	setActiveProfile: (id: string) => void;
	saveKey: (id: string, key: string) => Promise<void>;
	removeKey: (id: string) => Promise<void>;
	/** Re-read which profiles have a key (keys may be removed outside). */
	refreshKeys: () => Promise<void>;
}

export type AgentSettings = AgentSettingsState & AgentSettingsActions;

const createProfileId = () =>
	`profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createProfile = (
	kind: ProviderKind,
	existing: readonly ProviderProfile[] = [],
): ProviderProfile => {
	const preset = getPreset(kind);
	const sameKind = existing.filter((profile) => profile.kind === kind).length;

	return {
		id: createProfileId(),
		name: sameKind === 0 ? preset.label : `${preset.label} ${sameKind + 1}`,
		kind,
		baseUrl: preset.defaultBaseUrl,
		model: preset.defaultModel,
		supportsImages: preset.supportsImages,
	};
};

export const useAgentSettings = create<AgentSettings>()(
	persist(
		(set, get) => ({
			profiles: [],
			activeProfileId: null,
			profilesWithKey: [],
			keysChecked: false,

			addProfile: (kind) => {
				const profile = createProfile(kind, get().profiles);
				set((state) => ({
					profiles: [...state.profiles, profile],
					activeProfileId: state.activeProfileId ?? profile.id,
				}));
				return profile;
			},

			updateProfile: (id, patch) => {
				set((state) => ({
					profiles: state.profiles.map((profile) =>
						profile.id === id ? { ...profile, ...patch } : profile,
					),
				}));
			},

			removeProfile: async (id) => {
				await getKeyStore().remove(id);
				set((state) => {
					const profiles = state.profiles.filter(
						(profile) => profile.id !== id,
					);
					return {
						profiles,
						profilesWithKey: state.profilesWithKey.filter(
							(item) => item !== id,
						),
						activeProfileId:
							state.activeProfileId === id
								? (profiles[0]?.id ?? null)
								: state.activeProfileId,
					};
				});
			},

			setActiveProfile: (id) => set({ activeProfileId: id }),

			saveKey: async (id, key) => {
				const trimmed = key.trim();
				if (trimmed === '') return get().removeKey(id);

				const profile = get().profiles.find((item) => item.id === id);
				await getKeyStore().set(
					id,
					trimmed,
					profile?.baseUrl.trim() ||
						getPreset(profile?.kind ?? 'openai').defaultBaseUrl,
				);
				set((state) => ({
					profilesWithKey: Array.from(new Set([...state.profilesWithKey, id])),
				}));
			},

			removeKey: async (id) => {
				await getKeyStore().remove(id);
				set((state) => ({
					profilesWithKey: state.profilesWithKey.filter((item) => item !== id),
				}));
			},

			refreshKeys: async () => {
				const store = getKeyStore();
				const results = await Promise.all(
					get().profiles.map(async (profile) =>
						(await store.has(
							profile.id,
							profile.baseUrl.trim() || getPreset(profile.kind).defaultBaseUrl,
						))
							? profile.id
							: null,
					),
				);
				set({
					profilesWithKey: results.filter((id): id is string => id !== null),
					keysChecked: true,
				});
			},
		}),
		{
			name: 'karbonized:beedly-settings', // legacy name, keeps saved settings,
			version: 1,
			partialize: ({ profiles, activeProfileId }) => ({
				profiles,
				activeProfileId,
			}),
		},
	),
);

export const getActiveProfile = (
	state: Pick<AgentSettingsState, 'profiles' | 'activeProfileId'>,
): ProviderProfile | undefined =>
	state.profiles.find((profile) => profile.id === state.activeProfileId) ??
	state.profiles[0];

/** Why a profile cannot be used yet, or null when it is ready. */
export const profileProblem = (
	profile: ProviderProfile | undefined,
	hasKey: boolean,
): string | null => {
	if (!profile) return 'Add a model provider to start.';
	if (profile.model.trim() === '') return 'Choose a model in Agent settings.';
	if (getPreset(profile.kind).requiresKey && !hasKey) {
		return `Add your ${getPreset(profile.kind).label} API key in Agent settings.`;
	}
	return null;
};

let transport: Transport | undefined;

/**
 * Stops a request that would go out without the key the provider needs.
 * Sent anyway, it comes back as the provider's own puzzling error — Gemini
 * answers "Method doesn't allow unregistered callers" with HTTP 403 — which
 * reads like a broken app rather than a key that was typed but never saved.
 */
const requireSavedKey =
	(inner: Transport): Transport =>
	async (request, context) => {
		const profile = useAgentSettings
			.getState()
			.profiles.find((item) => item.id === context.profileId);
		const preset = profile && getPreset(profile.kind);

		if (request.auth && profile !== undefined && preset?.requiresKey) {
			const baseUrl = profile.baseUrl.trim() || preset.defaultBaseUrl;
			if (!(await getKeyStore().has(profile.id, baseUrl))) {
				throw new ProviderError(
					'auth',
					`No ${preset.label} API key is saved. Add it in Agent settings and press Save.`,
				);
			}
		}

		return await inner(request, context);
	};

/** Electron main process when available, the page otherwise. */
export const getTransport = (): Transport => {
	if (transport) return transport;

	const bridge = getAgentBridge();
	transport = requireSavedKey(
		bridge
			? createElectronTransport(bridge)
			: createBrowserTransport((profileId) => getKeyStore().get(profileId)),
	);
	return transport;
};
