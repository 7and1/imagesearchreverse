/**
 * Search result caching module using Cloudflare KV
 *
 * Provides caching for reverse image search results to reduce API costs
 * and improve response times for repeated searches of the same image.
 */

import { sha256Hex } from "@/lib/crypto";
import type { SearchResult } from "@/lib/dataforseo";

/** Prefix for image search cache entries */
const CACHE_PREFIX = "cache:img" as const;

/** Prefix for task ID to cache key mappings */
const TASK_PREFIX = "task:img" as const;

/**
 * Cached search result structure
 */
export type CachedSearchResult = {
  /** The DataForSEO task ID (if available) */
  taskId?: string;
  /** Array of search results */
  results: SearchResult[];
  /** URL to check task status (for pending results) */
  checkUrl?: string;
  /** ISO timestamp when the result was cached */
  cachedAt: string;
};

/**
 * Builds a cache key for an image search.
 *
 * Uses either the provided image hash or computes a SHA-256 hash of the URL.
 * The key format includes the source type to differentiate between hash-based
 * and URL-based cache entries.
 *
 * @param imageUrl - The URL of the image being searched
 * @param imageHash - Optional pre-computed hash of the image content
 * @returns A unique cache key in format `cache:img:{source}:{hash}`
 *
 * @example
 * ```ts
 * // URL-based key
 * const key = await buildCacheKey("https://example.com/image.jpg");
 * // => "cache:img:url:a1b2c3..."
 *
 * // Hash-based key (more reliable for duplicate detection)
 * const key = await buildCacheKey(url, "abc123def456...");
 * // => "cache:img:hash:abc123def456..."
 * ```
 */
export const buildCacheKey = async (imageUrl: string, imageHash?: string): Promise<string> => {
  const normalizedHash = imageHash?.toLowerCase();
  const keyHash = normalizedHash ?? (await sha256Hex(imageUrl));
  const source = normalizedHash ? "hash" : "url";
  return `${CACHE_PREFIX}:${source}:${keyHash}`;
};

/**
 * Retrieves a cached search result from KV storage.
 *
 * @param kv - The Cloudflare KV namespace
 * @param cacheKey - The cache key (from buildCacheKey)
 * @returns The cached result if found and valid, or null
 *
 * @example
 * ```ts
 * const cacheKey = await buildCacheKey(imageUrl);
 * const cached = await getCachedResult(env.KV_RATE_LIMIT, cacheKey);
 * if (cached) {
 *   return cached.results;
 * }
 * ```
 */
export const getCachedResult = async (
  kv: KVNamespace,
  cacheKey: string,
): Promise<CachedSearchResult | null> => {
  try {
    const cached = await kv.get(cacheKey, { type: "json" });
    if (!cached || typeof cached !== "object") return null;
    const data = cached as CachedSearchResult;
    if (!Array.isArray(data.results)) return null;
    return data;
  } catch {
    return null;
  }
};

/**
 * Stores a search result in the cache.
 *
 * @param kv - The Cloudflare KV namespace
 * @param cacheKey - The cache key (from buildCacheKey)
 * @param payload - The search result to cache
 * @param ttlSeconds - Time-to-live in seconds
 *
 * @example
 * ```ts
 * await storeCachedResult(env.KV_RATE_LIMIT, cacheKey, {
 *   taskId: "abc123",
 *   results: searchResults,
 *   cachedAt: new Date().toISOString(),
 * }, 48 * 60 * 60); // 48 hours
 * ```
 */
export const storeCachedResult = async (
  kv: KVNamespace,
  cacheKey: string,
  payload: CachedSearchResult,
  ttlSeconds: number,
): Promise<void> => {
  await kv.put(cacheKey, JSON.stringify(payload), {
    expirationTtl: ttlSeconds,
  });
};

/**
 * Stores a mapping from task ID to cache key.
 *
 * This allows looking up the cache entry when polling for task completion.
 *
 * @param kv - The Cloudflare KV namespace
 * @param taskId - The DataForSEO task ID
 * @param cacheKey - The cache key to associate with the task
 * @param ttlSeconds - Time-to-live in seconds
 */
export const storeTaskMapping = async (
  kv: KVNamespace,
  taskId: string,
  cacheKey: string,
  ttlSeconds: number,
): Promise<void> => {
  await kv.put(`${TASK_PREFIX}:${taskId}`, cacheKey, {
    expirationTtl: ttlSeconds,
  });
};

/**
 * Retrieves the cache key associated with a task ID.
 *
 * @param kv - The Cloudflare KV namespace
 * @param taskId - The DataForSEO task ID
 * @returns The associated cache key, or null if not found
 */
export const getCacheKeyForTask = async (
  kv: KVNamespace,
  taskId: string,
): Promise<string | null> => {
  return kv.get(`${TASK_PREFIX}:${taskId}`, { type: "text" });
};
