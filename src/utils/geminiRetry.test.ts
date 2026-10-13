import {
  executeGeminiRequest,
  sanitizeGeminiError,
  FetchFunction,
  WaitFunction,
} from './geminiCore';

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
    assert(e.message.includes('quota or rate limit reached'), 'Clear quota limit message');
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

  // 5. Transient error exhausts max 2 retries (3 total attempts) with 750ms and 1500ms backoff
  let fetchCountExhaust = 0;
  const mockFetchExhaust: FetchFunction = async () => {
    fetchCountExhaust++;
    return new Response('Internal Server Error', { status: 500 });
  };
  waitDelays.length = 0;
  let threwExhaust = false;
  try {
    await executeGeminiRequest([{ text: 'hi' }], false, 'AIzaMockKey', mockFetchExhaust, mockWait);
  } catch (e) {
    threwExhaust = true;
  }
  assert(threwExhaust, 'Throws error after max attempts exhausted');
  assert(fetchCountExhaust === 3, `Attempted exactly 3 times (1 initial + 2 retries), got ${fetchCountExhaust}`);
  assert(waitDelays.length === 2, 'Waited twice for backoff');
  assert(waitDelays[0] === 750 && waitDelays[1] === 1500, `Backoff intervals are 750ms then 1500ms, got ${waitDelays}`);

  console.log('All Gemini bounded retry and sanitization tests passed successfully.');
}

runAsyncTests();
