import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLanguage } from '../types';

/**
 * FitTrack v4 — Gemini Model Discovery, Ranking & Error Engine
 * Single source of truth for active Gemini model resolution and error categorization.
 * 
 * Official Documentation References:
 * - Method: models.list (Discovery & pageSize): https://ai.google.dev/api/models#method:-models.list
 * - Gemini Models overview & capability reference: https://ai.google.dev/gemini-api/docs/models/gemini
 * - Gemini Model deprecation timeline: https://ai.google.dev/gemini-api/docs/deprecations
 * - Gemini API Error & Troubleshooting reference: https://ai.google.dev/gemini-api/docs/troubleshooting
 * - Standard API Error codes: https://ai.google.dev/gemini-api/docs/api-errors
 */

export const ACTIVE_MODEL_STORAGE_KEY = '@fittrack_gemini_active_model';
export const ACTIVE_MODEL_TIMESTAMP_KEY = '@fittrack_gemini_active_model_time';
export const CANDIDATE_MODELS_STORAGE_KEY = '@fittrack_gemini_candidate_models';
export const MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // ~24 hours
export const MAX_PAGE_SIZE = 1000; // Gemini API max pageSize per official docs
export const MAX_MODEL_DISCOVERY_PAGES = 100;
export const REQUEST_TIMEOUT_MS = 30000; // 30 seconds for AI Coach & Photo analysis
export const TEST_CONNECTION_TIMEOUT_MS = 15000; // 15 seconds for Test Connection

export type FetchFunction = (url: string, init?: RequestInit) => Promise<Response>;
export type WaitFunction = (ms: number) => Promise<void>;

export const defaultWait: WaitFunction = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Valid 16x16 white PNG used to verify multimodal image capability. */
export const TINY_16X16_WHITE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGP8//8/AymAiSTVoxpGNQwpDQBVbQMdPVIhQwAAAABJRU5ErkJggg==';

export type GeminiErrorKind =
  | 'invalid_key'
  | 'permission'
  | 'model_unavailable'
  | 'no_compatible_model'
  | 'quota'
  | 'rate_limit'
  | 'bad_request'
  | 'server'
  | 'network'
  | 'timeout'
  | 'blocked'
  | 'empty';

export interface StorageInterface {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export interface GeminiErrorOptions {
  message?: string;
  status?: number;
  errorStatus?: string;
  providerMessage?: string;
  detailsReason?: string;
  cause?: unknown;
}

export class GeminiError extends Error {
  readonly kind: GeminiErrorKind;
  readonly status?: number;
  readonly errorStatus?: string;
  readonly providerMessage?: string;
  readonly detailsReason?: string;

  constructor(kind: GeminiErrorKind, options?: GeminiErrorOptions) {
    const fallbackMessage = getDefaultMessageForKind(kind);
    super(options?.message || fallbackMessage);
    this.name = 'GeminiError';
    this.kind = kind;
    this.status = options?.status;
    this.errorStatus = options?.errorStatus;
    this.providerMessage = options?.providerMessage;
    this.detailsReason = options?.detailsReason;
    if (options?.cause) {
      (this as any).cause = options.cause;
    }
  }
}

export function getDefaultMessageForKind(kind: GeminiErrorKind): string {
  switch (kind) {
    case 'invalid_key':
      return 'Gemini rejected this API key. Please check your key in Google AI Studio.';
    case 'permission':
      return 'Permission denied. Ensure your API key has access to the Gemini API.';
    case 'model_unavailable':
      return 'The requested Gemini model is unavailable for this key.';
    case 'no_compatible_model':
      return 'No compatible Gemini model found for this API key.';
    case 'quota':
      return 'Gemini API quota exceeded. Please check your usage or billing in Google AI Studio.';
    case 'rate_limit':
      return 'Gemini API quota or rate limit reached. Please wait a moment before trying again.';
    case 'bad_request':
      return 'Bad request to Gemini API.';
    case 'server':
      return 'Gemini service is temporarily unavailable. Please try again shortly.';
    case 'network':
      return 'Network error connecting to Gemini. Check your internet connection.';
    case 'timeout':
      return 'Gemini request timed out. Please check your connection and try again.';
    case 'blocked':
      return 'The response was blocked by Gemini safety filters.';
    case 'empty':
      return 'Gemini returned an empty response. Please try again.';
  }
}

/**
 * Redacts any occurrence of the API key, AIza tokens, AQ keys, and full HTTP/HTTPS URLs.
 * Truncates output to 450 characters maximum.
 */
export function sanitizeGeminiString(str: string, apiKey?: string): string {
  if (!str) return '';
  let cleaned = str;
  if (apiKey && apiKey.trim().length > 0) {
    cleaned = cleaned.split(apiKey.trim()).join('[redacted]');
  }
  return cleaned
    .replace(/AIza[0-9A-Za-z-_]+/g, '[redacted]')
    .replace(/AQ\.[0-9A-Za-z-_.]+/g, '[redacted]')
    .replace(/AQ[0-9A-Za-z-_]{15,}/g, '[redacted]')
    .replace(/https?:\/\/[^\s"'`<>]+/g, '[link omitted]')
    .slice(0, 450);
}

/**
 * Parses Google JSON error responses (error.status, error.message, error.details[].reason)
 * and classifies them into a strongly typed GeminiError.
 */
export function parseGoogleErrorBody(status: number, rawBody: string, apiKey?: string): GeminiError {
  let parsedJson: any = null;
  try {
    if (rawBody && rawBody.trim()) {
      parsedJson = JSON.parse(rawBody);
    }
  } catch {
    // Non-JSON response body, fall back gracefully
  }

  const errorObj = parsedJson?.error;
  const rawMessage: string = errorObj?.message || (typeof rawBody === 'string' ? rawBody : '');
  const errorStatus: string = errorObj?.status || '';

  // Extract error details reason if present
  let detailsReason: string | undefined = undefined;
  if (Array.isArray(errorObj?.details)) {
    const errorInfo = errorObj.details.find((d: any) => typeof d?.reason === 'string');
    if (errorInfo?.reason) {
      detailsReason = String(errorInfo.reason);
    }
  }

  const sanitizedProvider = sanitizeGeminiString(rawMessage, apiKey);
  const sanitizedReason = detailsReason ? sanitizeGeminiString(detailsReason, apiKey) : undefined;
  const sanitizedErrorStatus = errorStatus ? sanitizeGeminiString(errorStatus, apiKey) : undefined;

  let kind: GeminiErrorKind = 'bad_request';

  // 1. Check for invalid key reasons / messages (Google can return 400, 401, or 403 for bad keys)
  const isInvalidKeySignal =
    status === 401 ||
    sanitizedReason === 'API_KEY_INVALID' ||
    sanitizedReason === 'API_KEY_SERVICE_BLOCKED' ||
    sanitizedReason === 'ACCESS_TOKEN_TYPE_UNSUPPORTED' ||
    /api[ _-]?key/i.test(sanitizedProvider) && /(invalid|not valid|expired|bad key)/i.test(sanitizedProvider) ||
    errorStatus === 'UNAUTHENTICATED';

  if (isInvalidKeySignal) {
    kind = 'invalid_key';
  } else if (status === 403) {
    kind = 'permission';
  } else if (status === 404) {
    kind = 'model_unavailable';
  } else if (status === 429) {
    if (
      /quota/i.test(sanitizedProvider) ||
      /quota/i.test(sanitizedReason || '') ||
      /RESOURCE_EXHAUSTED/i.test(errorStatus)
    ) {
      kind = 'quota';
    } else {
      kind = 'rate_limit';
    }
  } else if (status >= 500 && status <= 504) {
    kind = 'server';
  } else if (status === 400) {
    kind = 'bad_request';
  }

  return new GeminiError(kind, {
    status,
    errorStatus: sanitizedErrorStatus,
    providerMessage: sanitizedProvider,
    detailsReason: sanitizedReason,
    message: sanitizedProvider ? `${getDefaultMessageForKind(kind)} (${sanitizedProvider})` : undefined,
  });
}

export function getStandardStatusName(status: number): string | undefined {
  switch (status) {
    case 400: return 'INVALID_ARGUMENT';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'PERMISSION_DENIED';
    case 404: return 'NOT_FOUND';
    case 429: return 'RESOURCE_EXHAUSTED';
    case 500: return 'INTERNAL';
    case 502: return 'BAD_GATEWAY';
    case 503: return 'UNAVAILABLE';
    case 504: return 'DEADLINE_EXCEEDED';
    default: return undefined;
  }
}

/**
 * Formats provider error details into a clean, sanitized diagnostic string:
 * e.g. "401 UNAUTHENTICATED · ACCESS_TOKEN_TYPE_UNSUPPORTED" or "503 UNAVAILABLE · The model is overloaded. Please try again later."
 * Never leaks the API key or full URLs.
 */
export function formatProviderErrorDetail(err: unknown, apiKey?: string): string | null {
  if (!err) return null;

  if (err instanceof GeminiError) {
    const statusCode = err.status;
    let errorStatus = err.errorStatus;
    if (!errorStatus && statusCode) {
      errorStatus = getStandardStatusName(statusCode);
    }

    const header = statusCode && errorStatus
      ? `${statusCode} ${errorStatus}`
      : statusCode
      ? String(statusCode)
      : errorStatus || null;

    let reason = err.detailsReason;
    if (!reason && err.providerMessage) {
      reason = err.providerMessage;
    }

    if (reason) {
      const sanitizedReason = sanitizeGeminiString(reason, apiKey);
      if (header) {
        return `${header} · ${sanitizedReason}`;
      }
      return sanitizedReason;
    }

    return header;
  }

  // Non-GeminiError fallback
  const anyErr = err as any;
  const statusCode = anyErr?.status || anyErr?.statusCode;
  const rawMsg = anyErr?.providerMessage || anyErr?.message || '';
  const sanitizedMsg = sanitizeGeminiString(rawMsg, apiKey);
  const errorStatus = typeof statusCode === 'number' ? getStandardStatusName(statusCode) : undefined;

  const header = statusCode && errorStatus
    ? `${statusCode} ${errorStatus}`
    : statusCode
    ? String(statusCode)
    : errorStatus || null;

  if (header && sanitizedMsg && !header.includes(sanitizedMsg)) {
    return `${header} · ${sanitizedMsg}`;
  }
  return header || (sanitizedMsg ? sanitizedMsg : null);
}

/**
 * Checks if an API key starts with "AQ." (or "AQ").
 */
export function isAQKey(apiKey?: string | null): boolean {
  if (!apiKey) return false;
  const clean = apiKey.trim();
  return clean.startsWith('AQ.') || clean.startsWith('AQ');
}

/**
 * Detects if an error is an AQ key rejection from Google (e.g. 401 UNAUTHENTICATED,
 * ACCESS_TOKEN_TYPE_UNSUPPORTED, 403, or "API key not valid").
 */
export function isAQKeyRejection(err: unknown, apiKey?: string | null): boolean {
  const hasAQKey = isAQKey(apiKey);
  if (err instanceof GeminiError) {
    if (err.detailsReason === 'ACCESS_TOKEN_TYPE_UNSUPPORTED') return true;
    if (hasAQKey && (err.kind === 'invalid_key' || err.kind === 'permission' || err.status === 401 || err.status === 403)) {
      return true;
    }
    if (hasAQKey && err.providerMessage && /(invalid|not valid|unsupported|unauthenticated)/i.test(err.providerMessage)) {
      return true;
    }
  }

  const anyErr = err as any;
  if (anyErr?.detailsReason === 'ACCESS_TOKEN_TYPE_UNSUPPORTED') return true;
  if (hasAQKey && (anyErr?.status === 401 || anyErr?.status === 403)) return true;
  const msg = String(anyErr?.message || anyErr?.providerMessage || '');
  if (msg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')) return true;
  if (hasAQKey && /(invalid|not valid|unsupported|unauthenticated|401|403)/i.test(msg)) return true;

  return false;
}

/**
 * User-friendly explanation for AQ key rejections in en/ar/ckb.
 * Explicitly advises creating a key in AI Studio inside a new project,
 * without stating the key is the wrong type.
 */
export function getAQKeyExplanation(language: AppLanguage = 'en'): string {
  switch (language) {
    case 'ar':
      return 'تم رفض مفتاح Gemini هذا من قبل Google. حاول إنشاء مفتاح جديد في Google AI Studio ضمن مشروع جديد.';
    case 'ckb':
      return 'ئەم کلیلەی Gemini لەلایەن Google ڕەتکرایەوە. هەوڵبدە کلیلێکی نوێ لە Google AI Studio لەناو پڕۆژەیەکی نوێدا دروست بکەیت.';
    default:
      return 'This Gemini API key was rejected by Google. Try creating a new key in Google AI Studio inside a new project.';
  }
}

export const DEFAULT_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

/**
 * Builds candidate model fallback chain:
 * Order: stable flash, then flash-lite, then previous flash versions, then others.
 * If activeModel is specified, it is placed first without duplicates.
 */
export function buildModelFallbackChain(models: string[], activeModel?: string): string[] {
  const pool = models && models.length > 0 ? models : DEFAULT_FALLBACK_MODELS;
  const cleaned = pool.map((m) => m.replace(/^models\//, '').trim()).filter(Boolean);

  const EXCLUDED_KEYWORDS = [
    'tts', 'image', 'live', 'audio', 'embedding', 'omni', 'robotics', 'veo', 'imagen', 'lyria',
  ];

  const eligible = cleaned.filter((name) => {
    const lower = name.toLowerCase();
    return (
      lower.startsWith('gemini-') &&
      !EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw)) &&
      !/(^|[-_])computer[-_]?use($|[-_])/.test(lower) &&
      !/(^|[-_])deep[-_]?research($|[-_])/.test(lower) &&
      !/(^|[-_])exp(?:[-_]|$)/.test(lower)
    );
  });

  const unique = Array.from(new Set(eligible));

  interface ParsedModel {
    name: string;
    major: number;
    minor: number;
    isPreview: boolean;
    isFlash: boolean;
    isFlashLite: boolean;
    isPro: boolean;
  }

  const parsedList: ParsedModel[] = unique.map((name) => {
    const lower = name.toLowerCase();
    const isPreview = lower.includes('preview');
    const isFlashLite = lower.includes('flash-lite');
    const isFlash = lower.includes('flash') && !isFlashLite;
    const isPro = lower.includes('pro');
    const versionMatch = lower.match(/gemini-(\d+)(?:\.(\d+))?/);
    const major = versionMatch ? parseInt(versionMatch[1], 10) : 0;
    const minor = versionMatch && versionMatch[2] ? parseInt(versionMatch[2], 10) : 0;
    return { name, major, minor, isPreview, isFlash, isFlashLite, isPro };
  });

  const versionSortDesc = (a: ParsedModel, b: ParsedModel) => {
    if (a.major !== b.major) return b.major - a.major;
    if (a.minor !== b.minor) return b.minor - a.minor;
    return a.name.localeCompare(b.name);
  };

  const stableFlash = parsedList.filter((p) => !p.isPreview && p.isFlash).sort(versionSortDesc);
  const stableFlashLite = parsedList.filter((p) => !p.isPreview && p.isFlashLite).sort(versionSortDesc);
  const previews = parsedList.filter((p) => p.isPreview).sort(versionSortDesc);
  const others = parsedList.filter((p) => !p.isPreview && !p.isFlash && !p.isFlashLite).sort(versionSortDesc);

  const chain: string[] = [];

  // 1. Top stable flash (e.g. gemini-2.5-flash)
  if (stableFlash.length > 0) {
    chain.push(stableFlash[0].name);
  }

  // 2. Flash-lite models (e.g. gemini-2.5-flash-lite, gemini-2.0-flash-lite)
  for (const lite of stableFlashLite) {
    chain.push(lite.name);
  }

  // 3. Previous flash versions (e.g. gemini-2.0-flash, gemini-1.5-flash)
  if (stableFlash.length > 1) {
    for (let i = 1; i < stableFlash.length; i++) {
      chain.push(stableFlash[i].name);
    }
  }

  // 4. Other models (previews, pro)
  for (const p of previews) {
    chain.push(p.name);
  }
  for (const o of others) {
    chain.push(o.name);
  }

  if (activeModel) {
    const cleanActive = activeModel.replace(/^models\//, '').trim();
    const withoutActive = chain.filter((m) => m !== cleanActive);
    return [cleanActive, ...withoutActive];
  }

  return chain.length > 0 ? chain : DEFAULT_FALLBACK_MODELS;
}

/**
 * Pure candidate ranking function without hardcoded active names.
 * Excludes tts, image, live, audio, embedding, omni, robotics, veo, imagen, lyria.
 * Ranks models:
 * 1. Prefer stable over -preview
 * 2. Prefer highest version of gemini-<major>.<minor>-flash
 * 3. Then flash-lite
 * 4. Then preview builds
 */
export function rankCandidates(modelNames: string[]): string[] {
  const EXCLUDED_KEYWORDS = [
    'tts',
    'image',
    'live',
    'audio',
    'embedding',
    'omni',
    'robotics',
    'veo',
    'imagen',
    'lyria',
  ];

  const filtered = modelNames
    .map((m) => m.replace(/^models\//, ''))
    .filter((name) => {
      const lower = name.toLowerCase();
      // Only Gemini model IDs are eligible; explicitly reject tool/research/experimental families.
      return lower.startsWith('gemini-') &&
        !EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw)) &&
        !/(^|[-_])computer[-_]?use($|[-_])/.test(lower) &&
        !/(^|[-_])deep[-_]?research($|[-_])/.test(lower) &&
        !/(^|[-_])exp(?:[-_]|$)/.test(lower);
    });

  interface RankedItem {
    name: string;
    tier: number;
    major: number;
    minor: number;
  }

  const items: RankedItem[] = filtered.map((name) => {
    const lower = name.toLowerCase();
    const isPreview = lower.includes('preview');
    const isFlashLite = lower.includes('flash-lite');
    const isFlash = lower.includes('flash') && !isFlashLite;
    const isPro = lower.includes('pro');

    // Parse version: gemini-2.5-flash -> major: 2, minor: 5
    const versionMatch = lower.match(/gemini-(\d+)(?:\.(\d+))?/);
    const major = versionMatch ? parseInt(versionMatch[1], 10) : 0;
    const minor = versionMatch && versionMatch[2] ? parseInt(versionMatch[2], 10) : 0;

    let tier = 6;
    if (!isPreview) {
      if (isFlash) tier = 1;         // Stable flash (highest priority)
      else if (isFlashLite) tier = 2; // Stable flash-lite
      else if (isPro) tier = 3;       // Stable pro
      else tier = 4;                  // Other stable text generation
    } else {
      if (isFlash) tier = 5;         // Preview flash
      else if (isFlashLite) tier = 6; // Preview flash-lite
      else tier = 7;                  // Other preview
    }

    return { name, tier, major, minor };
  });

  items.sort((a, b) => {
    // 1. Lower tier number first (stable flash > stable flash-lite > preview)
    if (a.tier !== b.tier) return a.tier - b.tier;
    // 2. Higher major version first (3 > 2 > 1)
    if (a.major !== b.major) return b.major - a.major;
    // 3. Higher minor version first (2.5 > 2.0)
    if (a.minor !== b.minor) return b.minor - a.minor;
    // 4. Alphabetical tie breaker
    return a.name.localeCompare(b.name);
  });

  return items.map((i) => i.name);
}

/**
 * Discovers available models from GET https://generativelanguage.googleapis.com/v1beta/models
 * Passes API key via 'x-goog-api-key' header (never in the URL).
 * Uses pageSize=1000 and follows nextPageToken.
 */
export async function fetchAvailableModels(
  apiKey: string,
  customFetch: FetchFunction = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<string[]> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new GeminiError('invalid_key', { message: 'Add a Gemini API key in Profile to use AI features.' });
  }

  const modelNames: string[] = [];
  let pageToken: string | undefined = undefined;
  const seenPageTokens = new Set<string>();
  const discoveryDeadline = Date.now() + Math.max(1, timeoutMs);
  let pagesFetched = 0;

  do {
    if (Date.now() >= discoveryDeadline) {
      throw new GeminiError('timeout', { message: 'Gemini model discovery timed out. Please try again.' });
    }
    if (pagesFetched >= MAX_MODEL_DISCOVERY_PAGES) {
      throw new GeminiError('server', { message: 'Gemini model discovery exceeded the safe page limit.' });
    }
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
    url.searchParams.set('key', cleanKey);
    url.searchParams.set('pageSize', String(MAX_PAGE_SIZE));
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    if (pageToken && seenPageTokens.has(pageToken)) {
      throw new GeminiError('server', { message: 'Gemini model discovery returned a repeated page token.' });
    }
    if (pageToken) seenPageTokens.add(pageToken);

    const { response, bodyText } = await fetchWithTimeout(customFetch, url.toString(), {
        method: 'GET',
        headers: {
          'x-goog-api-key': cleanKey,
        },
      }, cleanKey, discoveryDeadline - Date.now());
    pagesFetched++;

    if (!response.ok) {
      throw parseGoogleErrorBody(response.status, bodyText, cleanKey);
    }

    let json: any;
    try {
      json = JSON.parse(bodyText);
    } catch {
      throw new GeminiError('server', { message: 'Invalid response from Gemini model discovery.' });
    }

    const modelsList = Array.isArray(json?.models) ? json.models : [];
    for (const m of modelsList) {
      const methods = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
      if (methods.includes('generateContent') && typeof m?.name === 'string') {
        modelNames.push(m.name.replace(/^models\//, ''));
      }
    }

    pageToken = typeof json?.nextPageToken === 'string' && json.nextPageToken ? json.nextPageToken : undefined;
  } while (pageToken);

  return modelNames;
}

/**
 * Sends a tiny text probe and a 1x1 image probe via generateContent to verify candidate model.
 */
export async function verifyCandidate(
  modelName: string,
  apiKey: string,
  customFetch: FetchFunction = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<'ok' | 'incompatible'> {
  const cleanKey = apiKey.trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;
  const post = async (parts: Record<string, unknown>[]): Promise<'ok' | 'incompatible'> => {
    const { response, bodyText } = await fetchWithTimeout(customFetch, endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cleanKey },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: 5 } }),
    }, cleanKey, timeoutMs);

    if (!response.ok) {
      const error = parseGoogleErrorBody(response.status, bodyText, cleanKey);
      if (response.status === 404) return 'incompatible';
      if (response.status === 400 && /model|modality|image|vision|multimodal|unsupported|not supported/i.test(error.providerMessage || '')) {
        return 'incompatible';
      }
      throw error;
    }

    let json: any;
    try { json = JSON.parse(bodyText); }
    catch (cause) { throw new GeminiError('server', { status: response.status, message: 'Invalid response from Gemini probe.', cause }); }
    if (!json?.candidates?.length) throw new GeminiError('empty', { status: response.status });
    return 'ok';
  };

  const textResult = await post([{ text: 'ping' }]);
  if (textResult === 'incompatible') return textResult;
  return post([
    { text: 'Describe this image in one word.' },
    { inlineData: { mimeType: 'image/png', data: TINY_16X16_WHITE_PNG_BASE64 } },
  ]);
}

/**
 * Discovers and verifies the best compatible model for an API key.
 * Tests up to top 3 ranked candidates.
 */
export async function discoverAndVerifyModel(
  apiKey: string,
  customFetch: FetchFunction = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
  storage?: StorageInterface
): Promise<string> {
  const models = await fetchAvailableModels(apiKey, customFetch, timeoutMs);
  const ranked = rankCandidates(models);

  if (!ranked.length) {
    throw new GeminiError('no_compatible_model', {
      message: 'No compatible Gemini model found for this API key.',
    });
  }

  // Persist discovered candidate pool so fallback can use it
  await safeStorageSet(CANDIDATE_MODELS_STORAGE_KEY, JSON.stringify(ranked), storage).catch(() => {});

  const topCandidates = ranked.slice(0, 3);
  for (const candidate of topCandidates) {
    const result = await verifyCandidate(candidate, apiKey, customFetch, timeoutMs);
    if (result === 'ok') {
      return candidate;
    }
  }

  throw new GeminiError('no_compatible_model', {
    message: 'None of the candidate Gemini models passed text and multimodal verification.',
  });
}

async function fetchWithTimeout(
  customFetch: FetchFunction,
  url: string,
  init: RequestInit,
  apiKey: string,
  timeoutMs: number
): Promise<{ response: Response; bodyText: string }> {
  const controller = new AbortController();
  const timeout = Math.max(1, timeoutMs);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let didTimeout = false;
  const timer = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      reject(new GeminiError('timeout', { message: 'Gemini request timed out. Please check your connection and try again.' }));
    }, timeout);
  });
  try {
    return await Promise.race([
      customFetch(url, { ...init, signal: controller.signal }).then(async (response) => ({
        response,
        bodyText: await response.text(),
      })).catch((cause) => {
        if (didTimeout || (cause?.name === 'AbortError' && didTimeout)) {
          throw new GeminiError('timeout', { cause });
        }
        throw new GeminiError('network', {
          message: sanitizeGeminiString((cause as any)?.message || getDefaultMessageForKind('network'), apiKey),
          cause,
        });
      }),
      timer,
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// In-memory fallback if AsyncStorage is unavailable or throws (e.g. Node environments without window)
const memoryStorage: Record<string, string> = {};
export const inMemoryStorage: StorageInterface = {
  getItem: async (key: string) => memoryStorage[key] ?? null,
  setItem: async (key: string, value: string) => { memoryStorage[key] = value; },
  removeItem: async (key: string) => { delete memoryStorage[key]; },
};

export async function safeStorageGet(key: string, custom?: StorageInterface): Promise<string | null> {
  if (custom) return custom.getItem(key);
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return inMemoryStorage.getItem(key);
  }
}

export async function safeStorageSet(key: string, value: string, custom?: StorageInterface): Promise<void> {
  if (custom) return custom.setItem(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    await inMemoryStorage.setItem(key, value);
  }
}

export async function safeStorageRemove(key: string, custom?: StorageInterface): Promise<void> {
  if (custom) return custom.removeItem(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    await inMemoryStorage.removeItem(key);
  }
}

export async function getCachedCandidateModels(storage?: StorageInterface): Promise<string[]> {
  try {
    const raw = await safeStorageGet(CANDIDATE_MODELS_STORAGE_KEY, storage);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m: any) => String(m));
      }
    }
  } catch {
    // Non-fatal, return empty
  }
  return [];
}

/**
 * Returns the currently active Gemini model name, reading from cache if valid (<24h),
 * or discovering and verifying a new model if expired or missing.
 */
export async function getActiveModel(
  apiKey: string,
  forceRefresh = false,
  customFetch: FetchFunction = fetch,
  storage?: StorageInterface,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<string> {
  const clean = apiKey.trim();
  if (!forceRefresh) {
    try {
      const cached = await safeStorageGet(ACTIVE_MODEL_STORAGE_KEY, storage);
      const timeStr = await safeStorageGet(ACTIVE_MODEL_TIMESTAMP_KEY, storage);
      if (cached && timeStr) {
        const time = parseInt(timeStr, 10);
        if (Date.now() - time < MODEL_CACHE_TTL_MS) {
          return cached;
        }
      }
    } catch {
      // Ignore cache read failures and discover fresh
    }
  }

  const selected = await discoverAndVerifyModel(clean, customFetch, timeoutMs, storage);
  try {
    await safeStorageSet(ACTIVE_MODEL_STORAGE_KEY, selected, storage);
    await safeStorageSet(ACTIVE_MODEL_TIMESTAMP_KEY, String(Date.now()), storage);
  } catch {
    // Non-fatal if cache save fails
  }

  return selected;
}

/**
 * Clears the active model cache in AsyncStorage (called when the key is updated or cleared).
 */
export async function clearActiveModelCache(storage?: StorageInterface): Promise<void> {
  try {
    await safeStorageRemove(ACTIVE_MODEL_STORAGE_KEY, storage);
    await safeStorageRemove(ACTIVE_MODEL_TIMESTAMP_KEY, storage);
    await safeStorageRemove(CANDIDATE_MODELS_STORAGE_KEY, storage);
  } catch {
    // Ignore cleanup error
  }
}

/**
 * Tests the Gemini API key connection, performing discovery and verification.
 * Uses a fast 15-second timeout for rapid feedback.
 * Returns the verified active model name on success, or throws GeminiError.
 */
export async function testGeminiConnection(
  apiKey: string,
  customFetch: FetchFunction = fetch,
  storage?: StorageInterface
): Promise<string> {
  const clean = apiKey.trim();
  if (!clean) {
    throw new GeminiError('invalid_key', { message: 'Enter a Gemini API key first.' });
  }

  // Force discovery and verification with 15s timeout to guarantee end-to-end functionality
  await clearActiveModelCache(storage);
  const verifiedModel = await getActiveModel(clean, true, customFetch, storage, TEST_CONNECTION_TIMEOUT_MS);
  return verifiedModel;
}
