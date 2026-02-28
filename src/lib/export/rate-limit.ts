/**
 * Client-side export rate limiting & caching.
 * - Max 10 exports per hour per session
 * - Cache common export blobs for 1 hour
 */

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_EXPORTS = 10;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ─── Rate Limiter ────────────────────────────────────

const exportTimestamps: number[] = [];

/** Returns { allowed, remaining, resetMs } */
export function checkExportRateLimit(): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  // Prune expired timestamps
  while (exportTimestamps.length > 0 && now - exportTimestamps[0] > RATE_LIMIT_WINDOW) {
    exportTimestamps.shift();
  }

  const remaining = MAX_EXPORTS - exportTimestamps.length;
  const resetMs =
    exportTimestamps.length > 0
      ? RATE_LIMIT_WINDOW - (now - exportTimestamps[0])
      : 0;

  return { allowed: remaining > 0, remaining, resetMs };
}

/** Record a successful export */
export function recordExport(): void {
  exportTimestamps.push(Date.now());
}

// ─── Export Cache ────────────────────────────────────

interface CacheEntry {
  data: Uint8Array | string;
  timestamp: number;
  hash: string;
}

const exportCache = new Map<string, CacheEntry>();

/** Build a deterministic hash key from export params. */
export function buildCacheKey(
  receiptCount: number,
  format: string,
  startDate: string,
  endDate: string,
  options?: Record<string, unknown>,
): string {
  return JSON.stringify({ receiptCount, format, startDate, endDate, ...options });
}

/** Get a cached export if it exists and hasn't expired. */
export function getCachedExport(key: string): Uint8Array | string | null {
  const entry = exportCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    exportCache.delete(key);
    return null;
  }
  return entry.data;
}

/** Store an export result in the cache. */
export function setCachedExport(key: string, data: Uint8Array | string): void {
  // Limit cache size to 5 entries (~50 MB max)
  if (exportCache.size >= 5) {
    const oldest = [...exportCache.entries()].sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    )[0];
    if (oldest) exportCache.delete(oldest[0]);
  }
  exportCache.set(key, { data, timestamp: Date.now(), hash: key });
}

/** Clear all cached exports. */
export function clearExportCache(): void {
  exportCache.clear();
}
