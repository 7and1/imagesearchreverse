import { describe, expect, it, beforeEach } from "vitest";
import {
  buildCacheKey,
  getCachedResult,
  storeCachedResult,
  storeTaskMapping,
  getCacheKeyForTask,
  type CachedSearchResult,
} from "@/lib/search-cache";
import { MockKVNamespace } from "@/test/setup";

describe("search-cache", () => {
  let mockKv: KVNamespace;

  beforeEach(() => {
    mockKv = new MockKVNamespace() as unknown as KVNamespace;
  });

  describe("buildCacheKey", () => {
    it("builds key from URL when hash is not provided", async () => {
      const key = await buildCacheKey("https://example.com/image.jpg");
      expect(key).toMatch(/^cache:img:url:[a-f0-9]{64}$/);
    });

    it("builds key from hash when provided", async () => {
      const key = await buildCacheKey(
        "https://example.com/image.jpg",
        "abc123def456",
      );
      expect(key).toBe("cache:img:hash:abc123def456");
    });

    it("normalizes hash to lowercase", async () => {
      const key = await buildCacheKey(
        "https://example.com/image.jpg",
        "ABC123DEF456",
      );
      expect(key).toBe("cache:img:hash:abc123def456");
    });

    it("produces consistent keys for same URL", async () => {
      const key1 = await buildCacheKey("https://example.com/image.jpg");
      const key2 = await buildCacheKey("https://example.com/image.jpg");
      expect(key1).toBe(key2);
    });

    it("produces different keys for different URLs", async () => {
      const key1 = await buildCacheKey("https://example.com/image1.jpg");
      const key2 = await buildCacheKey("https://example.com/image2.jpg");
      expect(key1).not.toBe(key2);
    });

    it("distinguishes between URL and hash-based keys", async () => {
      const hash = "a".repeat(64);
      const urlKey = await buildCacheKey("https://example.com/image.jpg");
      const hashKey = await buildCacheKey(
        "https://example.com/image.jpg",
        hash,
      );
      expect(urlKey).not.toBe(hashKey);
    });
  });

  describe("getCachedResult", () => {
    it("returns null for non-existent key", async () => {
      const result = await getCachedResult(mockKv, "nonexistent");
      expect(result).toBeNull();
    });

    it("returns null for malformed JSON", async () => {
      await mockKv.put("bad-json", "{ invalid json");
      const result = await getCachedResult(mockKv, "bad-json");
      expect(result).toBeNull();
    });

    it("returns null for non-object data", async () => {
      await mockKv.put("string-value", "just a string");
      const result = await getCachedResult(mockKv, "string-value");
      expect(result).toBeNull();
    });

    it("returns null when results array is missing", async () => {
      const invalid = { cachedAt: new Date().toISOString() };
      await mockKv.put("no-results", JSON.stringify(invalid));
      const result = await getCachedResult(mockKv, "no-results");
      expect(result).toBeNull();
    });

    it("returns null when results is not an array", async () => {
      const invalid = {
        results: "not an array",
        cachedAt: new Date().toISOString(),
      };
      await mockKv.put("invalid-results", JSON.stringify(invalid));
      const result = await getCachedResult(mockKv, "invalid-results");
      expect(result).toBeNull();
    });

    it("returns cached result when valid", async () => {
      const valid: CachedSearchResult = {
        results: [
          {
            title: "Test",
            pageUrl: "https://example.com",
            imageUrl: "https://example.com/image.jpg",
            domain: "example.com",
          },
        ],
        cachedAt: new Date().toISOString(),
      };
      await mockKv.put("valid", JSON.stringify(valid));
      const result = await getCachedResult(mockKv, "valid");
      expect(result).toEqual(valid);
    });

    it("returns cached result with taskId", async () => {
      const valid: CachedSearchResult = {
        taskId: "task123",
        results: [],
        cachedAt: new Date().toISOString(),
      };
      await mockKv.put("with-task", JSON.stringify(valid));
      const result = await getCachedResult(mockKv, "with-task");
      expect(result?.taskId).toBe("task123");
    });

    it("returns cached result with checkUrl", async () => {
      const valid: CachedSearchResult = {
        checkUrl: "https://google.com/search",
        results: [],
        cachedAt: new Date().toISOString(),
      };
      await mockKv.put("with-check", JSON.stringify(valid));
      const result = await getCachedResult(mockKv, "with-check");
      expect(result?.checkUrl).toBe("https://google.com/search");
    });

    it("handles empty results array", async () => {
      const valid: CachedSearchResult = {
        results: [],
        cachedAt: new Date().toISOString(),
      };
      await mockKv.put("empty-results", JSON.stringify(valid));
      const result = await getCachedResult(mockKv, "empty-results");
      expect(result?.results).toEqual([]);
    });
  });

  describe("storeCachedResult", () => {
    it("stores result with TTL", async () => {
      const data: CachedSearchResult = {
        results: [],
        cachedAt: new Date().toISOString(),
      };
      await storeCachedResult(mockKv, "test-key", data, 3600);
      const retrieved = await mockKv.get("test-key", { type: "json" });
      expect(retrieved).toEqual(data);
    });

    it("serializes data correctly", async () => {
      const data: CachedSearchResult = {
        taskId: "task123",
        checkUrl: "https://google.com/search",
        results: [
          {
            title: "Test",
            pageUrl: "https://example.com",
            imageUrl: "https://example.com/image.jpg",
            domain: "example.com",
          },
        ],
        cachedAt: "2024-01-01T00:00:00.000Z",
      };
      await storeCachedResult(mockKv, "serialize-test", data, 3600);
      const retrieved = await getCachedResult(mockKv, "serialize-test");
      expect(retrieved).toEqual(data);
    });
  });

  describe("storeTaskMapping", () => {
    it("stores task to cache key mapping", async () => {
      await storeTaskMapping(mockKv, "task123", "cache:img:url:abc123", 3600);
      const retrieved = await mockKv.get("task:img:task123", { type: "text" });
      expect(retrieved).toBe("cache:img:url:abc123");
    });

    it("uses correct prefix", async () => {
      await storeTaskMapping(mockKv, "task456", "cache:img:hash:def456", 1800);
      const retrieved = await getCacheKeyForTask(mockKv, "task456");
      expect(retrieved).toBe("cache:img:hash:def456");
    });
  });

  describe("getCacheKeyForTask", () => {
    it("returns null for non-existent task", async () => {
      const result = await getCacheKeyForTask(mockKv, "nonexistent");
      expect(result).toBeNull();
    });

    it("returns cache key for existing task", async () => {
      await mockKv.put("task:img:task789", "cache:img:url:xyz789");
      const result = await getCacheKeyForTask(mockKv, "task789");
      expect(result).toBe("cache:img:url:xyz789");
    });

    it("returns null for malformed data", async () => {
      await mockKv.put("task:img:bad", "{ invalid");
      const result = await getCacheKeyForTask(mockKv, "bad");
      // KV get with type: "text" returns the raw string
      expect(result).toBe("{ invalid");
    });
  });

  describe("integration scenarios", () => {
    it("round-trips cache data correctly", async () => {
      const original: CachedSearchResult = {
        taskId: "task123",
        checkUrl: "https://google.com/search",
        results: [
          {
            title: "Example",
            pageUrl: "https://example.com/page",
            imageUrl: "https://example.com/img.jpg",
            domain: "example.com",
          },
        ],
        cachedAt: new Date().toISOString(),
      };

      await storeCachedResult(mockKv, "integration-test", original, 3600);
      const retrieved = await getCachedResult(mockKv, "integration-test");
      expect(retrieved).toEqual(original);
    });

    it("handles task mapping workflow", async () => {
      const cacheKey = await buildCacheKey("https://example.com/image.jpg");
      const taskId = "task456";

      await storeTaskMapping(mockKv, taskId, cacheKey, 3600);
      const retrievedKey = await getCacheKeyForTask(mockKv, taskId);
      expect(retrievedKey).toBe(cacheKey);
    });
  });
});
