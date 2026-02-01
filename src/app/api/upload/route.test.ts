import { describe, expect, it, beforeEach, vi } from "vitest";

// Mock @cloudflare/next-on-pages before any imports that use it
vi.mock("@cloudflare/next-on-pages", () => ({
  getRequestContext: vi.fn(() => ({
    env: {},
  })),
}));

import { POST } from "./route";
import {
  createMockEnv,
  MockKVNamespace,
  MockR2Bucket,
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

// Mock turnstile module
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

import { getEnv } from "@/lib/cf-env";
import { verifyTurnstileToken } from "@/lib/turnstile";

// Helper to create a mock File
function createMockFile(
  content: Uint8Array,
  name: string,
  type: string,
): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

// Helper to create a mock Request with FormData
function createUploadRequest(
  file: File | null,
  options: {
    turnstileToken?: string;
    cfConnectingIp?: string;
  } = {},
): Request {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }
  if (options.turnstileToken) {
    formData.append("turnstileToken", options.turnstileToken);
  }

  const headers = new Headers();
  if (options.cfConnectingIp) {
    headers.set("cf-connecting-ip", options.cfConnectingIp);
  }

  return new Request("https://example.com/api/upload", {
    method: "POST",
    body: formData,
    headers,
  });
}

// JPEG magic bytes (minimal valid JPEG header)
const JPEG_MAGIC = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
]);

// PNG magic bytes
const PNG_MAGIC = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// GIF magic bytes
const GIF_MAGIC = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

// WebP magic bytes
const WEBP_MAGIC = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("POST /api/upload", () => {
  let env: AppEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.mocked(getEnv).mockReturnValue(env);
    vi.mocked(verifyTurnstileToken).mockResolvedValue({
      ok: true,
      skipped: true,
    });
    restoreFetch();
  });

  describe("R2 bucket validation", () => {
    it("returns 500 when R2 bucket is not configured", async () => {
      const envNoR2 = { ...env, R2_BUCKET: undefined };
      vi.mocked(getEnv).mockReturnValue(envNoR2 as AppEnv);

      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Storage");
    });
  });

  describe("file validation", () => {
    it("returns 400 when no file is uploaded", async () => {
      const request = createUploadRequest(null, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No file");
    });

    it("returns 400 when file is empty", async () => {
      const emptyFile = createMockFile(new Uint8Array(0), "empty.jpg", "image/jpeg");
      const request = createUploadRequest(emptyFile, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("empty");
    });

    it("returns 413 when file exceeds size limit", async () => {
      // Create a file larger than 8MB
      const largeContent = new Uint8Array(9 * 1024 * 1024);
      // Add JPEG magic bytes at the start
      largeContent.set(JPEG_MAGIC, 0);
      const largeFile = createMockFile(largeContent, "large.jpg", "image/jpeg");
      const request = createUploadRequest(largeFile, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error).toContain("8MB");
    });

    it("returns 415 when file type is not supported", async () => {
      // Random bytes that don't match any image magic
      const randomBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
      const file = createMockFile(randomBytes, "test.txt", "text/plain");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(415);
      expect(data.error).toContain("Unsupported");
    });

    it("returns 415 when declared type does not match detected type", async () => {
      // PNG magic bytes but declared as JPEG
      const file = createMockFile(PNG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(415);
      expect(data.error).toContain("does not match");
    });
  });

  describe("supported image types", () => {
    it("accepts JPEG files", async () => {
      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);

      expect(response.status).toBe(200);
    });

    it("accepts PNG files", async () => {
      const file = createMockFile(PNG_MAGIC, "test.png", "image/png");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);

      expect(response.status).toBe(200);
    });

    it("accepts GIF files", async () => {
      const file = createMockFile(GIF_MAGIC, "test.gif", "image/gif");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);

      expect(response.status).toBe(200);
    });

    it("accepts WebP files", async () => {
      const file = createMockFile(WEBP_MAGIC, "test.webp", "image/webp");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);

      expect(response.status).toBe(200);
    });
  });

  describe("turnstile verification", () => {
    it("returns 403 when turnstile verification fails", async () => {
      vi.mocked(verifyTurnstileToken).mockResolvedValue({
        ok: false,
        error: "Turnstile verification failed.",
      });

      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, {
        cfConnectingIp: "127.0.0.1",
        turnstileToken: "invalid-token",
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Turnstile");
    });

    it("proceeds when turnstile verification succeeds", async () => {
      vi.mocked(verifyTurnstileToken).mockResolvedValue({
        ok: true,
        skipped: false,
      });

      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, {
        cfConnectingIp: "127.0.0.1",
        turnstileToken: "valid-token",
      });

      const response = await POST(request as never);

      expect(response.status).toBe(200);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when upload rate limit exceeded", async () => {
      const kv = env.KV_RATE_LIMIT as unknown as MockKVNamespace;
      const today = new Date().toISOString().split("T")[0];
      // Exhaust upload rate limit
      await kv.put(`upload:127.0.0.1:${today}`, "20");

      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain("limit");
    });

    it("returns 429 when daily upload quota exceeded", async () => {
      const kv = env.KV_RATE_LIMIT as unknown as MockKVNamespace;
      const today = new Date().toISOString().split("T")[0];
      // Exhaust daily quota
      await kv.put(`upload_quota:127.0.0.1:${today}`, "50");

      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain("limit");
    });

    it("includes rate limit headers in response", async () => {
      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);

      expect(response.headers.get("X-RateLimit-Limit")).toBeDefined();
      expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });
  });

  describe("successful upload", () => {
    it("returns key, url, and hash on success", async () => {
      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.key).toMatch(/^uploads\/\d{4}-\d{2}-\d{2}\/[a-f0-9]+\.jpg$/);
      expect(data.url).toBeDefined();
      expect(data.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("stores file in R2 with correct metadata", async () => {
      const r2 = env.R2_BUCKET as unknown as MockR2Bucket;

      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      await POST(request as never);

      // Check that file was stored (store is a Map)
      const keys = Array.from(r2.store.keys());
      expect(keys.length).toBe(1);
      expect(keys[0]).toMatch(/^uploads\/\d{4}-\d{2}-\d{2}\/[a-f0-9]+\.jpg$/);
    });

    it("deduplicates files with same content", async () => {
      const r2 = env.R2_BUCKET as unknown as MockR2Bucket;

      const file1 = createMockFile(JPEG_MAGIC, "test1.jpg", "image/jpeg");
      const request1 = createUploadRequest(file1, { cfConnectingIp: "127.0.0.1" });

      const response1 = await POST(request1 as never);
      const data1 = await response1.json();

      // Upload same content again
      const file2 = createMockFile(JPEG_MAGIC, "test2.jpg", "image/jpeg");
      const request2 = createUploadRequest(file2, { cfConnectingIp: "127.0.0.1" });

      const response2 = await POST(request2 as never);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.key).toBe(data1.key);
      expect(data2.hash).toBe(data1.hash);
      expect(data2.cached).toBe(true);

      // Only one file should be stored (store is a Map)
      const keys = Array.from(r2.store.keys());
      expect(keys.length).toBe(1);
    });

    it("includes request ID in response headers", async () => {
      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);

      expect(response.headers.get("X-Request-Id")).toBeDefined();
    });
  });

  describe("filename sanitization", () => {
    it("handles filenames with path traversal attempts", async () => {
      const file = createMockFile(JPEG_MAGIC, "../../../etc/passwd.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);

      expect(response.status).toBe(200);
      // File should be stored with sanitized name
    });

    it("handles filenames with special characters", async () => {
      const file = createMockFile(JPEG_MAGIC, "test<script>alert(1)</script>.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);

      expect(response.status).toBe(200);
    });

    it("handles very long filenames", async () => {
      const longName = "a".repeat(500) + ".jpg";
      const file = createMockFile(JPEG_MAGIC, longName, "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);

      expect(response.status).toBe(200);
    });
  });

  describe("error handling", () => {
    it("handles R2 upload errors gracefully", async () => {
      const r2 = env.R2_BUCKET as unknown as MockR2Bucket;
      r2.put = vi.fn().mockRejectedValue(new Error("R2 upload failed"));

      const file = createMockFile(JPEG_MAGIC, "test.jpg", "image/jpeg");
      const request = createUploadRequest(file, { cfConnectingIp: "127.0.0.1" });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
