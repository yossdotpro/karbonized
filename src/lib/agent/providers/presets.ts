import type { ProviderAdapter } from '../core/types';
import { anthropicAdapter } from './anthropic';
import { geminiAdapter } from './gemini';
import { openaiAdapter } from './openai';

export type ProviderKind =
	| 'anthropic'
	| 'openai'
	| 'gemini'
	| 'openrouter'
	| 'lmstudio'
	| 'ollama'
	| 'openai-compatible';

export interface ProviderPreset {
	kind: ProviderKind;
	label: string;
	adapter: ProviderAdapter;
	defaultBaseUrl: string;
	/** The provider refuses requests without a key. */
	requiresKey: boolean;
	/** Suggested model until the list is loaded. */
	defaultModel: string;
	/** Models of the provider usually accept images. */
	supportsImages: boolean;
	/** Runs on the user's machine. */
	local: boolean;
	headers?: Record<string, string>;
	keyPlaceholder?: string;
	keyUrl?: string;
	/** Shown when a request fails before reaching the server (web only). */
	corsHint?: string;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
	{
		kind: 'anthropic',
		label: 'Anthropic',
		adapter: anthropicAdapter,
		defaultBaseUrl: 'https://api.anthropic.com',
		requiresKey: true,
		defaultModel: 'claude-sonnet-5',
		supportsImages: true,
		local: false,
		keyPlaceholder: 'sk-ant-…',
		keyUrl: 'https://console.anthropic.com/settings/keys',
	},
	{
		kind: 'openai',
		label: 'OpenAI',
		adapter: openaiAdapter,
		defaultBaseUrl: 'https://api.openai.com/v1',
		requiresKey: true,
		defaultModel: 'gpt-5',
		supportsImages: true,
		local: false,
		keyPlaceholder: 'sk-…',
		keyUrl: 'https://platform.openai.com/api-keys',
	},
	{
		kind: 'gemini',
		label: 'Google Gemini',
		adapter: geminiAdapter,
		defaultBaseUrl: 'https://generativelanguage.googleapis.com',
		requiresKey: true,
		defaultModel: 'gemini-2.5-flash',
		supportsImages: true,
		local: false,
		keyPlaceholder: 'AIza…',
		keyUrl: 'https://aistudio.google.com/apikey',
	},
	{
		kind: 'openrouter',
		label: 'OpenRouter',
		adapter: openaiAdapter,
		defaultBaseUrl: 'https://openrouter.ai/api/v1',
		requiresKey: true,
		defaultModel: 'anthropic/claude-sonnet-5',
		supportsImages: true,
		local: false,
		headers: {
			'HTTP-Referer': 'https://github.com/yossdotpro/karbonized',
			'X-Title': 'Karbonized',
		},
		keyPlaceholder: 'sk-or-…',
		keyUrl: 'https://openrouter.ai/keys',
	},
	{
		kind: 'ollama',
		label: 'Ollama',
		adapter: openaiAdapter,
		defaultBaseUrl: 'http://localhost:11434/v1',
		requiresKey: false,
		defaultModel: 'qwen3',
		supportsImages: false,
		local: true,
		corsHint:
			'Make sure Ollama is running. On the web version, allow this site with the OLLAMA_ORIGINS environment variable and restart Ollama.',
	},
	{
		kind: 'lmstudio',
		label: 'LM Studio',
		adapter: openaiAdapter,
		defaultBaseUrl: 'http://localhost:1234/v1',
		requiresKey: false,
		defaultModel: '',
		supportsImages: false,
		local: true,
		corsHint:
			'Start the LM Studio server. On the web version, turn on "Enable CORS" in its server settings.',
	},
	{
		kind: 'openai-compatible',
		label: 'OpenAI-compatible',
		adapter: openaiAdapter,
		defaultBaseUrl: 'http://localhost:8000/v1',
		requiresKey: false,
		defaultModel: '',
		supportsImages: false,
		local: false,
		corsHint:
			'The server may not allow requests from browsers (CORS). Enable CORS on the server or use the desktop app.',
	},
];

export const getPreset = (kind: ProviderKind): ProviderPreset =>
	PROVIDER_PRESETS.find((preset) => preset.kind === kind) ??
	PROVIDER_PRESETS[0];
