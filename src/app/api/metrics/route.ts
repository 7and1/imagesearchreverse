import { NextResponse, type NextRequest } from "next/server";
import { metrics } from "@/lib/metrics";
import { createRequestLogger, formatTraceParent } from "@/lib/logger";
import { dataForSEOCircuitBreaker } from "@/lib/circuit-breaker";

export const runtime = "edge";

/**
 * GET /api/metrics
 * Returns application metrics in Prometheus or JSON format
 *
 * Query params:
 * - format: "prometheus" (default) | "json"
 *
 * Headers:
 * - Accept: text/plain (prometheus) | application/json
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const traceParent = request.headers.get("traceparent");
  const logger = createRequestLogger("api:metrics", requestId, traceParent);
  const start = Date.now();

  try {
    // Determine output format
    const formatParam = request.nextUrl.searchParams.get("format");
    const acceptHeader = request.headers.get("accept") ?? "";
    const useJson =
      formatParam === "json" || acceptHeader.includes("application/json");

    // Add circuit breaker metrics
    const cbMetrics = dataForSEOCircuitBreaker.getMetrics();
    metrics.setGauge("circuit_breaker_state", cbMetrics.state === "closed" ? 0 : cbMetrics.state === "half-open" ? 1 : 2, {
      service: "dataforseo",
    });
    metrics.setGauge("circuit_breaker_failures_total", cbMetrics.totalFailures, {
      service: "dataforseo",
    });
    metrics.setGauge("circuit_breaker_calls_total", cbMetrics.totalCalls, {
      service: "dataforseo",
    });

    const durationMs = Date.now() - start;
    logger.requestEnd("GET", "/api/metrics", 200, durationMs);

    if (useJson) {
      return NextResponse.json(metrics.toJSON(), {
        headers: {
          "X-Request-Id": requestId,
          "Cache-Control": "no-store, max-age=0",
          ...(logger.getTraceContext()
            ? { traceparent: formatTraceParent(logger.getTraceContext()!) }
            : {}),
        },
      });
    }

    // Return Prometheus format
    return new NextResponse(metrics.toPrometheus(), {
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "X-Request-Id": requestId,
        "Cache-Control": "no-store, max-age=0",
        ...(logger.getTraceContext()
          ? { traceparent: formatTraceParent(logger.getTraceContext()!) }
          : {}),
      },
    });
  } catch (error) {
    const durationMs = Date.now() - start;
    logger.error("Metrics endpoint failed", error, { durationMs });

    return NextResponse.json(
      {
        error: "Failed to collect metrics",
        requestId,
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
