import type { JsonSchema, ToolContent } from '../tools/registry';

/**
 * Provider-neutral chat model. Adapters convert it to and from each
 * provider's wire format; the UI and the agent loop only see these types.
 */

/** Opaque data a provider needs back on the next request (e.g. signatures). */
export type ProviderMetadata = Record<string, unknown>;

export type ContentPart =
	| { type: 'text'; text: string; providerMetadata?: ProviderMetadata }
	/** `data` is base64 without the `data:` prefix. */
	| { type: 'image'; mimeType: string; data: string }
	| {
			type: 'reasoning';
			text: string;
			providerMetadata?: ProviderMetadata;
	  }
	| {
			type: 'tool_call';
			id: string;
			name: string;
			args: unknown;
			providerMetadata?: ProviderMetadata;
	  }
	| {
			type: 'tool_result';
			callId: string;
			name: string;
			content: ToolContent[];
			isError?: boolean;
	  };

export type ToolCallPart = Extract<ContentPart, { type: 'tool_call' }>;
export type ToolResultPart = Extract<ContentPart, { type: 'tool_result' }>;

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: ContentPart[];
}

export interface ToolSpec {
	name: string;
	description: string;
	inputSchema: JsonSchema;
}

export interface ChatRequest {
	model: string;
	system: string;
	messages: ChatMessage[];
	tools: ToolSpec[];
	maxTokens?: number;
}

export type FinishReason =
	'stop' | 'tool_calls' | 'length' | 'refusal' | 'other';

export interface Usage {
	inputTokens?: number;
	outputTokens?: number;
}

export type StreamEvent =
	| { type: 'text-delta'; text: string }
	| { type: 'reasoning-delta'; text: string }
	| { type: 'tool-call-start'; id: string; name: string }
	| { type: 'tool-call-delta'; id: string; argsText: string }
	| {
			type: 'done';
			message: ChatMessage;
			finishReason: FinishReason;
			usage?: Usage;
	  };

export interface ModelInfo {
	id: string;
	label?: string;
}

/** An HTTP request built by an adapter. The transport adds the API key. */
export interface HttpRequest {
	url: string;
	method: 'GET' | 'POST';
	headers: Record<string, string>;
	body?: string;
	/** Header that carries the API key, e.g. `authorization` with `Bearer`. */
	auth?: { header: string; scheme?: string };
}

export interface HttpResponse {
	status: number;
	ok: boolean;
	/** Decoded body chunks, in order. Can only be read once. */
	chunks: AsyncIterable<string>;
}

export interface TransportOptions {
	/** Provider profile whose API key goes into `auth`. */
	profileId: string;
	signal?: AbortSignal;
}

export type Transport = (
	request: HttpRequest,
	options: TransportOptions,
) => Promise<HttpResponse>;

export interface ProviderConnection {
	baseUrl: string;
	/** Extra headers of the preset (never secrets). */
	headers?: Record<string, string>;
}

export interface ProviderAdapter {
	id: 'anthropic' | 'openai' | 'gemini';
	buildChatRequest: (
		connection: ProviderConnection,
		request: ChatRequest,
	) => HttpRequest;
	parseChatStream: (
		chunks: AsyncIterable<string>,
	) => AsyncGenerator<StreamEvent>;
	buildModelsRequest: (connection: ProviderConnection) => HttpRequest;
	parseModels: (body: unknown) => ModelInfo[];
	/** Human readable message from an error response body. */
	parseError: (body: string) => string | undefined;
}
