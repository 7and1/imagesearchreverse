import { describe, expect, it, vi } from "vitest";
import { RequestDeduplicator } from "@/lib/request-deduplication";

describe("RequestDeduplicator", () => {
  it("deduplicates concurrent requests", async () => {
    const deduplicator = new RequestDeduplicator();
    let executionCount = 0;

    const mockFn = vi.fn(async () => {
      executionCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { taskId: "test", results: [], status: "ready" as const };
    });

    // Execute multiple concurrent requests
    const promises = [
      deduplicator.execute("test-key", mockFn),
      deduplicator.execute("test-key", mockFn),
      deduplicator.execute("test-key", mockFn),
    ];

    await Promise.all(promises);

    // Should only execute once due to deduplication
    expect(executionCount).toBe(1);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("handles failed requests correctly", async () => {
    const deduplicator = new RequestDeduplicator();
    let attemptCount = 0;

    const mockFn = vi.fn(async () => {
      attemptCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (attemptCount < 2) {
        throw new Error("Temporary failure");
      }
      return { taskId: "test", results: [], status: "ready" as const };
    });

    // First attempt should fail
    await expect(deduplicator.execute("test-key", mockFn)).rejects.toThrow();

    // Should be able to retry immediately after failure
    const result = await deduplicator.execute("test-key", mockFn);
    expect(result).toBeDefined();
    expect(attemptCount).toBe(2);
  });

  it("clears failed requests immediately", async () => {
    const deduplicator = new RequestDeduplicator();

    const mockFn = vi.fn(async () => {
      throw new Error("Failure");
    });

    // First request fails
    await expect(deduplicator.execute("test-key", mockFn)).rejects.toThrow();

    // Pending should be cleared immediately
    expect(deduplicator.isPending("test-key")).toBe(false);

    // Should be able to retry
    await expect(deduplicator.execute("test-key", mockFn)).rejects.toThrow();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("applies cooldown period after successful requests", async () => {
    const deduplicator = new RequestDeduplicator(100, 1000); // 100ms cooldown

    const mockFn = vi.fn(async () => {
      return { taskId: "test", results: [], status: "ready" as const };
    });

    // First successful request
    await deduplicator.execute("test-key", mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Immediate retry should use cached result
    await deduplicator.execute("test-key", mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Wait for cooldown to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // After cooldown, should execute again
    await deduplicator.execute("test-key", mockFn);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("handles different keys independently", async () => {
    const deduplicator = new RequestDeduplicator();

    const mockFn = vi.fn(async (key: string) => {
      return { taskId: key, results: [], status: "ready" as const };
    });

    await Promise.all([
      deduplicator.execute("key1", () => mockFn("key1")),
      deduplicator.execute("key2", () => mockFn("key2")),
      deduplicator.execute("key3", () => mockFn("key3")),
    ]);

    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it("cleans up expired requests", async () => {
    const deduplicator = new RequestDeduplicator(10, 50); // Short expiry for testing

    const mockFn = vi.fn(async () => {
      return { taskId: "test", results: [], status: "ready" as const };
    });

    await deduplicator.execute("test-key", mockFn);

    // Should be in cooldown initially
    expect(deduplicator.getPendingCount()).toBeGreaterThan(0);

    // Wait for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should be cleaned up
    expect(deduplicator.getPendingCount()).toBe(0);
  });

  it("prevents race conditions with exponential backoff", async () => {
    const deduplicator = new RequestDeduplicator();

    let executionCount = 0;
    const mockFn = vi.fn(async () => {
      executionCount++;
      // Simulate variable delay
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
      return { taskId: "test", results: [], status: "ready" as const };
    });

    // Execute many concurrent requests
    const promises = Array.from({ length: 20 }, () =>
      deduplicator.execute("race-key", mockFn)
    );

    await Promise.all(promises);

    // All should deduplicate to a single execution
    expect(executionCount).toBe(1);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
