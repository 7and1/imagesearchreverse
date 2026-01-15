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
  const current = await kv.get(key, { type: "text" });
  const count = current ? Number.parseInt(current, 10) : 0;
  const nextCount = Number.isNaN(count) ? 1 : count + 1;

  const allowed = nextCount <= limit;
  const remaining = Math.max(0, limit - nextCount);

  await kv.put(key, `${nextCount}`, {
    expirationTtl: ONE_DAY_SECONDS,
  });

  const resetAt = new Date(Date.now() + ONE_DAY_SECONDS * 1000).toISOString();

  return {
    allowed,
    remaining,
    limit,
    resetAt,
  };
};
