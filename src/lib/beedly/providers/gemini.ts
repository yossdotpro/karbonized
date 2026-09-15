import { tryParseJson, parseSSE } from '../core/sse';
import { ProviderError } from '../core/errors';
import type {
	ChatMessage,
	ContentPart,
	FinishReason,
	ProviderAdapter,
	StreamEvent,
	Usage,
} from '../core/types';
import { createCallId, joinUrl } from './shared';

/**
 * Google Gemini API (generateContent with server-sent events).
 * https://ai.google.dev/api/generate-content
 */

// Provider JSON is loosely typed; fields are checked where they are read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

const signatureOf = (part: { providerMetadata?: Record<string, unknown> }) =>
	typeof part.providerMetadata?.thoughtSignature === 'string'
		? { thoughtSignature: part.providerMetadata.thoughtSignature }
		: {};

const toGeminiParts = (
	part: ContentPart,
	nativeCallIds: ReadonlySet<string>,
): Loose[] => {
	switch (part.type) {
		case 'text':
			return part.text === ''
				? []
				: [{ text: part.text, ...signatureOf(part) }];
		case 'image':
			return [{ inlineData: { mimeType: part.mimeType, data: part.data } }];
		case 'reasoning':
			// Thought summaries are not sent back; signatures travel on the parts.
			return [];
		case 'tool_call':
			return [
				{
					functionCall: {
						...(nativeCallIds.has(part.id) && { id: part.id }),
						name: part.name,
						args: typeof part.args === 'object' && part.args ? part.args : {},
					},
					...signatureOf(part),
				},
			];
		case 'tool_result': {
			const text = part.content
				.filter((item) => item.type === 'text')
				.map((item) => item.text)
				.join('\n');
			return [
				{
					functionResponse: {
						...(nativeCallIds.has(part.callId) && { id: part.callId }),
						name: part.name,
						response: part.isError ? { error: text } : { output: text },
					},
				},
				// Images of tool results follow as regular parts.
				...part.content
					.filter((item) => item.type === 'image')
					.map((item) => ({
						inlineData: { mimeType: item.mimeType, data: item.data },
					})),
			];
		}
	}
};

export const toGeminiContents = (messages: ChatMessage[]) => {
	const contents: Array<{ role: string; parts: Loose[] }> = [];
	// Newer models give calls an id that responses must repeat; generated ids
	// must not be sent.
	const nativeCallIds = new Set(
		messages.flatMap((message) =>
			message.content.flatMap((part) =>
				part.type === 'tool_call' && part.providerMetadata?.nativeId === true
					? [part.id]
					: [],
			),
		),
	);

	messages.forEach((message) => {
		const parts = message.content.flatMap((part) =>
			toGeminiParts(part, nativeCallIds),
		);
		if (parts.length === 0) return;

		const role = message.role === 'assistant' ? 'model' : 'user';
		const previous = contents[contents.length - 1];
		// Turns must alternate.
		if (previous?.role === role) previous.parts.push(...parts);
		else contents.push({ role, parts });
	});

	return contents;
};

const FINISH_REASONS: Record<string, FinishReason> = {
	STOP: 'stop',
	MAX_TOKENS: 'length',
	SAFETY: 'refusal',
	RECITATION: 'refusal',
	PROHIBITED_CONTENT: 'refusal',
	BLOCKLIST: 'refusal',
	SPII: 'refusal',
};

async function* parseStream(
	chunks: AsyncIterable<string>,
): AsyncGenerator<StreamEvent> {
	const content: ContentPart[] = [];
	let finishReason: FinishReason = 'other';
	const usage: Usage = {};

	const lastPart = () => content[content.length - 1];

	for await (const { data } of parseSSE(chunks)) {
		const chunk = tryParseJson(data) as Loose | undefined;
		if (!chunk) continue;

		if (chunk.error) {
			throw new ProviderError(
				'stream',
				String(chunk.error.message ?? 'The response stream failed.'),
			);
		}

		if (chunk.usageMetadata) {
			usage.inputTokens = chunk.usageMetadata.promptTokenCount;
			usage.outputTokens = chunk.usageMetadata.candidatesTokenCount;
		}

		const candidate = chunk.candidates?.[0];
		if (!candidate) {
			if (chunk.promptFeedback?.blockReason) finishReason = 'refusal';
			continue;
		}

		for (const part of (candidate.content?.parts as Loose[] | undefined) ??
			[]) {
			const metadata =
				typeof part.thoughtSignature === 'string'
					? { thoughtSignature: part.thoughtSignature }
					: undefined;

			if (part.functionCall) {
				const nativeId = typeof part.functionCall.id === 'string';
				const id = nativeId ? String(part.functionCall.id) : createCallId();
				const name = String(part.functionCall.name ?? '');
				const providerMetadata = {
					...metadata,
					...(nativeId && { nativeId: true }),
				};
				yield { type: 'tool-call-start', id, name };
				content.push({
					type: 'tool_call',
					id,
					name,
					args: part.functionCall.args ?? {},
					...(Object.keys(providerMetadata).length > 0 && { providerMetadata }),
				});
			} else if (typeof part.text === 'string') {
				const kind = part.thought ? 'reasoning' : 'text';
				const previous = lastPart();

				if (previous?.type === kind && !previous.providerMetadata) {
					previous.text += part.text;
					if (metadata) previous.providerMetadata = metadata;
				} else {
					content.push({
						type: kind,
						text: part.text,
						...(metadata && { providerMetadata: metadata }),
					});
				}

				if (part.text !== '') {
					yield {
						type: kind === 'text' ? 'text-delta' : 'reasoning-delta',
						text: part.text,
					};
				}
			}
		}

		if (candidate.finishReason) {
			finishReason = FINISH_REASONS[candidate.finishReason] ?? 'other';
		}
	}

	if (content.some((part) => part.type === 'tool_call')) {
		finishReason = 'tool_calls';
	}

	yield {
		type: 'done',
		message: { role: 'assistant', content },
		finishReason,
		usage,
	};
}

export const geminiAdapter: ProviderAdapter = {
	id: 'gemini',

	buildChatRequest: (connection, request) => ({
		url: joinUrl(
			connection.baseUrl,
			`/v1beta/models/${encodeURIComponent(request.model.replace(/^models\//, ''))}:streamGenerateContent?alt=sse`,
		),
		method: 'POST',
		headers: { 'content-type': 'application/json', ...connection.headers },
		auth: { header: 'x-goog-api-key' },
		body: JSON.stringify({
			systemInstruction: { parts: [{ text: request.system }] },
			contents: toGeminiContents(request.messages),
			...(request.tools.length > 0 && {
				tools: [
					{
						functionDeclarations: request.tools.map((tool) => ({
							name: tool.name,
							description: tool.description,
							parametersJsonSchema: tool.inputSchema,
						})),
					},
				],
			}),
			...(request.maxTokens && {
				generationConfig: { maxOutputTokens: request.maxTokens },
			}),
		}),
	}),

	parseChatStream: parseStream,

	buildModelsRequest: (connection) => ({
		url: joinUrl(connection.baseUrl, '/v1beta/models?pageSize=1000'),
		method: 'GET',
		headers: { ...connection.headers },
		auth: { header: 'x-goog-api-key' },
	}),

	parseModels: (body) =>
		(((body as Loose)?.models as Loose[] | undefined) ?? [])
			.filter(
				(model) =>
					typeof model.name === 'string' &&
					(model.supportedGenerationMethods ?? ['generateContent']).includes(
						'generateContent',
					),
			)
			.map((model) => ({
				id: (model.name as string).replace(/^models\//, ''),
				label:
					typeof model.displayName === 'string' ? model.displayName : undefined,
			})),

	parseError: (body) => {
		const json = tryParseJson(body);
		const error = (Array.isArray(json) ? json[0] : (json as Loose))?.error;
		return typeof error?.message === 'string' ? error.message : undefined;
	},
};
