/**
 * Request deduplication module
 * Prevents duplicate searches for the same image in quick succession
 * Uses in-flight request tracking and pending promises
 */

import type { SearchResult } from "./dataforseo";

type PendingRequest = {
  promise: Promise<SearchResults>;
  timestamp: number;
  failed: boolean;
};

type SearchResults = {
  taskId: string;
  results: SearchResult[];
  checkUrl?: string;
  status: "ready" | "pending";
};

/**
 * Request deduplication manager
 * Tracks in-flight requests to prevent duplicate API calls
 */
export class RequestDeduplicator {
  private pending = new Map<string, PendingRequest>();
  private readonly requestCooldownMs: number;
  private readonly maxPendingAgeMs: number;

  /**
   * @param requestCooldownMs - Minimum time between duplicate requests (default: 2000ms)
   * @param maxPendingAgeMs - Maximum age to keep pending requests (default: 30000ms)
   */
  constructor(requestCooldownMs = 2000, maxPendingAgeMs = 30000) {
    this.requestCooldownMs = requestCooldownMs;
    this.maxPendingAgeMs = maxPendingAgeMs;

    // Clean up expired pending requests periodically
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), this.maxPendingAgeMs);
    }
  }

  /**
   * Execute a request with deduplication
   * If a similar request is in progress, return its promise instead of creating a new one
   *
   * Error handling:
   * - Failed requests are immediately removed from pending (no cooldown)
   * - Successful requests get a cooldown period
   * - This allows quick retries on transient failures
   */
  async execute<T = SearchResults>(
    key: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const now = Date.now();

    // Check if there's a pending request for the same key
    const pending = this.pending.get(key);
    if (pending) {
      const age = now - pending.timestamp;

      // If the pending request is still fresh, reuse it
      // But don't reuse failed requests - they should be cleared immediately
      if (age < this.maxPendingAgeMs && !pending.failed) {
        return pending.promise as Promise<T>;
      }

      // Otherwise, clean up the stale or failed entry
      this.pending.delete(key);
    }

    // Create a new request
    const promise = fn();
    this.pending.set(key, {
      promise: promise as Promise<SearchResults>,
      timestamp: now,
      failed: false,
    });

    try {
      const result = await promise;
      // Mark as successful, keep for cooldown period
      setTimeout(() => {
        this.pending.delete(key);
      }, this.requestCooldownMs);
      return result;
    } catch (error) {
      // Mark as failed and remove immediately to allow retry
      const entry = this.pending.get(key);
      if (entry) {
        entry.failed = true;
      }
      // Remove immediately (no cooldown on errors)
      this.pending.delete(key);
      throw error;
    }
  }

  /**
   * Check if a request is currently pending for the given key
   */
  isPending(key: string): boolean {
    const pending = this.pending.get(key);
    if (!pending) return false;

    const age = Date.now() - pending.timestamp;
    return age < this.maxPendingAgeMs;
  }

  /**
   * Get the number of currently pending requests
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Clean up expired pending requests
   * Failed requests are cleaned up more aggressively
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.pending.entries()) {
      const age = now - value.timestamp;

      // Clean up failed requests immediately (they should be removed already, but just in case)
      if (value.failed) {
        expiredKeys.push(key);
        continue;
      }

      // Clean up old successful requests
      if (age > this.maxPendingAgeMs) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.pending.delete(key);
    }
  }

  /**
   * Clear all pending requests (useful for testing)
   */
  clear(): void {
    this.pending.clear();
  }
}

/**
 * Global singleton instance for request deduplication
 */
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Execute a request with automatic deduplication
 * Uses the global singleton instance
 */
export const deduplicatedRequest = async <T = SearchResults>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> => {
  return requestDeduplicator.execute(key, fn);
};
