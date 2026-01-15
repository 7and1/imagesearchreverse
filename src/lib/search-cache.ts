import { sha256Hex } from "@/lib/crypto";
import type { SearchResult } from "@/lib/dataforseo";

const CACHE_PREFIX = "cache:img";
const TASK_PREFIX = "task:img";

export type CachedSearchResult = {
  taskId?: string;
  results: SearchResult[];
  checkUrl?: string;
  cachedAt: string;
};

export const buildCacheKey = async (imageUrl: string, imageHash?: string) => {
  const normalizedHash = imageHash?.toLowerCase();
  const keyHash = normalizedHash ?? (await sha256Hex(imageUrl));
  const source = normalizedHash ? "hash" : "url";
  return `${CACHE_PREFIX}:${source}:${keyHash}`;
};

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

export const storeCachedResult = async (
  kv: KVNamespace,
  cacheKey: string,
  payload: CachedSearchResult,
  ttlSeconds: number,
) => {
  await kv.put(cacheKey, JSON.stringify(payload), {
    expirationTtl: ttlSeconds,
  });
};

export const storeTaskMapping = async (
  kv: KVNamespace,
  taskId: string,
  cacheKey: string,
  ttlSeconds: number,
) => {
  await kv.put(`${TASK_PREFIX}:${taskId}`, cacheKey, {
    expirationTtl: ttlSeconds,
  });
};

export const getCacheKeyForTask = async (kv: KVNamespace, taskId: string) => {
  return kv.get(`${TASK_PREFIX}:${taskId}`, { type: "text" });
};
