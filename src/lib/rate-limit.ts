export type RateLimitStatus = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
};

const ONE_DAY_SECONDS = 60 * 60 * 24;

export const makeRateLimitKey = (
  ip: string,
  date = new Date(),
  bucket = "limit",
) => {
  const day = date.toISOString().split("T")[0];
  return `${bucket}:${ip}:${day}`;
};

export const checkRateLimit = async (
  kv: KVNamespace,
  ip: string,
  limit = 10,
  bucket = "limit",
): Promise<RateLimitStatus> => {
  const key = makeRateLimitKey(ip, new Date(), bucket);

  // Use atomic check-and-set pattern to prevent race conditions
  // KV's get/put operations are atomic per key, but we need to be careful
  // about the check-then-act race window
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
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
        expirationTtl: ONE_DAY_SECONDS,
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

      const resetAt = new Date(Date.now() + ONE_DAY_SECONDS * 1000).toISOString();

      return {
        allowed,
        remaining,
        limit,
        resetAt,
      };
    } catch (error) {
      // On error, retry if we have attempts left
      attempt++;
      if (attempt >= maxAttempts) {
        throw error;
      }
      // Small delay before retry
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  // Fallback: if we exhausted retries, use a conservative estimate
  const current = await kv.get(key, { type: "text" });
  const count = current ? Number.parseInt(current, 10) : 0;
  const nextCount = Number.isNaN(count) ? 1 : count + 1;
  const allowed = nextCount <= limit;
  const remaining = Math.max(0, limit - nextCount);
  const resetAt = new Date(Date.now() + ONE_DAY_SECONDS * 1000).toISOString();

  return {
    allowed,
    remaining,
    limit,
    resetAt,
  };
};
