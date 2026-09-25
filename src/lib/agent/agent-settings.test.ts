import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentBridge, HttpBridgeEvent } from './bridge';
import { AsyncQueue } from './core/async-queue';
import { ProviderError } from './core/errors';
import { collect } from './test-utils';
import {
	createProfile,
	getActiveProfile,
	profileProblem,
	useAgentSettings,
} from './settings';
import { createElectronTransport } from './transport/electron';

vi.mock('./keys', () => {
	const keys = new Map<string, string>();
	return {
		getKeyStore: () => ({
			readable: true,
			set: async (id: string, key: string, baseUrl: string) =>
				void keys.set(id, `${baseUrl}|${key}`),
			remove: async (id: string) => void keys.delete(id),
			has: async (id: string) => keys.has(id),
			get: async (id: string) => keys.get(id),
		}),
	};
});

describe('AsyncQueue', () => {
	it('delivers pushed items to waiting and later readers', async () => {
		const queue = new AsyncQueue<number>();
		const reading = collect(queue);
		queue.push(1);
		queue.push(2);
		queue.end();
		queue.push(3);
		expect(await reading).toEqual([1, 2]);
	});

	it('rejects readers when it fails', async () => {
		const queue = new AsyncQueue<number>();
		queue.push(1);
		queue.fail(new Error('boom'));
		await expect(collect(queue)).rejects.toThrow('boom');
	});
});

describe('settings store', () => {
	beforeEach(() => {
		useAgentSettings.setState({
			profiles: [],
			activeProfileId: null,
			profilesWithKey: [],
		});
	});

	it('creates profiles from presets and activates the first one', () => {
		const store = useAgentSettings.getState();
		const first = store.addProfile('anthropic');
		const second = useAgentSettings.getState().addProfile('anthropic');

		expect(first).toMatchObject({
			name: 'Anthropic',
			baseUrl: 'https://api.anthropic.com',
			supportsImages: true,
		});
		expect(second.name).toBe('Anthropic 2');
		expect(useAgentSettings.getState().activeProfileId).toBe(first.id);
		expect(createProfile('ollama').supportsImages).toBe(false);
	});

	it('tracks keys and switches the active profile when removed', async () => {
		const a = useAgentSettings.getState().addProfile('openai');
		const b = useAgentSettings.getState().addProfile('ollama');

		await useAgentSettings.getState().saveKey(a.id, '  sk-test  ');
		expect(useAgentSettings.getState().profilesWithKey).toEqual([a.id]);

		await useAgentSettings.getState().refreshKeys();
		expect(useAgentSettings.getState().profilesWithKey).toEqual([a.id]);

		await useAgentSettings.getState().removeProfile(a.id);
		const state = useAgentSettings.getState();
		expect(state.activeProfileId).toBe(b.id);
		expect(state.profilesWithKey).toEqual([]);
		expect(getActiveProfile(state)?.id).toBe(b.id);
	});

	it('explains why a profile is not ready', () => {
		const openai = createProfile('openai');
		expect(profileProblem(undefined, false)).toMatch(/Add a model provider/);
		expect(profileProblem(openai, false)).toMatch(/OpenAI API key/);
		expect(profileProblem(openai, true)).toBeNull();
		expect(profileProblem(createProfile('lmstudio'), false)).toMatch(
			/Choose a model/,
		);
		expect(profileProblem({ ...createProfile('ollama') }, false)).toBeNull();
	});
});

describe('electron transport', () => {
	const fakeBridge = () => {
		const listeners = new Set<(event: HttpBridgeEvent) => void>();
		const emit = (event: HttpBridgeEvent) =>
			listeners.forEach((listener) => listener(event));
		const request = vi.fn();
		const abort = vi.fn();
		const bridge = {
			http: {
				request,
				abort,
				onEvent: (listener: (event: HttpBridgeEvent) => void) => {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
			},
		} as unknown as AgentBridge;
		return { bridge, emit, request, abort, listeners };
	};

	const httpRequest = {
		url: 'https://api.test',
		method: 'POST' as const,
		headers: {},
		auth: { header: 'x-api-key' },
	};

	it('streams the response of the main process', async () => {
		const { bridge, emit, request, listeners } = fakeBridge();
		const pending = createElectronTransport(bridge)(httpRequest, {
			profileId: 'p1',
		});

		const [requestId, profileId] = request.mock.calls[0];
		expect(profileId).toBe('p1');
		emit({ requestId: 'other', type: 'response', status: 500, ok: false });
		emit({ requestId, type: 'response', status: 200, ok: true });
		emit({ requestId, type: 'chunk', chunk: 'Hel' });
		emit({ requestId, type: 'chunk', chunk: 'lo' });
		emit({ requestId, type: 'end' });

		const response = await pending;
		expect(response.status).toBe(200);
		expect((await collect(response.chunks)).join('')).toBe('Hello');
		expect(listeners.size).toBe(0);
	});

	it('reports network errors and aborts', async () => {
		const { bridge, emit, request, abort } = fakeBridge();
		const transport = createElectronTransport(bridge);

		const failing = transport(httpRequest, { profileId: 'p1' });
		emit({
			requestId: request.mock.calls[0][0],
			type: 'error',
			message: 'fetch failed: ECONNREFUSED',
		});
		await expect(failing).rejects.toBeInstanceOf(ProviderError);

		const controller = new AbortController();
		const aborted = transport(httpRequest, {
			profileId: 'p1',
			signal: controller.signal,
		});
		controller.abort();
		await expect(aborted).rejects.toMatchObject({ name: 'AbortError' });
		expect(abort).toHaveBeenCalledWith(request.mock.calls[1][0]);
	});
});
