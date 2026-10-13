export const GEMINI_MODEL = 'gemini-2.5-flash';
export const REQUEST_TIMEOUT_MS = 25000;

/**
 * Sanitizes Gemini error messages to prevent exposing API keys or query params
 * in UI alerts or error screens. Truncates length to 450 chars max.
 */
export function sanitizeGeminiError(message: string, apiKey?: string): string {
  if (!message) return 'An error occurred while communicating with Gemini.';
  let cleaned = message;
  if (apiKey) {
    cleaned = cleaned.split(apiKey).join('[redacted]');
  }
  cleaned = cleaned
    .replace(/AIza[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/https?:\/\/\S+/g, '[link omitted]')
    .slice(0, 450);
  return cleaned;
}

export type FetchFunction = (url: string, init?: RequestInit) => Promise<Response>;
export type WaitFunction = (ms: number) => Promise<void>;

const defaultWait: WaitFunction = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function executeGeminiRequest(
  parts: Array<Record<string, unknown>>,
  jsonResponse = false,
  apiKeyOverride?: string,
  customFetch: FetchFunction = fetch,
  customWait: WaitFunction = defaultWait,
  apiKeyGetter?: () => Promise<string | null>
): Promise<string> {
  const apiKey = apiKeyOverride ?? (apiKeyGetter ? await apiKeyGetter() : null);
  if (!apiKey) throw new Error('Add a Gemini API key in Profile to use AI features.');

  let lastError: Error | null = null;
  const maxAttempts = 3; // Initial + up to 2 retries

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await customFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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

      // Quota limit (429) -> NEVER RETRY
      if (response.status === 429) {
        throw new Error('Gemini API quota or rate limit reached. Check usage before retrying.');
      }

      // Invalid key or forbidden (400, 401, 403) -> NEVER RETRY
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        const rawBody = await response.text().catch(() => '');
        throw new Error(
          sanitizeGeminiError(
            `Gemini rejected this API key (HTTP ${response.status}). Check it in Profile.${rawBody ? ` Details: ${rawBody}` : ''}`,
            apiKey
          )
        );
      }

      // Model unavailable (404) -> NEVER RETRY
      if (response.status === 404) {
        throw new Error(`The model (${GEMINI_MODEL}) is unavailable for this key. Verify key permissions in Google AI Studio.`);
      }

      // Temporary server errors (500, 502, 503, 504) -> RETRY with backoff
      if (response.status >= 500 && response.status <= 504) {
        const rawBody = await response.text().catch(() => '');
        const serverError = new Error(
          sanitizeGeminiError(
            `Gemini service error (${response.status}).${rawBody ? ` Details: ${rawBody}` : ''}`,
            apiKey
          )
        );
        if (attempt < maxAttempts - 1) {
          lastError = serverError;
          await customWait(750 * Math.pow(2, attempt));
          continue;
        }
        throw serverError;
      }

      if (!response.ok) {
        throw new Error(`AI service returned code ${response.status}. Please try again.`);
      }

      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('')
        .trim();

      if (!text) throw new Error('The AI did not return a result. Please try again.');
      return text;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Gemini request timed out. Please check your internet connection and try again.');
      }
      if (
        err.message?.includes('quota or rate limit reached') ||
        err.message?.includes('rejected this API key') ||
        err.message?.includes('is unavailable for this key')
      ) {
        throw err;
      }

      // Network disconnect / unexpected error -> retry if attempts remain
      if (attempt < maxAttempts - 1) {
        lastError = err;
        await customWait(750 * Math.pow(2, attempt));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error('Gemini request failed after retries.');
}
