import {
  rankCandidates,
  fetchAvailableModels,
  discoverAndVerifyModel,
  clearActiveModelCache,
  parseGoogleErrorBody,
  sanitizeGeminiString,
  GeminiError,
  StorageInterface,
  inMemoryStorage,
  ACTIVE_MODEL_STORAGE_KEY,
  ACTIVE_MODEL_TIMESTAMP_KEY,
  FetchFunction,
  WaitFunction,
  REQUEST_TIMEOUT_MS,
  MAX_MODEL_DISCOVERY_PAGES,
  TINY_16X16_WHITE_PNG_BASE64,
  testGeminiConnection,
} from './geminiModels';
import { executeGeminiRequest } from './geminiCore';
import { translate } from '../i18n/strings';

declare const require: (moduleName: string) => { inflateSync: (data: Uint8Array) => Uint8Array };
const { inflateSync } = require('node:zlib');

function decodeBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  let buffer = 0;
  let bitCount = 0;
  for (const char of value.replace(/=+$/, '')) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid base64 fixture');
    buffer = (buffer << 6) | digit;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes.push((buffer >> bitCount) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return (((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createMockStorage(): StorageInterface {
  const store: Record<string, string> = {};
  return {
    getItem: async (key: string) => store[key] ?? null,
    setItem: async (key: string, val: string) => { store[key] = val; },
    removeItem: async (key: string) => { delete store[key]; },
  };
}

async function runAllTests() {
  console.log('Starting Gemini Model Discovery, Ranking & Error Engine Tests...');

  // The image probe fixture must remain a valid, decodable PNG.
  {
    const png = decodeBase64(TINY_16X16_WHITE_PNG_BASE64);
    assert(Array.from(png.subarray(0, 8)).join(',') === '137,80,78,71,13,10,26,10', 'PNG signature is valid');
    const chunks: { type: string; data: Uint8Array }[] = [];
    let offset = 8;
    while (offset < png.length) {
      assert(offset + 12 <= png.length, 'Chunk header and CRC are complete');
      const length = readUInt32BE(png, offset);
      const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
      const end = offset + 12 + length;
      assert(end <= png.length, `${type} chunk is complete`);
      const data = png.subarray(offset + 8, offset + 8 + length);
      let crc = 0xffffffff;
      for (const byte of png.subarray(offset + 4, offset + 8 + length)) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      assert(((crc ^ 0xffffffff) >>> 0) === readUInt32BE(png, offset + 8 + length), `${type} CRC is valid`);
      chunks.push({ type, data });
      offset = end;
      if (type === 'IEND') break;
    }
    assert(offset === png.length, 'PNG ends after IEND');
    assert(chunks.map((chunk) => chunk.type).join(',') === 'IHDR,IDAT,IEND', 'PNG chunk order is valid');
    assert(readUInt32BE(chunks[0].data, 0) === 16 && readUInt32BE(chunks[0].data, 4) === 16, 'Fixture is 16x16');
    assert(inflateSync(chunks[1].data).length > 0, 'IDAT image payload decompresses');
  }

  {
    const ranked = rankCandidates([
      'gemma-3-4b-it', 'aqa', 'learnlm-2.0', 'other-2.0-flash',
      'gemini-computer-use-preview', 'gemini-deep-research-preview', 'gemini-3-exp-1206',
      'gemini-2.5-flash',
    ]);
    assert(ranked.length === 1 && ranked[0] === 'gemini-2.5-flash', 'Only eligible Gemini models are ranked');
  }

  for (const [status, expectedKind] of [[429, 'quota'], [503, 'server']] as const) {
    const storage = createMockStorage();
    let probeCalls = 0;
    const mockFetch: FetchFunction = async (url) => {
      if (url.includes('/models?')) return new Response(JSON.stringify({ models: [
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
      ] }), { status: 200 });
      probeCalls++;
      if (probeCalls === 1) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 });
      return new Response(JSON.stringify({ error: { code: status, message: status === 429 ? 'Quota exceeded' : 'Service unavailable', status: status === 429 ? 'RESOURCE_EXHAUSTED' : 'UNAVAILABLE' } }), { status });
    };
    let caught: any;
    try { await testGeminiConnection('test-key', mockFetch, storage); } catch (error) { caught = error; }
    assert(caught instanceof GeminiError && caught.kind === expectedKind, `${status} probe throws ${expectedKind}`);
    assert(probeCalls === 2, `${status} image probe failure does not fall through to another candidate`);
    assert(await storage.getItem(ACTIVE_MODEL_STORAGE_KEY) === null, `${status} does not cache a model`);
    assert(await storage.getItem(ACTIVE_MODEL_TIMESTAMP_KEY) === null, `${status} does not cache a timestamp`);
  }

  {
    let caught: any;
    try {
      await fetchAvailableModels('test-key', (() => new Promise<Response>(() => {})) as FetchFunction, 5);
    } catch (error) { caught = error; }
    assert(caught instanceof GeminiError && caught.kind === 'timeout', 'Hung discovery fetch throws timeout');
    assert(REQUEST_TIMEOUT_MS > 0, 'Production timeout is configured');

    const hangingBodyFetch: FetchFunction = async () => {
      const response = new Response('{}', { status: 200 });
      response.text = () => new Promise<string>(() => {});
      return response;
    };
    let bodyTimeout: any;
    try { await fetchAvailableModels('test-key', hangingBodyFetch, 5); } catch (error) { bodyTimeout = error; }
    assert(bodyTimeout instanceof GeminiError && bodyTimeout.kind === 'timeout', 'Hung discovery body parsing throws timeout');

    const probeFetch: FetchFunction = async (url) => {
      if (url.includes('/models?')) return new Response(JSON.stringify({ models: [
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      ] }), { status: 200 });
      return new Promise<Response>(() => {});
    };
    let probeTimeout: any;
    try { await discoverAndVerifyModel('test-key', probeFetch, 5); } catch (error) { probeTimeout = error; }
    assert(probeTimeout instanceof GeminiError && probeTimeout.kind === 'timeout', 'Hung model probe throws timeout');

    const imageProbeFetch: FetchFunction = async (url) => {
      if (url.includes('/models?')) return new Response(JSON.stringify({ models: [
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      ] }), { status: 200 });
      if (++imageProbeCalls === 1) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 });
      return new Promise<Response>(() => {});
    };
    let imageProbeCalls = 0;
    let imageProbeTimeout: any;
    try { await discoverAndVerifyModel('test-key', imageProbeFetch, 5); } catch (error) { imageProbeTimeout = error; }
    assert(imageProbeTimeout instanceof GeminiError && imageProbeTimeout.kind === 'timeout', 'Hung image probe throws timeout');
  }

  {
    let pageCalls = 0;
    const infinitePages: FetchFunction = async () => {
      pageCalls++;
      return new Response(JSON.stringify({ models: [], nextPageToken: `page-${pageCalls + 1}` }), { status: 200 });
    };
    let pageLimitError: any;
    try { await fetchAvailableModels('test-key', infinitePages, 5000); } catch (error) { pageLimitError = error; }
    assert(pageLimitError instanceof GeminiError && pageLimitError.kind === 'server', 'Unique endless page tokens stop at a safety limit');
    assert(pageCalls === MAX_MODEL_DISCOVERY_PAGES, `Discovery page limit is enforced (${pageCalls})`);
  }

  // Gemini 3 uses default temperature and low thinking for responsive in-app chat.
  {
    const inspectRequest = async (model: string) => {
      let requestBody: any;
      const mockFetch: FetchFunction = async (_url, init) => {
        requestBody = JSON.parse(String(init?.body || '{}'));
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 });
      };
      await executeGeminiRequest([{ text: 'hello' }], false, 'test-key', mockFetch, undefined, undefined, model);
      return requestBody.generationConfig;
    };
    const gemini3Config = await inspectRequest('gemini-3.8-flash');
    assert(!('temperature' in gemini3Config), 'Gemini 3 request does not override temperature');
    assert(gemini3Config.thinkingConfig?.thinkingLevel === 'LOW', 'Gemini 3 request uses low thinking');
    const previousConfig = await inspectRequest('gemini-2.5-flash');
    assert(!('thinkingConfig' in previousConfig), 'Older model does not receive Gemini 3 thinking config');
  }

  // =========================================================================
  // SCENARIO 1: Pagination handles multiple pages with nextPageToken
  // =========================================================================
  {
    const requestedUrls: string[] = [];
    const mockPaginationFetch: FetchFunction = async (url, init) => {
      requestedUrls.push(url);
      const parsedUrl = new URL(url);
      const pageToken = parsedUrl.searchParams.get('pageToken');
      assert(parsedUrl.searchParams.get('pageSize') === '1000', 'Uses pageSize 1000');
      assert(Boolean(init?.headers && (init.headers as any)['x-goog-api-key'] === 'test-key'), 'Passes key in header');

      if (!pageToken) {
        return new Response(
          JSON.stringify({
            models: [
              { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
            ],
            nextPageToken: 'token_page_2',
          }),
          { status: 200 }
        );
      } else if (pageToken === 'token_page_2') {
        return new Response(
          JSON.stringify({
            models: [
              { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 200 });
    };

    const models = await fetchAvailableModels('test-key', mockPaginationFetch);
    assert(models.length === 2, `Discovered 2 models across pages, got ${models.length}`);
    assert(models.includes('gemini-2.0-flash'), 'Discovered model from page 1');
    assert(models.includes('gemini-2.5-flash'), 'Discovered model from page 2');
    assert(requestedUrls.length === 2, `Made 2 fetch requests for pagination, got ${requestedUrls.length}`);
    console.log('✓ Scenario 1: Pagination tested successfully');
  }

  // =========================================================================
  // SCENARIO 2: Filter excludes tts, image, live, audio, embedding, omni, robotics, veo, imagen, lyria
  // =========================================================================
  {
    const mixedModels = [
      'models/gemini-2.5-flash',
      'models/gemini-tts-speech',
      'models/gemini-image-gen',
      'models/gemini-2.0-live',
      'models/gemini-audio-understanding',
      'models/text-embedding-004',
      'models/gemini-omni-flash',
      'models/robotics-control-v1',
      'models/veo-2-video',
      'models/imagen-3-generation',
      'models/lyria-music-gen',
    ];

    const ranked = rankCandidates(mixedModels);
    assert(ranked.length === 1, `Excluded all special models, remaining count: ${ranked.length}`);
    assert(ranked[0] === 'gemini-2.5-flash', `Selected text model: ${ranked[0]}`);
    console.log('✓ Scenario 2: Keyword filtering tested successfully');
  }

  // =========================================================================
  // SCENARIO 3: Version ranking prefers higher major/minor versions
  // =========================================================================
  {
    const versions = [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-3.0-flash',
      'gemini-2.5-flash-lite',
    ];

    const ranked = rankCandidates(versions);
    assert(ranked[0] === 'gemini-3.0-flash', `Top rank should be gemini-3.0-flash, got ${ranked[0]}`);
    assert(ranked[1] === 'gemini-2.5-flash', `Second rank should be gemini-2.5-flash, got ${ranked[1]}`);
    assert(ranked[2] === 'gemini-2.0-flash', `Third rank should be gemini-2.0-flash, got ${ranked[2]}`);
    assert(ranked[3] === 'gemini-1.5-flash', `Fourth rank should be gemini-1.5-flash, got ${ranked[3]}`);
    assert(ranked[4] === 'gemini-2.5-flash-lite', `Fifth rank should be gemini-2.5-flash-lite, got ${ranked[4]}`);
    console.log('✓ Scenario 3: Version ranking tested successfully');
  }

  // =========================================================================
  // SCENARIO 4: 2.5 missing -> picks newer flash (e.g. gemini-3.0-flash or gemini-2.8-flash)
  // =========================================================================
  {
    const mockFetchNewerFlash: FetchFunction = async (url) => {
      if (url.includes('/models?')) {
        return new Response(
          JSON.stringify({
            models: [
              { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-2.8-flash', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-3.0-flash', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
          { status: 200 }
        );
      }
      // Probe response
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'probe ok' }] } }] }),
        { status: 200 }
      );
    };

    const selected = await discoverAndVerifyModel('test-key', mockFetchNewerFlash);
    assert(selected === 'gemini-3.0-flash', `Selected highest newer flash model, got ${selected}`);
    console.log('✓ Scenario 4: Missing 2.5 falls forward to newer flash successfully');
  }

  // =========================================================================
  // SCENARIO 5: No compatible model throws GeminiError('no_compatible_model')
  // =========================================================================
  {
    const mockFetchNoModels: FetchFunction = async () => {
      return new Response(
        JSON.stringify({
          models: [
            { name: 'models/gemini-tts-only', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
        { status: 200 }
      );
    };

    let caughtError: GeminiError | null = null;
    try {
      await discoverAndVerifyModel('test-key', mockFetchNoModels);
    } catch (e: any) {
      caughtError = e;
    }

    assert(caughtError !== null, 'Threw error when no compatible models exist');
    assert(caughtError instanceof GeminiError, 'Error is an instance of GeminiError');
    assert(caughtError?.kind === 'no_compatible_model', `Kind is no_compatible_model, got ${caughtError?.kind}`);
    console.log('✓ Scenario 5: No compatible model error tested successfully');
  }

  // =========================================================================
  // SCENARIO 6: Image probe fallback (candidate 1 fails image probe -> candidate 2 verified)
  // =========================================================================
  {
    const candidateProbeCalls: string[] = [];
    const mockProbeFetch: FetchFunction = async (url, init) => {
      if (url.includes('/models?')) {
        return new Response(
          JSON.stringify({
            models: [
              { name: 'models/gemini-3.0-flash', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
          { status: 200 }
        );
      }

      candidateProbeCalls.push(url);
      const body = JSON.parse(String(init?.body || '{}'));
      const isImageProbe = Boolean(body?.contents?.[0]?.parts?.[1]?.inlineData);
      if (isImageProbe) {
        assert(body.contents[0].parts[1].inlineData.mimeType === 'image/png', 'Image probe declares image/png');
        assert(body.contents[0].parts[1].inlineData.data === TINY_16X16_WHITE_PNG_BASE64, 'Image probe sends the validated PNG fixture');
      }

      // Candidate 1 (gemini-3.0-flash): Text succeeds, but image probe fails!
      if (url.includes('gemini-3.0-flash')) {
        if (isImageProbe) {
          return new Response('Multimodal not supported', { status: 400 });
        }
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
          { status: 200 }
        );
      }

      // Candidate 2 (gemini-2.5-flash): Both succeed!
      if (url.includes('gemini-2.5-flash')) {
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
          { status: 200 }
        );
      }

      return new Response('Not found', { status: 404 });
    };

    const selected = await discoverAndVerifyModel('test-key', mockProbeFetch);
    assert(selected === 'gemini-2.5-flash', `Candidate 2 selected after Candidate 1 failed image probe, got ${selected}`);
    console.log('✓ Scenario 6: Image probe fallback tested successfully');
  }

  // =========================================================================
  // SCENARIO 7: 404 re-discovery retry
  // =========================================================================
  {
    const storage = createMockStorage();
    await storage.setItem(ACTIVE_MODEL_STORAGE_KEY, 'gemini-old-model');
    await storage.setItem(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()));

    let requestsCount = 0;
    const mock404RecoveryFetch: FetchFunction = async (url) => {
      requestsCount++;
      if (url.includes('/models?')) {
        return new Response(
          JSON.stringify({
            models: [
              { name: 'models/gemini-new-model-flash', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
          { status: 200 }
        );
      }

      // Probes for gemini-new-model-flash
      if (url.includes('gemini-new-model-flash') && !url.includes('temp:')) {
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Recovered response' }] } }] }),
          { status: 200 }
        );
      }

      // The old model returns 404
      if (url.includes('gemini-old-model')) {
        return new Response(
          JSON.stringify({ error: { code: 404, message: 'Model not found', status: 'NOT_FOUND' } }),
          { status: 404 }
        );
      }

      return new Response('Not found', { status: 404 });
    };

    const mockWait: WaitFunction = async () => {};
    // Seed inMemoryStorage because executeGeminiRequest uses it by default
    await inMemoryStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, 'gemini-old-model');
    await inMemoryStorage.setItem(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()));

    const result = await executeGeminiRequest(
      [{ text: 'hello' }],
      false,
      'test-key',
      mock404RecoveryFetch,
      mockWait
    );

    assert(result === 'Recovered response', `Successfully recovered from 404 with new model: ${result}`);
    const cachedNow = await inMemoryStorage.getItem(ACTIVE_MODEL_STORAGE_KEY);
    assert(cachedNow === 'gemini-new-model-flash', `Cache updated to new model: ${cachedNow}`);
    assert(requestsCount > 0, 'Requests were executed during 404 recovery');
    console.log('✓ Scenario 7: 404 re-discovery retry tested successfully');
  }

  // =========================================================================
  // SCENARIO 8: 400 invalid key reason detected
  // =========================================================================
  {
    const errorBody = JSON.stringify({
      error: {
        code: 400,
        message: 'API key not valid. Please pass a valid API key.',
        status: 'INVALID_ARGUMENT',
        details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }],
      },
    });

    const err = parseGoogleErrorBody(400, errorBody, 'secret-123');
    assert(err.kind === 'invalid_key', `400 with API_KEY_INVALID classified as invalid_key, got ${err.kind}`);
    assert(err.status === 400, `Status preserved as 400, got ${err.status}`);
    assert(err.detailsReason === 'API_KEY_INVALID', `Extracted reason: ${err.detailsReason}`);
    console.log('✓ Scenario 8: 400 invalid key reason detected successfully');
  }

  // =========================================================================
  // SCENARIO 9: 403 permission error classified
  // =========================================================================
  {
    const errorBody = JSON.stringify({
      error: {
        code: 403,
        message: 'The caller does not have permission to access the Gemini API.',
        status: 'PERMISSION_DENIED',
      },
    });

    const err = parseGoogleErrorBody(403, errorBody, 'secret-123');
    assert(err.kind === 'permission', `403 classified as permission, got ${err.kind}`);
    assert(err.status === 403, `Status preserved as 403, got ${err.status}`);
    console.log('✓ Scenario 9: 403 permission error tested successfully');
  }

  // =========================================================================
  // SCENARIO 10: 429 unretried (quota/rate limit not retried)
  // =========================================================================
  {
    await inMemoryStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, 'gemini-2.5-flash');
    await inMemoryStorage.setItem(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()));

    let fetchCount = 0;
    const mock429Fetch: FetchFunction = async () => {
      fetchCount++;
      return new Response(
        JSON.stringify({
          error: { code: 429, message: 'Resource exhausted', status: 'RESOURCE_EXHAUSTED' },
        }),
        { status: 429 }
      );
    };

    let caught: GeminiError | null = null;
    try {
      await executeGeminiRequest([{ text: 'hi' }], false, 'test-key', mock429Fetch);
    } catch (e: any) {
      caught = e;
    }

    assert(caught instanceof GeminiError, 'Threw GeminiError on 429');
    assert(caught?.kind === 'quota' || caught?.kind === 'rate_limit', `Classified as quota or rate_limit, got ${caught?.kind}`);
    assert(fetchCount === 1, `429 must NOT be retried (fetch count = 1, got ${fetchCount})`);
    console.log('✓ Scenario 10: 429 unretried tested successfully');
  }

  // =========================================================================
  // SCENARIO 11: 503 retried then success with backoff
  // =========================================================================
  {
    await inMemoryStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, 'gemini-2.5-flash');
    await inMemoryStorage.setItem(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()));

    let attempts = 0;
    const waitTimes: number[] = [];
    const mock503Fetch: FetchFunction = async () => {
      attempts++;
      if (attempts === 1) {
        return new Response('Backend server overloaded', { status: 503 });
      }
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '503 resolved' }] } }] }),
        { status: 200 }
      );
    };
    const mockWait: WaitFunction = async (ms) => {
      waitTimes.push(ms);
    };

    const res = await executeGeminiRequest([{ text: 'hi' }], false, 'test-key', mock503Fetch, mockWait);
    assert(res === '503 resolved', `Result returned after retry: ${res}`);
    assert(attempts === 2, `Retried once (2 total attempts, got ${attempts})`);
    assert(waitTimes.length === 1 && waitTimes[0] === 750, `Backoff delay 750ms used, got ${waitTimes[0]}`);
    console.log('✓ Scenario 11: 503 retried then success tested successfully');
  }

  // =========================================================================
  // SCENARIO 12: Empty response unretried
  // =========================================================================
  {
    await inMemoryStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, 'gemini-2.5-flash');
    await inMemoryStorage.setItem(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()));

    let emptyCalls = 0;
    const mockEmptyFetch: FetchFunction = async () => {
      emptyCalls++;
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '' }] } }] }),
        { status: 200 }
      );
    };

    let caughtEmpty: GeminiError | null = null;
    try {
      await executeGeminiRequest([{ text: 'hi' }], false, 'test-key', mockEmptyFetch);
    } catch (e: any) {
      caughtEmpty = e;
    }

    assert(caughtEmpty instanceof GeminiError, 'Threw GeminiError on empty response');
    assert(caughtEmpty?.kind === 'empty', `Classified as empty, got ${caughtEmpty?.kind}`);
    assert(emptyCalls === 1, `Empty response is NOT retried (call count = 1, got ${emptyCalls})`);
    console.log('✓ Scenario 12: Empty response unretried tested successfully');
  }

  // =========================================================================
  // SCENARIO 13: Key redaction in strings and error messages
  // =========================================================================
  {
    const secretKey = 'AIzaSySecretApiKey1234567890';
    const messageWithLeak = `Failure contacting https://generativelanguage.googleapis.com/v1beta/models?key=${secretKey} with token ${secretKey}`;
    const sanitized = sanitizeGeminiString(messageWithLeak, secretKey);

    assert(!sanitized.includes(secretKey), 'API key is completely redacted');
    assert(!sanitized.includes('AIzaSySecretApiKey1234567890'), 'AIza token is redacted');
    assert(!sanitized.includes('https://'), 'URLs are omitted');
    assert(sanitized.includes('[redacted]'), 'Replaced with [redacted]');
    assert(sanitized.includes('[link omitted]'), 'Replaced with [link omitted]');
    console.log('✓ Scenario 13: Key redaction tested successfully');
  }

  // =========================================================================
  // SCENARIO 14: Console spy verifies no API key is leaked in console output
  // =========================================================================
  {
    const secretKey = 'AIzaTestSecretConsole999';
    const loggedOutputs: string[] = [];

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => loggedOutputs.push(args.join(' '));
    console.warn = (...args: any[]) => loggedOutputs.push(args.join(' '));
    console.error = (...args: any[]) => loggedOutputs.push(args.join(' '));

    try {
      const err = parseGoogleErrorBody(
        400,
        JSON.stringify({ error: { message: `Bad key ${secretKey}` } }),
        secretKey
      );
      // Even if someone logs err.message or err.providerMessage:
      console.warn(err.message);
      console.error(err.providerMessage);
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }

    for (const logged of loggedOutputs) {
      assert(!logged.includes(secretKey), `Secret key was found in console output: ${logged}`);
    }
    console.log('✓ Scenario 14: Console spy verified no leaked keys successfully');
  }

  // =========================================================================
  // SCENARIO 15: Cache clearing on key change or clear
  // =========================================================================
  {
    const storage = createMockStorage();
    await storage.setItem(ACTIVE_MODEL_STORAGE_KEY, 'gemini-cached-v1');
    await storage.setItem(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()));

    // Verify it was stored
    assert((await storage.getItem(ACTIVE_MODEL_STORAGE_KEY)) === 'gemini-cached-v1', 'Stored before clear');

    // Clear cache
    await clearActiveModelCache(storage);
    assert((await storage.getItem(ACTIVE_MODEL_STORAGE_KEY)) === null, 'Active model key removed');
    assert((await storage.getItem(ACTIVE_MODEL_TIMESTAMP_KEY)) === null, 'Timestamp key removed');

    // Also verify clearActiveModelCache clears inMemoryStorage
    await inMemoryStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, 'gemini-cached-v2');
    await inMemoryStorage.setItem(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()));
    await clearActiveModelCache();
    assert((await inMemoryStorage.getItem(ACTIVE_MODEL_STORAGE_KEY)) === null, 'clearActiveModelCache cleared model cache');
    assert((await inMemoryStorage.getItem(ACTIVE_MODEL_TIMESTAMP_KEY)) === null, 'clearActiveModelCache cleared timestamp');
    console.log('✓ Scenario 15: Cache clearing verified successfully');
  }

  // =========================================================================
  // LOCALIZATION COMPLETENESS TEST: All new strings exist in ar and ckb
  // =========================================================================
  {
    const requiredKeys = [
      'Test connection',
      'Testing connection…',
      'Connection successful',
      'Connected: ',
      'Connection failed',
      'Active model: ',
      'Check your API key permissions and billing status at Google AI Studio.',
      'Invalid Gemini API key. Please check your key in Google AI Studio.',
      'Gemini rejected this API key. Please check your key in Google AI Studio.',
      'Permission denied. Ensure your API key has access to the Gemini API.',
      'The requested Gemini model is unavailable for this key.',
      'No compatible Gemini model found for this API key.',
      'None of the candidate Gemini models passed text and multimodal verification.',
      'Gemini API quota exceeded. Please check your usage or billing in Google AI Studio.',
      'Gemini API quota or rate limit reached. Please wait a moment before trying again.',
      'Gemini API rate limit reached. Please wait a moment before trying again.',
      'Bad request to Gemini API.',
      'Gemini service is temporarily unavailable. Please try again shortly.',
      'Network error connecting to Gemini. Check your internet connection.',
      'Gemini request timed out. Please check your connection and try again.',
      'The response was blocked by Gemini safety filters.',
      'Gemini returned an empty response. Please try again.',
      'The AI did not return a result. Please try again.',
      'Open Google AI Studio',
    ];

    for (const key of requiredKeys) {
      const arTranslation = translate('ar', key);
      const ckbTranslation = translate('ckb', key);

      assert(arTranslation !== key, `Arabic translation missing for key: "${key}"`);
      assert(ckbTranslation !== key, `Kurdish Sorani translation missing for key: "${key}"`);
      assert(typeof arTranslation === 'string' && arTranslation.length > 0, `Arabic empty for "${key}"`);
      assert(typeof ckbTranslation === 'string' && ckbTranslation.length > 0, `Sorani empty for "${key}"`);
    }
    console.log('✓ Localization completeness: All 24 required strings exist in en, ar, and ckb');
  }

  console.log('=================================================================');
  console.log('All 15 Gemini model discovery & error unit tests passed cleanly!');
  console.log('=================================================================');
}

runAllTests();
