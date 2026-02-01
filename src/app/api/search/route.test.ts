import { describe, expect, it, beforeEach, vi } from "vitest";

// Mock @cloudflare/next-on-pages before any imports that use it
vi.mock("@cloudflare/next-on-pages", () => ({
  getRequestContext: vi.fn(() => ({
    env: {},
  })),
}));

import { POST, GET } from "./route";
import {
  createMockEnv,
  createMockRequest,
  MockKVNamespace,
  restoreFetch,
} from "@/test/setup";
import type { AppEnv } from "@/lib/cf-env";

// Mock the cf-env module to return our test env
vi.mock("@/lib/cf-env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/cf-env")>();
  return {
    ...original,
    getEnv: vi.fn(),
  };
});

// Mock dataforseo module
vi.mock("@/lib/dataforseo", () => ({
  parseImageSearchInput: vi.fn(),
  resolveSearchResults: vi.fn(),
  getSearchByImageTask: vi.fn(),
  extractSearchResults: vi.fn(),
  extractCheckUrl: vi.fn(),
}));

// Mock turnstile module
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

// Mock request-deduplication
vi.mock("@/lib/request-deduplication", () => ({
  deduplicatedRequest: vi.fn((key: string, fn: () => Promise<unknown>) => fn()),
}));

import { getEnv } from "@/lib/cf-env";
import {
  parseImageSearchInput,
  resolveSearchResults,
  getSearchByImageTask,
  extractSearchResults,
  extractCheckUrl,
} from "@/lib/dataforseo";
import { verifyTurnstileToken } from "@/lib/turnstile";

describe("POST /api/search", () => {
  let env: AppEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.mocked(getEnv).mockReturnValue(env);
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ ok: true, skipped: true });
    vi.mocked(parseImageSearchInput).mockResolvedValue({
      imageUrl: "https://example.com/image.jpg",
      imageHash: undefined,
      turnstileToken: undefined,
    });
    restoreFetch();
  });

  describe("input validation", () => {
    it("returns 400 when imageUrl parsing fails", async () => {
      vi.mocked(parseImageSearchInput).mockRejectedValue(
        new Error("Invalid imageUrl"),
      );

      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: {},
        cfConnectingIp: "127.0.0.1",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("returns 413 when request body is too large", async () => {
      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: { imageUrl: "https://example.com/image.jpg" },
        cfConnectingIp: "127.0.0.1",
        headers: { "content-length": "20000" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error).toContain("too large");
    });
  });

  describe("turnstile verification", () => {
    it("returns 403 when turnstile verification fails", async () => {
      vi.mocked(verifyTurnstileToken).mockResolvedValue({
        ok: false,
        error: "Turnstile verification failed.",
      });

      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: {
          imageUrl: "https://example.com/image.jpg",
          turnstileToken: "invalid-token",
        },
        cfConnectingIp: "127.0.0.1",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Turnstile");
    });

    it("proceeds when turnstile verification succeeds", async () => {
      vi.mocked(verifyTurnstileToken).mockResolvedValue({
        ok: true,
        skipped: false,
      });
      vi.mocked(resolveSearchResults).mockResolvedValue({
        status: "pending",
        taskId: "test-task-123",
        results: [],
      });

      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: {
          imageUrl: "https://example.com/image.jpg",
          turnstileToken: "valid-token",
        },
        cfConnectingIp: "127.0.0.1",
      });

      const response = await POST(request);

      expect(response.status).toBeLessThan(500);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limit exceeded", async () => {
      // Exhaust rate limit
      const kv = env.KV_RATE_LIMIT as unknown as MockKVNamespace;
      const today = new Date().toISOString().split("T")[0];
      await kv.put(`limit:127.0.0.1:${today}`, "10");

      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: { imageUrl: "https://example.com/image.jpg" },
        cfConnectingIp: "127.0.0.1",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain("limit");
    });

    it("includes rate limit headers in response", async () => {
      vi.mocked(resolveSearchResults).mockResolvedValue({
        status: "ready",
        taskId: "test-task-123",
        results: [{ title: "Test", pageUrl: "https://example.com" }],
      });

      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: { imageUrl: "https://example.com/image.jpg" },
        cfConnectingIp: "127.0.0.1",
      });

      const response = await POST(request);

      expect(response.headers.get("X-RateLimit-Limit")).toBeDefined();
      expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
    });
  });

  describe("search flow", () => {
    it("returns pending status when task is created", async () => {
      vi.mocked(resolveSearchResults).mockResolvedValue({
        status: "pending",
        taskId: "test-task-123",
        results: [],
      });

      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: { imageUrl: "https://example.com/image.jpg" },
        cfConnectingIp: "127.0.0.1",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.status).toBe("pending");
      expect(data.taskId).toBe("test-task-123");
    });

    it("returns results when search completes immediately", async () => {
      vi.mocked(resolveSearchResults).mockResolvedValue({
        status: "ready",
        taskId: "test-task-123",
        results: [
          {
            title: "Test Result",
            pageUrl: "https://example.com/result",
          },
        ],
        checkUrl: "https://dataforseo.com/check/123",
      });

      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: { imageUrl: "https://example.com/image.jpg" },
        cfConnectingIp: "127.0.0.1",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ready");
      expect(data.results).toHaveLength(1);
    });

    it("handles DataForSEO errors gracefully", async () => {
      vi.mocked(resolveSearchResults).mockRejectedValue(
        new Error("DataForSEO API error"),
      );

      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: { imageUrl: "https://example.com/image.jpg" },
        cfConnectingIp: "127.0.0.1",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe("request headers", () => {
    it("includes request ID in response", async () => {
      vi.mocked(resolveSearchResults).mockResolvedValue({
        status: "ready",
        taskId: "test-task-123",
        results: [],
      });

      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "POST",
        body: { imageUrl: "https://example.com/image.jpg" },
        cfConnectingIp: "127.0.0.1",
      });

      const response = await POST(request);

      expect(response.headers.get("X-Request-Id")).toBeDefined();
    });
  });
});

describe("GET /api/search", () => {
  let env: AppEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    env = createMockEnv();
    vi.mocked(getEnv).mockReturnValue(env);
    vi.mocked(getSearchByImageTask).mockResolvedValue({});
    vi.mocked(extractSearchResults).mockReturnValue([]);
    vi.mocked(extractCheckUrl).mockReturnValue(undefined);
    restoreFetch();
  });

  describe("input validation", () => {
    it("returns 400 when taskId is missing", async () => {
      const request = createMockRequest({
        url: "https://example.com/api/search",
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("task ID");
    });

    it("accepts valid taskId", async () => {
      vi.mocked(getSearchByImageTask).mockResolvedValue({});
      vi.mocked(extractSearchResults).mockReturnValue([]);
      vi.mocked(extractCheckUrl).mockReturnValue(undefined);

      const request = createMockRequest({
        url: "https://example.com/api/search?taskId=test-task-123",
        method: "GET",
      });

      const response = await GET(request);

      expect(response.status).toBeLessThan(500);
    });
  });

  describe("polling behavior", () => {
    it("returns pending status when task is still processing", async () => {
      vi.mocked(getSearchByImageTask).mockResolvedValue({});
      vi.mocked(extractSearchResults).mockReturnValue([]);
      vi.mocked(extractCheckUrl).mockReturnValue(undefined);

      const request = createMockRequest({
        url: "https://example.com/api/search?taskId=test-task-123",
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.status).toBe("pending");
    });

    it("returns results when task is completed", async () => {
      vi.mocked(getSearchByImageTask).mockResolvedValue({
        tasks: [{ result: [{ items: [] }] }],
      });
      vi.mocked(extractSearchResults).mockReturnValue([
        {
          title: "Test Result",
          pageUrl: "https://example.com/result",
        },
      ]);
      vi.mocked(extractCheckUrl).mockReturnValue("https://dataforseo.com/check/123");

      const request = createMockRequest({
        url: "https://example.com/api/search?taskId=test-task-123",
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ready");
      expect(data.results).toHaveLength(1);
    });

    it("handles polling errors gracefully", async () => {
      vi.mocked(getSearchByImageTask).mockRejectedValue(
        new Error("Polling failed"),
      );

      const request = createMockRequest({
        url: "https://example.com/api/search?taskId=test-task-123",
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe("cache integration", () => {
    it("returns cached result when available", async () => {
      const kv = env.KV_RATE_LIMIT as unknown as MockKVNamespace;

      // Store task mapping and cached result
      await kv.put("task:img:test-task-123", "cache:img:url:test-hash");
      await kv.put(
        "cache:img:url:test-hash",
        JSON.stringify({
          taskId: "test-task-123",
          results: [{ title: "Cached Result", pageUrl: "https://example.com/cached" }],
          checkUrl: "https://dataforseo.com/check/123",
          cachedAt: new Date().toISOString(),
        }),
      );

      const request = createMockRequest({
        url: "https://example.com/api/search?taskId=test-task-123",
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(true);
      expect(data.results[0].title).toBe("Cached Result");
    });
  });

  describe("response headers", () => {
    it("includes request ID in response", async () => {
      vi.mocked(getSearchByImageTask).mockResolvedValue({});
      vi.mocked(extractSearchResults).mockReturnValue([]);
      vi.mocked(extractCheckUrl).mockReturnValue(undefined);

      const request = createMockRequest({
        url: "https://example.com/api/search?taskId=test-task-123",
        method: "GET",
      });

      const response = await GET(request);

      expect(response.headers.get("X-Request-Id")).toBeDefined();
    });
  });
});
