import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/cf-env";
import { getClientIp } from "@/lib/request";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildCacheKey,
  getCacheKeyForTask,
  getCachedResult,
  storeCachedResult,
  storeTaskMapping,
} from "@/lib/search-cache";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  extractCheckUrl,
  extractSearchResults,
  getSearchByImageTask,
  parseImageSearchInput,
  resolveSearchResults,
} from "@/lib/dataforseo";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { isAppError, errorToResponse } from "@/lib/errors";
import { deduplicatedRequest } from "@/lib/request-deduplication";

export const runtime = "edge";

const logger = createLogger("api:search");

const TaskQuerySchema = z.object({
  taskId: z.string().min(1),
});

const CACHE_TTL_SECONDS = 60 * 60 * 48;
const TASK_TTL_SECONDS = 60 * 60;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const timing = logger.startTiming("POST /api/search");

  try {
    const env = getEnv();
    const { imageUrl, imageHash, turnstileToken } =
      await parseImageSearchInput(request);
    const ip = getClientIp(request);

    logger.debug("Parsed search input", {
      requestId,
      imageUrl: imageUrl.replace(/\/\/([^@]+)@/, "//***@"),
      hasImageHash: !!imageHash,
    });

    const turnstileStart = Date.now();
    const turnstile = await verifyTurnstileToken(
      env,
      turnstileToken ?? null,
      ip,
    );
    timing.addMetric("turnstile", turnstileStart);

    if (!turnstile.ok) {
      const response = NextResponse.json(
        { error: turnstile.error ?? "Turnstile verification failed." },
        { status: 403 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 403, reason: "turnstile_failed" });
      return response;
    }

    const headers = new Headers();
    const rateLimitStart = Date.now();

    if (env.KV_RATE_LIMIT) {
      const rate = await checkRateLimit(env.KV_RATE_LIMIT, ip, 10);
      timing.addMetric("rateLimit", rateLimitStart);

      if (!rate.allowed) {
        const response = NextResponse.json(
          {
            error: "Daily limit reached. Please try again tomorrow.",
            resetAt: rate.resetAt,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(rate.limit),
              "X-RateLimit-Remaining": String(rate.remaining),
              "X-RateLimit-Reset": rate.resetAt,
            },
          },
        );
        response.headers.set("X-Request-Id", requestId);
        timing.end({ requestId, status: 429, reason: "rate_limited" });
        return response;
      }

      headers.set("X-RateLimit-Limit", String(rate.limit));
      headers.set("X-RateLimit-Remaining", String(rate.remaining));
      headers.set("X-RateLimit-Reset", rate.resetAt);
    } else {
      timing.addMetric("rateLimit", rateLimitStart);
    }

    const cacheStore = env.KV_RATE_LIMIT;
    let cacheKey: string | null = null;
    const cacheStart = Date.now();

    if (cacheStore) {
      cacheKey = await buildCacheKey(imageUrl, imageHash);
      const cached = await getCachedResult(cacheStore, cacheKey);
      timing.addMetric("cacheRead", cacheStart);

      if (cached) {
        const response = NextResponse.json(
          {
            ...cached,
            status: "ready",
            cached: true,
          },
          { status: 200, headers },
        );
        response.headers.set("X-Request-Id", requestId);
        timing.end({
          requestId,
          status: 200,
          cached: true,
          results: cached.results.length,
        });
        return response;
      }
    } else {
      timing.addMetric("cacheRead", cacheStart);
    }

    const searchKey = cacheKey ?? imageUrl;
    const result = await deduplicatedRequest(searchKey, async () => {
      const dataforseoStart = Date.now();
      const results = await resolveSearchResults(env, imageUrl);
      timing.addMetric("dataforseo", dataforseoStart);
      return results;
    });

    if (cacheStore && cacheKey) {
      const cacheWriteStart = Date.now();

      if (result.taskId) {
        await storeTaskMapping(
          cacheStore,
          result.taskId,
          cacheKey,
          TASK_TTL_SECONDS,
        );
      }

      if (result.status === "ready" && result.results.length > 0) {
        await storeCachedResult(
          cacheStore,
          cacheKey,
          {
            taskId: result.taskId,
            results: result.results,
            checkUrl: result.checkUrl,
            cachedAt: new Date().toISOString(),
          },
          CACHE_TTL_SECONDS,
        );
      }

      timing.addMetric("cacheWrite", cacheWriteStart);
    }

    const response = NextResponse.json(result, {
      status: result.status === "pending" ? 202 : 200,
      headers,
    });
    response.headers.set("X-Request-Id", requestId);
    timing.end({
      requestId,
      status: result.status,
      results: result.results.length,
      deduplicated: true,
    });
    return response;
  } catch (error) {
    timing.endWithError(error, { requestId });
    logger.error("Search request failed", error, { requestId });

    const statusCode = isAppError(error) ? error.statusCode : 500;
    const errorResponse = errorToResponse(error);

    const response = NextResponse.json(errorResponse, { status: statusCode });
    response.headers.set("X-Request-Id", requestId);
    return response;
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const timing = logger.startTiming("GET /api/search");

  try {
    const env = getEnv();
    const taskId = request.nextUrl.searchParams.get("taskId");
    const parsed = TaskQuerySchema.safeParse({ taskId });

    if (!parsed.success) {
      const response = NextResponse.json(
        { error: "Missing taskId." },
        { status: 400 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 400, reason: "missing_taskId" });
      return response;
    }

    logger.debug("Polling task", { requestId, taskId: parsed.data.taskId });

    const cacheStore = env.KV_RATE_LIMIT;
    let cacheKey: string | null = null;
    const cacheStart = Date.now();

    if (cacheStore) {
      cacheKey = await getCacheKeyForTask(cacheStore, parsed.data.taskId);
      timing.addMetric("cacheRead", cacheStart);

      if (cacheKey) {
        const cached = await getCachedResult(cacheStore, cacheKey);
        if (cached) {
          const response = NextResponse.json(
            {
              taskId: parsed.data.taskId,
              status: "ready",
              results: cached.results,
              checkUrl: cached.checkUrl,
              cached: true,
            },
            { status: 200 },
          );
          response.headers.set("X-Request-Id", requestId);
          timing.end({
            requestId,
            status: 200,
            cached: true,
            results: cached.results.length,
          });
          return response;
        }
      }
    } else {
      timing.addMetric("cacheRead", cacheStart);
    }

    const dataforseoStart = Date.now();
    const data = await getSearchByImageTask(env, parsed.data.taskId);
    const results = extractSearchResults(data);
    timing.addMetric("dataforseo", dataforseoStart);

    const status = results.length > 0 ? "ready" : "pending";

    if (cacheStore && cacheKey && results.length > 0) {
      const cacheWriteStart = Date.now();
      await storeCachedResult(
        cacheStore,
        cacheKey,
        {
          taskId: parsed.data.taskId,
          results,
          checkUrl: extractCheckUrl(data),
          cachedAt: new Date().toISOString(),
        },
        CACHE_TTL_SECONDS,
      );
      timing.addMetric("cacheWrite", cacheWriteStart);
    }

    const response = NextResponse.json(
      {
        taskId: parsed.data.taskId,
        status,
        results,
        checkUrl: extractCheckUrl(data),
      },
      { status: status === "ready" ? 200 : 202 },
    );
    response.headers.set("X-Request-Id", requestId);
    timing.end({
      requestId,
      status,
      results: results.length,
      cached: false,
    });
    return response;
  } catch (error) {
    timing.endWithError(error, { requestId });
    logger.error("Search poll failed", error, { requestId });

    const statusCode = isAppError(error) ? error.statusCode : 500;
    const errorResponse = errorToResponse(error);

    const response = NextResponse.json(errorResponse, { status: statusCode });
    response.headers.set("X-Request-Id", requestId);
    return response;
  }
}
