/**
 * Remove API keys from text before it is shown or logged (error messages
 * sometimes echo request headers or URLs).
 */

export const REDACTED = '[redacted]';

const RULES: Array<[RegExp, string]> = [
	// OpenAI, Anthropic (sk-ant-…) and OpenRouter (sk-or-…) keys
	[/\bsk-[A-Za-z0-9_-]{12,}/g, REDACTED],
	// Google keys
	[/\bAIza[0-9A-Za-z_-]{20,}/g, REDACTED],
	[/\b(Bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi, `$1 ${REDACTED}`],
	[
		/\b(x-api-key|x-goog-api-key|api[_-]?key)(["']?\s*[:=]\s*["']?)[^\s"'&,}]{8,}/gi,
		`$1$2${REDACTED}`,
	],
	[/([?&]key=)[^&\s]{8,}/g, `$1${REDACTED}`],
];

export const redactSecrets = (
	text: string,
	secrets: readonly string[] = [],
): string => {
	let result = text;

	secrets
		.filter((secret) => secret.length >= 4)
		.forEach((secret) => {
			result = result.split(secret).join(REDACTED);
		});

	RULES.forEach(([pattern, replacement]) => {
		result = result.replace(pattern, replacement);
	});

	return result;
};
