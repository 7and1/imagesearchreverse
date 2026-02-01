import { vi } from "vitest";
import type { AppEnv } from "@/lib/cf-env";

/**
 * Mock Cloudflare KV Namespace
 */
export class MockKVNamespace {
  private store = new Map<
    string,
    { value: string | ArrayBuffer; metadata?: unknown; expiration?: number }
  >();

  async get(
    key: string,
    options?: Partial<KVNamespaceGetOptions<"text">>,
  ): Promise<string | null>;
  async get(key: string, options: { type: "text" }): Promise<string | null>;
  async get(key: string, options: { type: "json" }): Promise<unknown>;
  async get(
    key: string,
    options: { type: "arrayBuffer" },
  ): Promise<ArrayBuffer | null>;
  async get(
    key: string,
    options: { type: "stream" },
  ): Promise<ReadableStream | null>;
  async get<ExpectedValue = unknown>(
    key: string,
    options?: { type?: "json" },
  ): Promise<ExpectedValue | null>;
  async get(
    key: string,
    options?:
      | Partial<KVNamespaceGetOptions<"text">>
      | { type: "text" }
      | { type: "json" }
      | { type: "arrayBuffer" }
      | { type: "stream" }
      | undefined,
  ): Promise<string | ArrayBuffer | ReadableStream | unknown | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check expiration
    if (entry.expiration && entry.expiration < Date.now()) {
      this.store.delete(key);
      return null;
    }

    const type = options && "type" in options ? options.type : undefined;

    if (type === "json") {
      try {
        return JSON.parse(entry.value as string);
      } catch {
        return null;
      }
    }

    if (type === "arrayBuffer") {
      return entry.value instanceof ArrayBuffer
        ? entry.value
        : new TextEncoder().encode(entry.value as string).buffer;
    }

    if (type === "stream") {
      const value =
        entry.value instanceof ArrayBuffer
          ? new Uint8Array(entry.value)
          : new TextEncoder().encode(entry.value as string);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(value);
          controller.close();
        },
      });
    }

    // Default: return as text
    return entry.value instanceof ArrayBuffer
      ? new TextDecoder().decode(entry.value)
      : entry.value;
  }

  async put(
    key: string,
    value: string | ReadableStream | ArrayBuffer,
    options?: { expirationTtl?: number; metadata?: unknown },
  ): Promise<void> {
    let stringValue: string;
    if (value instanceof ArrayBuffer) {
      stringValue = new TextDecoder().decode(value);
    } else if (value instanceof ReadableStream) {
      const reader = value.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        chunks.push(chunk);
      }
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const data = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }
      stringValue = new TextDecoder().decode(data);
    } else {
      stringValue = value;
    }

    const expiration = options?.expirationTtl
      ? Date.now() + options.expirationTtl * 1000
      : undefined;
    this.store.set(key, {
      value: stringValue,
      metadata: options?.metadata,
      expiration,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor: string;
  }> {
    return {
      keys: Array.from(this.store.keys()).map((name) => ({ name })),
      list_complete: true,
      cursor: "",
    };
  }

  getWithMetadata(): never {
    throw new Error("Method not implemented.");
  }
}

/**
 * Mock Cloudflare R2 Bucket
 */
export class MockR2Bucket {
  // Public store for test assertions
  public store = new Map<string, Uint8Array>();
  private metadataStore = new Map<
    string,
    { httpMetadata?: unknown; customMetadata?: unknown }
  >();

  async put(
    key: string,
    value: R2Object | ReadableStream | ArrayBuffer | string,
    options?: R2PutOptions,
  ): Promise<R2Object> {
    let data: Uint8Array;
    if (value instanceof ArrayBuffer) {
      data = new Uint8Array(value);
    } else if (typeof value === "string") {
      data = new TextEncoder().encode(value);
    } else if (value instanceof ReadableStream) {
      const reader = value.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        chunks.push(chunk);
      }
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      data = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }
    } else {
      // R2Object case - shouldn't happen in tests but handle gracefully
      data = new Uint8Array(0);
    }

    this.store.set(key, data);
    if (options) {
      this.metadataStore.set(key, {
        httpMetadata: options.httpMetadata,
        customMetadata: options.customMetadata,
      });
    }

    return {
      key,
      size: data.length,
      uploaded: new Date(),
      version: "test-version",
      httpEtag: "test-etag",
      etag: "test-etag",
      checksums: { md5: "test-md5" },
      storageClass: "STANDARD",
    } as unknown as R2Object;
  }

  async head(key: string): Promise<R2Object | null> {
    const data = this.store.get(key);
    if (!data) return null;
    const metadata = this.metadataStore.get(key);

    return {
      key,
      size: data.length,
      uploaded: new Date(),
      version: "test-version",
      httpEtag: "test-etag",
      etag: "test-etag",
      checksums: { md5: "test-md5" },
      storageClass: "STANDARD",
      httpMetadata: metadata?.httpMetadata as R2HTTPMetadata,
      customMetadata: metadata?.customMetadata as Record<string, string>,
      writeHttpMetadata: () => {},
    } as unknown as R2Object;
  }

  async get(key: string): Promise<R2Object | null> {
    const data = this.store.get(key);
    if (!data) return null;
    const metadata = this.metadataStore.get(key);

    return {
      key,
      size: data.length,
      uploaded: new Date(),
      version: "test-version",
      httpEtag: "test-etag",
      etag: "test-etag",
      checksums: { md5: "test-md5" },
      storageClass: "STANDARD",
      httpMetadata: metadata?.httpMetadata as R2HTTPMetadata,
      customMetadata: metadata?.customMetadata as Record<string, string>,
      writeHttpMetadata: () => {},
    } as unknown as R2Object;
  }

  async delete(keys: string[] | string[]): Promise<void> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keyArray) {
      this.store.delete(key);
      this.metadataStore.delete(key);
    }
  }

  async list(): Promise<{
    objects: Array<{ key: string; size: number }>;
    truncated: boolean;
  }> {
    return {
      objects: Array.from(this.store.entries()).map(([key, data]) => ({
        key,
        size: data.length,
      })),
      truncated: false,
    };
  }

  createMultipartUpload(): never {
    throw new Error("Method not implemented.");
  }

  resumeMultipartUpload(): never {
    throw new Error("Method not implemented.");
  }
}

/**
 * Create mock environment variables
 */
export const createMockEnv = (): AppEnv => ({
  // Node env
  NODE_ENV: "test",

  // DataForSEO credentials
  DFS_LOGIN: "test_login",
  DFS_PASSWORD: "test_password",
  DFS_ENDPOINT_POST:
    "https://test.api.dataforseo.com/v3/serp/google/images/task_post",
  DFS_ENDPOINT_GET:
    "https://test.api.dataforseo.com/v3/serp/google/images/task_get",

  // Turnstile
  TURNSTILE_SECRET_KEY: "test_secret_key",

  // Cloudflare bindings
  KV_RATE_LIMIT: new MockKVNamespace() as unknown as KVNamespace,
  R2_BUCKET: new MockR2Bucket() as unknown as R2Bucket,
});

/**
 * Create a mock NextRequest
 * Returns a Request with nextUrl property for Next.js compatibility
 */
export const createMockRequest = (
  options: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    cfConnectingIp?: string;
    xForwardedFor?: string;
  } = {},
): Request & { nextUrl: URL } => {
  const {
    url = "https://example.com",
    method = "GET",
    headers = {},
    body,
  } = options;

  const init: RequestInit = {
    method,
    headers: {
      ...headers,
      ...(options.cfConnectingIp && {
        "cf-connecting-ip": options.cfConnectingIp,
      }),
      ...(options.xForwardedFor && {
        "x-forwarded-for": options.xForwardedFor,
      }),
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  const request = new Request(url, init);

  // Add nextUrl property for Next.js NextRequest compatibility
  const nextUrl = new URL(url);
  Object.defineProperty(request, "nextUrl", {
    value: nextUrl,
    writable: false,
  });

  return request as Request & { nextUrl: URL };
};

/**
 * Wait for async operations in tests
 */
export const waitFor = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock fetch globally for testing
 */
export const mockFetch = (
  response: object | string,
  options: { status?: number; ok?: boolean; delay?: number } = {},
) => {
  const execute = async () => {
    if (options.delay) {
      await waitFor(options.delay);
    }
    return new Response(JSON.stringify(response), {
      status: options.status ?? 200,
      statusText: options.ok === false ? "Error" : "OK",
    });
  };

  vi.stubGlobal("fetch", vi.fn().mockImplementation(execute));
};

/**
 * Restore fetch mock
 */
export const restoreFetch = () => {
  vi.unstubAllGlobals();
};

/**
 * Generate test image buffers
 */
export const generateTestImage = (
  type: "png" | "jpeg" | "gif" | "webp" | "invalid",
): Uint8Array => {
  const signatures = {
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    jpeg: [0xff, 0xd8, 0xff],
    gif: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    webp: [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ],
    invalid: [0x00, 0x00, 0x00],
  };

  const signature = signatures[type];
  const buffer = new Uint8Array(signature.length + 100);
  buffer.set(signature, 0);
  // Fill rest with random data
  for (let i = signature.length; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
};

/**
 * Generate test hash
 */
export const generateTestHash = (): string => {
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
};
