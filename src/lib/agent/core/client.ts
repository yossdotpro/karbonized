import { getPreset, type ProviderKind } from '../providers/presets';
import { ProviderError, errorFromResponse, readBody } from './errors';
import { tryParseJson } from './sse';
import type {
	ChatRequest,
	HttpRequest,
	HttpResponse,
	ModelInfo,
	StreamEvent,
	Transport,
} from './types';

/** A configured provider. The API key is stored separately, by `id`. */
export interface ProviderProfile {
	id: string;
	name: string;
	kind: ProviderKind;
	baseUrl: string;
	model: string;
	/** The model accepts images (canvas snapshots). */
	supportsImages: boolean;
}

const connectionOf = (profile: ProviderProfile) => {
	const preset = getPreset(profile.kind);
	return {
		preset,
		connection: {
			baseUrl: profile.baseUrl.trim() || preset.defaultBaseUrl,
			headers: preset.headers,
		},
	};
};

const send = async (
	profile: ProviderProfile,
	transport: Transport,
	request: HttpRequest,
	signal?: AbortSignal,
): Promise<HttpResponse> => {
	const { preset } = connectionOf(profile);
	let response: HttpResponse;

	try {
		response = await transport(request, { profileId: profile.id, signal });
	} catch (error) {
		if (error instanceof ProviderError && error.kind === 'network') {
			throw new ProviderError(
				'network',
				[error.message, preset.corsHint].filter(Boolean).join(' '),
			);
		}
		throw error;
	}

	if (!response.ok) {
		throw errorFromResponse(
			response.status,
			await readBody(response),
			preset.adapter.parseError,
		);
	}
	return response;
};

export async function* streamChat(
	profile: ProviderProfile,
	transport: Transport,
	request: Omit<ChatRequest, 'model'>,
	signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
	const { preset, connection } = connectionOf(profile);
	const httpRequest = preset.adapter.buildChatRequest(connection, {
		...request,
		model: profile.model,
	});

	const response = await send(profile, transport, httpRequest, signal);
	yield* preset.adapter.parseChatStream(response.chunks);
}

export const listModels = async (
	profile: ProviderProfile,
	transport: Transport,
	signal?: AbortSignal,
): Promise<ModelInfo[]> => {
	const { preset, connection } = connectionOf(profile);
	const response = await send(
		profile,
		transport,
		preset.adapter.buildModelsRequest(connection),
		signal,
	);

	const body = tryParseJson(await readBody(response));
	if (body === undefined) {
		throw new ProviderError('bad-request', 'The model list is not valid JSON.');
	}
	return preset.adapter.parseModels(body);
};
