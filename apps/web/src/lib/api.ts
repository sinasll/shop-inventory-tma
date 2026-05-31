import { getInitData, getInitDataUserId } from './telegram.js';
import { cacheGet, cacheSet } from './cache.js';
import { useSyncStore } from '@/store/sync.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const DEV_TG_ID = import.meta.env.VITE_DEV_TELEGRAM_ID ?? '';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Cache key — when set, GET responses are cached and used offline. */
  cacheKey?: string;
  signal?: AbortSignal;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const initData = getInitData();
  if (initData) {
    headers['Authorization'] = `tma ${initData}`;
    headers['X-Telegram-Init-Data'] = initData;
  } else if (DEV_TG_ID) {
    // Dev fallback when running outside Telegram.
    headers['X-Dev-Telegram-Id'] = DEV_TG_ID;
  }
  return headers;
}

/**
 * Core request helper.
 *  - Attaches verified Telegram auth headers.
 *  - On success: marks app "live", caches GETs.
 *  - On network failure for a cached GET: returns cached data + marks
 *    app "offline" instead of throwing, so the UI keeps working.
 */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const url = `${API_BASE}${path}`;
  const sync = useSyncStore.getState();

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      const err = json as { error?: string; code?: string; details?: unknown } | null;
      throw new ApiClientError(
        res.status,
        err?.code ?? 'error',
        err?.error ?? `Request failed (${res.status})`,
        err?.details,
      );
    }

    sync.setOnline(true);
    if (method === 'GET' && opts.cacheKey) {
      cacheSet(opts.cacheKey, json);
      sync.setLastUpdated(Date.now());
    }
    return json as T;
  } catch (error) {
    // Auth/permission errors must propagate (don't mask with cache).
    if (error instanceof ApiClientError) throw error;

    // Network error: serve cache for cached GETs.
    if (method === 'GET' && opts.cacheKey) {
      const cached = cacheGet<T>(opts.cacheKey);
      if (cached) {
        sync.setOnline(false);
        sync.setLastUpdated(cached.ts);
        return cached.data;
      }
    }
    sync.setOnline(false);
    throw new ApiClientError(0, 'network', 'Network error');
  }
}

export const currentTelegramId = (): string | null => getInitDataUserId() || (DEV_TG_ID || null);
