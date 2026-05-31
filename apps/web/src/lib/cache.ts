/**
 * Offline-first LocalStorage cache.
 *
 * Every successful GET is mirrored here. When a request fails (network),
 * callers fall back to the most recent cached payload so the app keeps
 * working. Entries store a timestamp for the "last updated" indicator.
 */
const PREFIX = 'shopstock:cache:';

export interface CacheEntry<T> {
  data: T;
  ts: number; // epoch ms
}

export function cacheGet<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Quota exceeded — prune oldest cache entries and retry once.
    pruneCache();
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
    } catch {
      /* give up silently */
    }
  }
}

export function cacheClear(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

function pruneCache(): void {
  const entries: Array<{ key: string; ts: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(k) ?? '{}') as { ts?: number };
      entries.push({ key: k, ts: parsed.ts ?? 0 });
    } catch {
      entries.push({ key: k, ts: 0 });
    }
  }
  entries.sort((a, b) => a.ts - b.ts);
  // Drop the oldest half.
  entries.slice(0, Math.ceil(entries.length / 2)).forEach((e) => localStorage.removeItem(e.key));
}
