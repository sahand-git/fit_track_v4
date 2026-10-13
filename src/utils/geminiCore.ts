import {
  getActiveModel,
  clearActiveModelCache,
  parseGoogleErrorBody,
  sanitizeGeminiString,
  GeminiError,
  GeminiErrorKind,
  FetchFunction,
  WaitFunction,
  defaultWait,
  REQUEST_TIMEOUT_MS,
} from './geminiModels';

export {
  GeminiError,
  GeminiErrorKind,
  FetchFunction,
  WaitFunction,
  REQUEST_TIMEOUT_MS,
};

/**
 * Sanitizes Gemini error messages to prevent exposing API keys or query params
 * in UI alerts or error screens. Truncates length to 450 chars max.
 */
export function sanitizeGeminiError(message: string, apiKey?: string): string {
  if (!message) return 'An error occurred while communicating with Gemini.';
  return sanitizeGeminiString(message, apiKey);
}

export async function executeGeminiRequest(
  parts: Array<Record<string, unknown>>,
  jsonResponse = false,
  apiKeyOverride?: string,
  customFetch: FetchFunction = fetch,
  customWait: WaitFunction = defaultWait,
  apiKeyGetter?: () => Promise<string | null>,
  modelOverride?: string
): Promise<string> {
  const apiKey = apiKeyOverride ?? (apiKeyGetter ? await apiKeyGetter() : null);
  if (!apiKey || !apiKey.trim()) {
    throw new GeminiError('invalid_key', {
      message: 'Add a Gemini API key in Profile to use AI features.',
    });
  }

  const cleanKey = apiKey.trim();
  let model = modelOverride || (await getActiveModel(cleanKey, false, customFetch));

  let hasRetried404 = false;
  let lastError: GeminiError | Error | null = null;
  const maxTransientAttempts = 3;

  for (let attempt = 0; attempt < maxTransientAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await customFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': cleanKey,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.2,
              ...(jsonResponse ? { responseMimeType: 'application/json' } : {}),
            },
          }),
          signal: controller.signal,
        }
      );

      // Handle 404 Model Unavailable with single rediscovery retry
      if (response.status === 404) {
        const rawBody = await response.text().catch(() => '');
        if (!hasRetried404) {
          hasRetried404 = true;
          // Invalidate cache and rediscover
          await clearActiveModelCache();
          model = await getActiveModel(cleanKey, true, customFetch);
          // Retry immediately with the newly selected model
          attempt--;
          continue;
        }
        // If already retried 404 once, stop and show the error
        throw parseGoogleErrorBody(404, rawBody, cleanKey);
      }

      // Handle transient server errors (500, 502, 503, 504)
      if (response.status >= 500 && response.status <= 504) {
        const rawBody = await response.text().catch(() => '');
        const serverError = parseGoogleErrorBody(response.status, rawBody, cleanKey);
        if (attempt < maxTransientAttempts - 1) {
          lastError = serverError;
          await customWait(750 * Math.pow(2, attempt));
          continue;
        }
        throw serverError;
      }

      // All other non-OK errors: parse and throw immediately (NEVER RETRY)
      if (!response.ok) {
        const rawBody = await response.text().catch(() => '');
        throw parseGoogleErrorBody(response.status, rawBody, cleanKey);
      }

      // Parse JSON response
      let json: any;
      try {
        json = await response.json();
      } catch {
        throw new GeminiError('server', {
          message: 'Invalid response from Gemini service.',
          status: response.status,
        });
      }

      // Check safety blocking
      const candidate = json?.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY' || json?.promptFeedback?.blockReason) {
        throw new GeminiError('blocked', {
          message: 'The response was blocked by Gemini safety filters.',
        });
      }

      const text = candidate?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('')
        .trim();

      if (!text) {
        throw new GeminiError('empty', {
          message: 'The AI did not return a result. Please try again.',
        });
      }

      return text;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new GeminiError('timeout', {
          message: 'Gemini request timed out. Please check your connection and try again.',
          cause: err,
        });
      }

      // If it's already a GeminiError
      if (err instanceof GeminiError) {
        // Only transient server errors reach here if attempts remain
        if (err.kind === 'server' && attempt < maxTransientAttempts - 1) {
          lastError = err;
          await customWait(750 * Math.pow(2, attempt));
          continue;
        }
        throw err;
      }

      // Network error during fetch (e.g., connection lost)
      const netError = new GeminiError('network', {
        message: sanitizeGeminiString(err?.message || 'Network error connecting to Gemini.', cleanKey),
        cause: err,
      });

      if (attempt < maxTransientAttempts - 1) {
        lastError = netError;
        await customWait(750 * Math.pow(2, attempt));
        continue;
      }
      throw netError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new GeminiError('server', { message: 'Gemini request failed after retries.' });
}
