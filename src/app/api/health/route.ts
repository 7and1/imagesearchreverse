import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/cf-env";
import { createRequestLogger, formatTraceParent } from "@/lib/logger";
import { recordHealthCheck } from "@/lib/metrics";
import { dataForSEOCircuitBreaker } from "@/lib/circuit-breaker";

export const runtime = "edge";

// Track application start time for uptime calculation
const APP_START_TIME = Date.now();

// Build information (populated at build time or from env)
const BUILD_INFO = {
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
  commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.CF_PAGES_COMMIT_SHA ?? "unknown",
  buildTime: process.env.BUILD_TIME ?? new Date().toISOString(),
  environment: process.env.NODE_ENV ?? "development",
};

interface HealthCheck {
  name: string;
  healthy: boolean;
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

async function checkKVHealth(env: ReturnType<typeof getEnv>): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!env.KV_RATE_LIMIT) {
      return { name: "kv", healthy: false, error: "KV binding not configured" };
    }
    // Try a simple operation
    const testKey = `health:${Date.now()}`;
    await env.KV_RATE_LIMIT.put(testKey, "ok", { expirationTtl: 60 });
    await env.KV_RATE_LIMIT.delete(testKey);
    return { name: "kv", healthy: true, latency: Date.now() - start };
  } catch (error) {
    return {
      name: "kv",
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkR2Health(env: ReturnType<typeof getEnv>): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!env.R2_BUCKET) {
      return { name: "r2", healthy: false, error: "R2 binding not configured" };
    }
    // Try to list objects (limited to 1)
    await env.R2_BUCKET.list({ limit: 1 });
    return { name: "r2", healthy: true, latency: Date.now() - start };
  } catch (error) {
    return {
      name: "r2",
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkDataForSEOHealth(env: ReturnType<typeof getEnv>): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const login = env.DFS_LOGIN;
    const password = env.DFS_PASSWORD;

    if (!login || !password) {
      return {
        name: "dataforseo",
        healthy: false,
        error: "Missing DataForSEO credentials",
      };
    }

    // Check circuit breaker state first
    const cbMetrics = dataForSEOCircuitBreaker.getMetrics();
    if (cbMetrics.state === "open") {
      return {
        name: "dataforseo",
        healthy: false,
        latency: Date.now() - start,
        error: "Circuit breaker is open",
        details: {
          circuitState: cbMetrics.state,
          failureCount: cbMetrics.failureCount,
          totalCalls: cbMetrics.totalCalls,
        },
      };
    }

    // Use the appendix/user_data endpoint which returns account info
    // This is a lightweight authenticated endpoint that confirms credentials work
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(`${login}:${password}`)}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for successful response (2xx status)
      if (response.ok) {
        return {
          name: "dataforseo",
          healthy: true,
          latency: Date.now() - start,
          details: {
            circuitState: cbMetrics.state,
            totalCalls: cbMetrics.totalCalls,
          },
        };
      }

      // 401/403 means credentials are invalid
      if (response.status === 401 || response.status === 403) {
        return {
          name: "dataforseo",
          healthy: false,
          latency: Date.now() - start,
          error: "Invalid DataForSEO credentials",
        };
      }

      // Other errors (5xx, etc.) indicate service issues
      return {
        name: "dataforseo",
        healthy: false,
        latency: Date.now() - start,
        error: `DataForSEO returned status ${response.status}`,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return {
          name: "dataforseo",
          healthy: false,
          latency: Date.now() - start,
          error: "DataForSEO health check timed out",
        };
      }
      throw fetchError;
    }
  } catch (error) {
    return {
      name: "dataforseo",
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const traceParent = request.headers.get("traceparent");
  const logger = createRequestLogger("api:health", requestId, traceParent);
  const start = Date.now();

  // Check if detailed health check is requested
  const detailed = request.nextUrl.searchParams.get("detailed") === "true";

  try {
    const env = getEnv();

    // Run health checks in parallel
    const [kv, r2, dataforseo] = await Promise.all([
      checkKVHealth(env),
      checkR2Health(env),
      checkDataForSEOHealth(env),
    ]);

    // Record metrics for each service
    recordHealthCheck("kv", kv.healthy, kv.latency ?? 0);
    recordHealthCheck("r2", r2.healthy, r2.latency ?? 0);
    recordHealthCheck("dataforseo", dataforseo.healthy, dataforseo.latency ?? 0);

    const checks = { kv, r2, dataforseo };
    const healthy = kv.healthy && r2.healthy && dataforseo.healthy;
    const degraded = !healthy && (kv.healthy || r2.healthy || dataforseo.healthy);

    // Calculate uptime
    const uptimeMs = Date.now() - APP_START_TIME;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);

    const response: Record<string, unknown> = {
      status: healthy ? "healthy" : degraded ? "degraded" : "unhealthy",
      timestamp: new Date().toISOString(),
      requestId,
      latency: Date.now() - start,
      uptime: {
        seconds: uptimeSeconds,
        human: formatUptime(uptimeSeconds),
      },
      version: BUILD_INFO.version,
    };

    // Include detailed info if requested
    if (detailed) {
      response.checks = checks;
      response.build = BUILD_INFO;
      response.circuitBreaker = {
        dataforseo: dataForSEOCircuitBreaker.getMetrics(),
      };
    } else {
      // Simplified checks for basic health endpoint
      response.checks = {
        kv: { healthy: kv.healthy },
        r2: { healthy: r2.healthy },
        dataforseo: { healthy: dataforseo.healthy },
      };
    }

    const durationMs = Date.now() - start;
    logger.requestEnd("GET", "/api/health", healthy ? 200 : 503, durationMs, {
      healthy,
      degraded,
    });

    return NextResponse.json(response, {
      status: healthy ? 200 : 503,
      headers: {
        "X-Request-Id": requestId,
        "Cache-Control": "no-store, max-age=0",
        ...(logger.getTraceContext()
          ? { traceparent: formatTraceParent(logger.getTraceContext()!) }
          : {}),
      },
    });
  } catch (error) {
    const durationMs = Date.now() - start;
    logger.error("Health check failed", error, { durationMs });

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        uptime: {
          seconds: Math.floor((Date.now() - APP_START_TIME) / 1000),
        },
      },
      {
        status: 500,
        headers: {
          "X-Request-Id": requestId,
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}
