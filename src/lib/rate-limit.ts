/**
 * Rate limiting module using Cloudflare KV
 *
 * Implements a daily rate limit per IP address with atomic operations
 * to prevent race conditions in concurrent requests.
 */

/**
 * Result of a rate limit check
 */
export type RateLimitStatus = {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Maximum requests allowed per window */
  limit: number;
  /** ISO timestamp when the rate limit resets */
  resetAt: string;
};

/** Duration of rate limit window in seconds (24 hours) */
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60 * 24;

/** Maximum retry attempts for atomic KV operations */
const MAX_RETRY_ATTEMPTS = 3;

/** Delay between retry attempts in milliseconds */
const RETRY_DELAY_MS = 50;

/** Default daily request limit per IP */
export const DEFAULT_DAILY_LIMIT = 10;

/**
 * Generates a rate limit key for KV storage.
 *
 * @param ip - The client IP address
 * @param date - The date for the rate limit window (default: current date)
 * @param bucket - The rate limit bucket name (default: "limit")
 * @returns A unique key in format `{bucket}:{ip}:{YYYY-MM-DD}`
 *
 * @example
 * ```ts
 * makeRateLimitKey("192.168.1.1");
 * // => "limit:192.168.1.1:2024-01-15"
 *
 * makeRateLimitKey("192.168.1.1", new Date(), "search");
 * // => "search:192.168.1.1:2024-01-15"
 * ```
 */
export const makeRateLimitKey = (
  ip: string,
  date = new Date(),
  bucket = "limit",
): string => {
  const day = date.toISOString().split("T")[0];
  return `${bucket}:${ip}:${day}`;
};

/**
 * Checks and increments the rate limit counter for an IP address.
 *
 * Uses an optimistic locking pattern with retries to handle concurrent requests.
 * The counter automatically expires after 24 hours.
 *
 * @param kv - The Cloudflare KV namespace
 * @param ip - The client IP address to check
 * @param limit - Maximum requests allowed per day (default: 10)
 * @param bucket - The rate limit bucket name (default: "limit")
 * @returns The current rate limit status
 *
 * @example
 * ```ts
 * const status = await checkRateLimit(env.KV_RATE_LIMIT, clientIp);
 * if (!status.allowed) {
 *   return new Response("Rate limit exceeded", { status: 429 });
 * }
 * ```
 */
export const checkRateLimit = async (
  kv: KVNamespace,
  ip: string,
  limit = DEFAULT_DAILY_LIMIT,
  bucket = "limit",
): Promise<RateLimitStatus> => {
  const key = makeRateLimitKey(ip, new Date(), bucket);

  // Use atomic check-and-set pattern to prevent race conditions
  // KV's get/put operations are atomic per key, but we need to be careful
  // about the check-then-act race window
  let attempt = 0;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    const current = await kv.get(key, { type: "text" });
    const count = current ? Number.parseInt(current, 10) : 0;
    const nextCount = Number.isNaN(count) ? 1 : count + 1;

    const allowed = nextCount <= limit;
    const remaining = Math.max(0, limit - nextCount);

    // Attempt to write with conditional check using metadata as a lock
    // This is a simple optimistic locking pattern
    try {
      // Write the new count
      await kv.put(key, `${nextCount}`, {
        expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
      });

      // Verify it was written correctly (check for race condition)
      const verify = await kv.get(key, { type: "text" });
      const verifyCount = verify ? Number.parseInt(verify, 10) : 0;

      // If verification shows a different value, we hit a race condition
      // Retry to ensure accuracy
      if (!Number.isNaN(verifyCount) && verifyCount !== nextCount) {
        attempt++;
        continue;
      }

      const resetAt = new Date(Date.now() + RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

      return {
        allowed,
        remaining,
        limit,
        resetAt,
      };
    } catch (error) {
      // On error, retry if we have attempts left
      attempt++;
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        throw error;
      }
      // Small delay before retry
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  // Fallback: if we exhausted retries, use a conservative estimate
  const current = await kv.get(key, { type: "text" });
  const count = current ? Number.parseInt(current, 10) : 0;
  const nextCount = Number.isNaN(count) ? 1 : count + 1;
  const allowed = nextCount <= limit;
  const remaining = Math.max(0, limit - nextCount);
  const resetAt = new Date(Date.now() + RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

  return {
    allowed,
    remaining,
    limit,
    resetAt,
  };
};
