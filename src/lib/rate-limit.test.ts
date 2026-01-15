import { describe, expect, it } from "vitest";
import { checkRateLimit, makeRateLimitKey } from "@/lib/rate-limit";

class MemoryKV implements KVNamespace {
  private store = new Map<string, string>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string) {
    this.store.set(key, value);
  }

  async delete(key: string) {
    this.store.delete(key);
  }

  async list() {
    return { keys: [], list_complete: true, cursor: "" };
  }
}

describe("rate limiting", () => {
  it("builds deterministic keys", () => {
    const key = makeRateLimitKey("127.0.0.1", new Date("2026-01-14T10:00:00Z"));
    expect(key).toBe("limit:127.0.0.1:2026-01-14");
  });

  it("supports bucketed keys", () => {
    const key = makeRateLimitKey(
      "127.0.0.1",
      new Date("2026-01-14T10:00:00Z"),
      "upload",
    );
    expect(key).toBe("upload:127.0.0.1:2026-01-14");
  });

  it("enforces limits", async () => {
    const kv = new MemoryKV();

    const first = await checkRateLimit(kv, "ip", 2);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await checkRateLimit(kv, "ip", 2);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const third = await checkRateLimit(kv, "ip", 2);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });
});
