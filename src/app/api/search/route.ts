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

export const runtime = "edge";

const TaskQuerySchema = z.object({
  taskId: z.string().min(1),
});
const CACHE_TTL_SECONDS = 60 * 60 * 48;
const TASK_TTL_SECONDS = 60 * 60;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const env = getEnv();
    const { imageUrl, imageHash, turnstileToken } =
      await parseImageSearchInput(request);
    const ip = getClientIp(request);

    const turnstile = await verifyTurnstileToken(
      env,
      turnstileToken ?? null,
      ip,
    );

    if (!turnstile.ok) {
      const response = NextResponse.json(
        { error: turnstile.error ?? "Turnstile verification failed." },
        { status: 403 },
      );
      response.headers.set("X-Request-Id", requestId);
      return response;
    }

    const headers = new Headers();
    if (env.KV_RATE_LIMIT) {
      const rate = await checkRateLimit(env.KV_RATE_LIMIT, ip, 10);

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
        return response;
      }

      headers.set("X-RateLimit-Limit", String(rate.limit));
      headers.set("X-RateLimit-Remaining", String(rate.remaining));
      headers.set("X-RateLimit-Reset", rate.resetAt);
    }

    const cacheStore = env.KV_RATE_LIMIT;
    let cacheKey: string | null = null;

    if (cacheStore) {
      cacheKey = await buildCacheKey(imageUrl, imageHash);
      const cached = await getCachedResult(cacheStore, cacheKey);
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
        console.info("search:cache-hit", {
          requestId,
          durationMs: Date.now() - startedAt,
        });
        return response;
      }
    }

    const lookupStart = Date.now();
    const result = await resolveSearchResults(env, imageUrl);

    if (cacheStore && cacheKey) {
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
    }

    const response = NextResponse.json(result, {
      status: result.status === "pending" ? 202 : 200,
      headers,
    });
    response.headers.set("X-Request-Id", requestId);
    console.info("search:success", {
      requestId,
      status: result.status,
      results: result.results.length,
      durationMs: Date.now() - startedAt,
      dataforseoMs: Date.now() - lookupStart,
    });
    return response;
  } catch (error) {
    console.error("search:failed", { requestId, error });
    const response = NextResponse.json(
      { error: "Search failed." },
      { status: 500 },
    );
    response.headers.set("X-Request-Id", requestId);
    return response;
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
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
      return response;
    }

    const cacheStore = env.KV_RATE_LIMIT;
    let cacheKey: string | null = null;

    if (cacheStore) {
      cacheKey = await getCacheKeyForTask(cacheStore, parsed.data.taskId);
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
          console.info("search:cache-hit", {
            requestId,
            durationMs: Date.now() - startedAt,
          });
          return response;
        }
      }
    }

    const data = await getSearchByImageTask(env, parsed.data.taskId);
    const results = extractSearchResults(data);

    const status = results.length > 0 ? "ready" : "pending";

    if (cacheStore && cacheKey && results.length > 0) {
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
    console.info("search:poll", {
      requestId,
      status,
      results: results.length,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    console.error("search:failed", { requestId, error });
    const response = NextResponse.json(
      { error: "Search failed." },
      { status: 500 },
    );
    response.headers.set("X-Request-Id", requestId);
    return response;
  }
}
