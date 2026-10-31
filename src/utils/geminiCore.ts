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
  StorageInterface,
  safeStorageSet,
  ACTIVE_MODEL_STORAGE_KEY,
  ACTIVE_MODEL_TIMESTAMP_KEY,
  getCachedCandidateModels,
  buildModelFallbackChain,
  DEFAULT_FALLBACK_MODELS,
  formatProviderErrorDetail,
  isAQKey,
  isAQKeyRejection,
  getAQKeyExplanation,
} from './geminiModels';

export {
  GeminiError,
  GeminiErrorKind,
  FetchFunction,
  WaitFunction,
  REQUEST_TIMEOUT_MS,
  formatProviderErrorDetail,
  isAQKey,
  isAQKeyRejection,
  getAQKeyExplanation,
  buildModelFallbackChain,
  DEFAULT_FALLBACK_MODELS,
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
  parts: Record<string, unknown>[],
  jsonResponse = false,
  apiKeyOverride?: string,
  customFetch: FetchFunction = fetch,
  customWait: WaitFunction = defaultWait,
  apiKeyGetter?: () => Promise<string | null>,
  modelOverride?: string,
  candidateModelsOverride?: string[],
  storage?: StorageInterface
): Promise<string> {
  const apiKey = apiKeyOverride ?? (apiKeyGetter ? await apiKeyGetter() : null);
  if (!apiKey || !apiKey.trim()) {
    throw new GeminiError('invalid_key', {
      message: 'Add a Gemini API key in Profile to use AI features.',
    });
  }

  const cleanKey = apiKey.trim();
  const initialModel = modelOverride || (await getActiveModel(cleanKey, false, customFetch, storage));

  let fallbackChain: string[];
  if (candidateModelsOverride && candidateModelsOverride.length > 0) {
    fallbackChain = buildModelFallbackChain(candidateModelsOverride, initialModel);
  } else {
    const cachedCandidates = await getCachedCandidateModels(storage);
    const pool = cachedCandidates.length > 0 ? cachedCandidates : DEFAULT_FALLBACK_MODELS;
    fallbackChain = buildModelFallbackChain(pool, initialModel);
  }

  let lastError: GeminiError | Error | null = null;
  let hasRetried404 = false;
  const maxTransientAttempts = 3;

  for (let modelIdx = 0; modelIdx < fallbackChain.length; modelIdx++) {
    const model = fallbackChain[modelIdx];

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
                // Gemini 3 recommends the default temperature (1.0); do not override it.
                ...(isGemini3Model(model) ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {}),
                ...(jsonResponse ? { responseMimeType: 'application/json' } : {}),
              },
            }),
            signal: controller.signal,
          }
        );

        // Handle 404 Model Unavailable with rediscovery retry and candidate fallback
        if (response.status === 404) {
          const rawBody = await response.text().catch(() => '');
          lastError = parseGoogleErrorBody(404, rawBody, cleanKey);
          if (!hasRetried404 && (!candidateModelsOverride || candidateModelsOverride.length === 0) && modelIdx === 0) {
            hasRetried404 = true;
            await clearActiveModelCache(storage);
            try {
              const freshModel = await getActiveModel(cleanKey, true, customFetch, storage);
              const freshCandidates = await getCachedCandidateModels(storage);
              const pool = freshCandidates.length > 0 ? freshCandidates : [freshModel];
              fallbackChain = buildModelFallbackChain(pool, freshModel);
              modelIdx = -1; // restart loop with freshly discovered chain
              break;
            } catch {
              // Rediscovery failed, fall through to next candidate model
            }
          }
          break;
        }

        // Handle transient server errors (500, 502, 503, 504)
        if (response.status >= 500 && response.status <= 504) {
          const rawBody = await response.text().catch(() => '');
          const serverError = parseGoogleErrorBody(response.status, rawBody, cleanKey);
          lastError = serverError;
          if (attempt < maxTransientAttempts - 1) {
            await customWait(750 * Math.pow(2, attempt));
            continue;
          }
          // Model retries exhausted -> fall back to next candidate model
          break;
        }

        // All other non-OK errors: parse and throw immediately (NEVER RETRY, NEVER FALLBACK)
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

        // On fallback success, cache working model
        if (model !== initialModel) {
          await clearActiveModelCache(storage);
          await safeStorageSet(ACTIVE_MODEL_STORAGE_KEY, model, storage).catch(() => {});
          await safeStorageSet(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()), storage).catch(() => {});
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
          if (err.kind === 'server' && attempt < maxTransientAttempts - 1) {
            lastError = err;
            await customWait(750 * Math.pow(2, attempt));
            continue;
          }
          if (err.kind === 'server' || err.kind === 'model_unavailable') {
            lastError = err;
            break;
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
  }

  throw lastError || new GeminiError('server', { message: 'Gemini request failed after retries.' });
}

function isGemini3Model(modelName: string): boolean {
  return /^gemini-3(?:\.|-)/i.test(modelName);
}
