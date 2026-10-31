import {
  executeGeminiRequest,
  sanitizeGeminiError,
  FetchFunction,
  WaitFunction,
} from './geminiCore';
import {
  GeminiError,
  ACTIVE_MODEL_STORAGE_KEY,
  ACTIVE_MODEL_TIMESTAMP_KEY,
  inMemoryStorage,
} from './geminiModels';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// 1. Sanitize error tests
const rawErrorWithKey = 'Error calling https://generativelanguage.googleapis.com/v1beta/models with key AIzaSyTestKey1234567890';
const sanitized = sanitizeGeminiError(rawErrorWithKey, 'AIzaSyTestKey1234567890');
assert(!sanitized.includes('AIzaSyTestKey1234567890'), 'API key is redacted');
assert(!sanitized.includes('https://'), 'URL is omitted');
assert(sanitized.includes('[redacted]'), 'Replaced with [redacted]');
assert(sanitized.includes('[link omitted]'), 'Replaced with [link omitted]');

// Error longer than 450 characters is truncated
const longError = 'x'.repeat(600);
assert(sanitizeGeminiError(longError).length <= 450, 'Truncates to max 450 characters');

async function runAsyncTests() {
  // Pre-seed active model in cache so retry tests isolate generateContent behaviour
  await inMemoryStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, 'gemini-2.5-flash');
  await inMemoryStorage.setItem(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()));

  // 2. 429 Quota exhausted -> NO retry
  let fetchCount429 = 0;
  const mockFetch429: FetchFunction = async () => {
    fetchCount429++;
    return new Response('Quota exceeded', { status: 429 });
  };
  const waitDelays: number[] = [];
  const mockWait: WaitFunction = async (ms) => {
    waitDelays.push(ms);
  };

  let threw429 = false;
  try {
    await executeGeminiRequest([{ text: 'hi' }], false, 'AIzaMockKey', mockFetch429, mockWait);
  } catch (e: any) {
    threw429 = true;
    assert(e instanceof GeminiError, 'Throws typed GeminiError on 429');
    assert(e.kind === 'quota' || e.kind === 'rate_limit', 'Classified as quota or rate_limit');
    assert(e.message.includes('quota') || e.message.includes('rate limit'), 'Clear quota or rate limit message');
  }
  assert(threw429, 'Throws error on 429');
  assert(fetchCount429 === 1, `429 must NOT be retried (fetch count = 1, got ${fetchCount429})`);
  assert(waitDelays.length === 0, 'No backoff wait occurred on 429');

  // 3. 401 / 403 Forbidden / Invalid key -> NO retry
  let fetchCount401 = 0;
  const mockFetch401: FetchFunction = async () => {
    fetchCount401++;
    return new Response('Unauthorized', { status: 401 });
  };
  let threw401 = false;
  try {
    await executeGeminiRequest([{ text: 'hi' }], false, 'AIzaMockKey', mockFetch401, mockWait);
  } catch (e: any) {
    threw401 = true;
    assert(e instanceof GeminiError, 'Throws typed GeminiError on 401');
    assert(e.kind === 'invalid_key', 'Classified as invalid_key');
    assert(e.message.includes('rejected this API key'), 'Clear key rejected message');
  }
  assert(threw401, 'Throws error on 401');
  assert(fetchCount401 === 1, `401 must NOT be retried (fetch count = 1, got ${fetchCount401})`);

  // 4. Transient 503 error succeeds on retry with exponential backoff
  let fetchCountTransient = 0;
  const mockFetchTransient: FetchFunction = async () => {
    fetchCountTransient++;
    if (fetchCountTransient === 1) {
      return new Response('Service Unavailable', { status: 503 });
    }
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Healthy response from Gemini' }] } }],
      }),
      { status: 200 }
    );
  };
  waitDelays.length = 0;
  const result = await executeGeminiRequest(
    [{ text: 'hi' }],
    false,
    'AIzaMockKey',
    mockFetchTransient,
    mockWait
  );
  assert(result === 'Healthy response from Gemini', 'Returns valid response on second attempt');
  assert(fetchCountTransient === 2, `Retried once (fetch count = 2, got ${fetchCountTransient})`);
  assert(waitDelays.length === 1 && waitDelays[0] === 750, `Exponential backoff delay 750ms used, got ${waitDelays[0]}`);

  // 5. Transient error exhausts max 2 retries (3 total attempts) on a single model with 750ms and 1500ms backoff
  let fetchCountExhaust = 0;
  const mockFetchExhaust: FetchFunction = async () => {
    fetchCountExhaust++;
    return new Response('Internal Server Error', { status: 500 });
  };
  waitDelays.length = 0;
  let threwExhaust = false;
  try {
    await executeGeminiRequest(
      [{ text: 'hi' }],
      false,
      'AIzaMockKey',
      mockFetchExhaust,
      mockWait,
      undefined,
      'gemini-2.5-flash',
      ['gemini-2.5-flash']
    );
  } catch (e: any) {
    threwExhaust = true;
    assert(e instanceof GeminiError, 'Throws typed GeminiError on 500');
    assert(e.kind === 'server', 'Classified as server error');
  }
  assert(threwExhaust, 'Throws error after max attempts exhausted');
  assert(fetchCountExhaust === 3, `Attempted exactly 3 times (1 initial + 2 retries), got ${fetchCountExhaust}`);
  assert(waitDelays.length === 2, 'Waited twice for backoff');
  assert(waitDelays[0] === 750 && waitDelays[1] === 1500, `Backoff intervals are 750ms then 1500ms, got ${waitDelays}`);

  // 6. On 503 / overloaded, after retries on primary model, falls back to next ranked candidate (flash-lite)
  const calledUrls: string[] = [];
  const mockFetchFallback: FetchFunction = async (url) => {
    calledUrls.push(url);
    if (url.includes('gemini-2.5-flash:generateContent')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 503,
            message: 'The model is overloaded. Please try again later.',
            status: 'UNAVAILABLE',
          },
        }),
        { status: 503 }
      );
    }
    if (url.includes('gemini-2.5-flash-lite:generateContent')) {
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Success from fallback flash-lite' }] } }],
        }),
        { status: 200 }
      );
    }
    return new Response('Not found', { status: 404 });
  };

  waitDelays.length = 0;
  const fallbackResult = await executeGeminiRequest(
    [{ text: 'hi' }],
    false,
    'AIzaMockKey',
    mockFetchFallback,
    mockWait,
    undefined,
    undefined,
    ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
  );

  assert(fallbackResult === 'Success from fallback flash-lite', 'Returns success from fallback model');
  const flashCalls = calledUrls.filter((u) => u.includes('gemini-2.5-flash:generateContent'));
  const liteCalls = calledUrls.filter((u) => u.includes('gemini-2.5-flash-lite:generateContent'));
  assert(flashCalls.length === 3, `Primary model attempted 3 times before fallback, got ${flashCalls.length}`);
  assert(liteCalls.length === 1, `Fallback model called and succeeded on 1st attempt, got ${liteCalls.length}`);

  // 7. On 404 model_unavailable, immediately falls back to next candidate model
  calledUrls.length = 0;
  const mockFetch404Fallback: FetchFunction = async (url) => {
    calledUrls.push(url);
    if (url.includes('gemini-2.5-flash:generateContent')) {
      return new Response('Model not found', { status: 404 });
    }
    if (url.includes('gemini-2.5-flash-lite:generateContent')) {
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Success after 404 fallback' }] } }],
        }),
        { status: 200 }
      );
    }
    return new Response('Not found', { status: 404 });
  };

  const result404 = await executeGeminiRequest(
    [{ text: 'hi' }],
    false,
    'AIzaMockKey',
    mockFetch404Fallback,
    mockWait,
    undefined,
    'gemini-2.5-flash',
    ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
  );
  assert(result404 === 'Success after 404 fallback', 'Succeeded after 404 candidate fallback');
  assert(
    calledUrls.filter((u) => u.includes('gemini-2.5-flash:generateContent')).length === 1,
    '404 breaks immediately to fallback candidate without wasted retries'
  );

  // 8. Multi-step fallback: stable flash (fails) -> flash-lite (fails) -> previous flash version (succeeds)
  calledUrls.length = 0;
  const mockFetchMultiFallback: FetchFunction = async (url) => {
    calledUrls.push(url);
    if (url.includes('gemini-2.5-flash:generateContent') || url.includes('gemini-2.5-flash-lite:generateContent')) {
      return new Response('Overloaded', { status: 503 });
    }
    if (url.includes('gemini-2.0-flash:generateContent')) {
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Success from previous flash version' }] } }],
        }),
        { status: 200 }
      );
    }
    return new Response('Not found', { status: 404 });
  };

  const resultMulti = await executeGeminiRequest(
    [{ text: 'hi' }],
    false,
    'AIzaMockKey',
    mockFetchMultiFallback,
    mockWait,
    undefined,
    'gemini-2.5-flash',
    ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
  );
  assert(resultMulti === 'Success from previous flash version', 'Deep fallback to previous flash version succeeded');
  assert(calledUrls.filter((u) => u.includes('gemini-2.5-flash:generateContent')).length === 3, '2.5-flash tried 3 times');
  assert(calledUrls.filter((u) => u.includes('gemini-2.5-flash-lite:generateContent')).length === 3, '2.5-flash-lite tried 3 times');
  assert(calledUrls.filter((u) => u.includes('gemini-2.0-flash:generateContent')).length === 1, '2.0-flash tried 1 time and succeeded');

  console.log('All Gemini bounded retry, fallback order, and sanitization tests passed successfully.');
}

runAsyncTests();
