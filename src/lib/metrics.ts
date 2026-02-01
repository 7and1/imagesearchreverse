/**
 * Application metrics module
 * Tracks request counts, latencies, cache hits, and business metrics
 * Compatible with Prometheus exposition format
 */

export type MetricType = "counter" | "gauge" | "histogram";

export interface MetricLabels {
  [key: string]: string;
}

interface MetricValue {
  value: number;
  labels: MetricLabels;
  timestamp: number;
}

interface HistogramBucket {
  le: number;
  count: number;
}

interface HistogramValue {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
  labels: MetricLabels;
}

/**
 * In-memory metrics store
 * Note: In serverless/edge environments, metrics are per-isolate
 * For persistent metrics, use KV or external metrics service
 */
class MetricsStore {
  private counters = new Map<string, MetricValue[]>();
  private gauges = new Map<string, MetricValue[]>();
  private histograms = new Map<string, HistogramValue[]>();
  private readonly startTime = Date.now();

  // Default histogram buckets for latency (in ms)
  private readonly defaultBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

  /**
   * Increment a counter
   */
  incCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    const key = this.serializeLabels(labels);
    const existing = this.counters.get(name) ?? [];
    const entry = existing.find((e) => this.serializeLabels(e.labels) === key);

    if (entry) {
      entry.value += value;
      entry.timestamp = Date.now();
    } else {
      existing.push({ value, labels, timestamp: Date.now() });
      this.counters.set(name, existing);
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.serializeLabels(labels);
    const existing = this.gauges.get(name) ?? [];
    const entry = existing.find((e) => this.serializeLabels(e.labels) === key);

    if (entry) {
      entry.value = value;
      entry.timestamp = Date.now();
    } else {
      existing.push({ value, labels, timestamp: Date.now() });
      this.gauges.set(name, existing);
    }
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(
    name: string,
    value: number,
    labels: MetricLabels = {},
    buckets = this.defaultBuckets
  ): void {
    const key = this.serializeLabels(labels);
    const existing = this.histograms.get(name) ?? [];
    let entry = existing.find((e) => this.serializeLabels(e.labels) === key);

    if (!entry) {
      entry = {
        buckets: buckets.map((le) => ({ le, count: 0 })),
        sum: 0,
        count: 0,
        labels,
      };
      existing.push(entry);
      this.histograms.set(name, existing);
    }

    entry.sum += value;
    entry.count += 1;
    for (const bucket of entry.buckets) {
      if (value <= bucket.le) {
        bucket.count += 1;
      }
    }
  }

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get all metrics in Prometheus exposition format
   */
  toPrometheus(): string {
    const lines: string[] = [];

    // Add uptime gauge
    lines.push("# HELP app_uptime_seconds Application uptime in seconds");
    lines.push("# TYPE app_uptime_seconds gauge");
    lines.push(`app_uptime_seconds ${this.getUptime()}`);
    lines.push("");

    // Counters
    this.counters.forEach((values, name) => {
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`# TYPE ${name} counter`);
      for (const v of values) {
        const labelStr = this.formatLabels(v.labels);
        lines.push(`${name}${labelStr} ${v.value}`);
      }
      lines.push("");
    });

    // Gauges
    this.gauges.forEach((values, name) => {
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`# TYPE ${name} gauge`);
      for (const v of values) {
        const labelStr = this.formatLabels(v.labels);
        lines.push(`${name}${labelStr} ${v.value}`);
      }
      lines.push("");
    });

    // Histograms
    this.histograms.forEach((values, name) => {
      lines.push(`# HELP ${name} Histogram metric`);
      lines.push(`# TYPE ${name} histogram`);
      for (const v of values) {
        const labelStr = this.formatLabels(v.labels);
        for (const bucket of v.buckets) {
          const bucketLabels = v.labels
            ? { ...v.labels, le: String(bucket.le) }
            : { le: String(bucket.le) };
          lines.push(`${name}_bucket${this.formatLabels(bucketLabels)} ${bucket.count}`);
        }
        const infLabels = v.labels ? { ...v.labels, le: "+Inf" } : { le: "+Inf" };
        lines.push(`${name}_bucket${this.formatLabels(infLabels)} ${v.count}`);
        lines.push(`${name}_sum${labelStr} ${v.sum}`);
        lines.push(`${name}_count${labelStr} ${v.count}`);
      }
      lines.push("");
    });

    return lines.join("\n");
  }

  /**
   * Get metrics as JSON for API response
   */
  toJSON(): object {
    return {
      uptime: this.getUptime(),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(this.histograms),
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private serializeLabels(labels: MetricLabels): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
  }

  private formatLabels(labels: MetricLabels): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return "";
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(",")}}`;
  }
}

/**
 * Global metrics store instance
 */
export const metrics = new MetricsStore();

/**
 * Pre-defined metric names for consistency
 */
export const MetricNames = {
  // Request metrics
  HTTP_REQUESTS_TOTAL: "http_requests_total",
  HTTP_REQUEST_DURATION_MS: "http_request_duration_ms",
  HTTP_REQUEST_SIZE_BYTES: "http_request_size_bytes",
  HTTP_RESPONSE_SIZE_BYTES: "http_response_size_bytes",

  // Search metrics
  SEARCH_REQUESTS_TOTAL: "search_requests_total",
  SEARCH_DURATION_MS: "search_duration_ms",
  SEARCH_RESULTS_COUNT: "search_results_count",

  // Cache metrics
  CACHE_HITS_TOTAL: "cache_hits_total",
  CACHE_MISSES_TOTAL: "cache_misses_total",
  CACHE_HIT_RATE: "cache_hit_rate",

  // Rate limit metrics
  RATE_LIMIT_HITS_TOTAL: "rate_limit_hits_total",
  RATE_LIMIT_REMAINING: "rate_limit_remaining",

  // External service metrics
  DATAFORSEO_REQUESTS_TOTAL: "dataforseo_requests_total",
  DATAFORSEO_DURATION_MS: "dataforseo_duration_ms",
  DATAFORSEO_ERRORS_TOTAL: "dataforseo_errors_total",

  // Circuit breaker metrics
  CIRCUIT_BREAKER_STATE: "circuit_breaker_state",
  CIRCUIT_BREAKER_FAILURES: "circuit_breaker_failures_total",

  // Upload metrics
  UPLOAD_REQUESTS_TOTAL: "upload_requests_total",
  UPLOAD_SIZE_BYTES: "upload_size_bytes",
  UPLOAD_DURATION_MS: "upload_duration_ms",

  // Health check metrics
  HEALTH_CHECK_DURATION_MS: "health_check_duration_ms",
  HEALTH_CHECK_STATUS: "health_check_status",
} as const;

/**
 * Helper functions for common metric operations
 */
export const recordHttpRequest = (
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void => {
  const labels = { method, path, status: String(statusCode) };
  metrics.incCounter(MetricNames.HTTP_REQUESTS_TOTAL, labels);
  metrics.observeHistogram(MetricNames.HTTP_REQUEST_DURATION_MS, durationMs, labels);
};

export const recordSearchRequest = (
  status: "success" | "error" | "cached" | "rate_limited",
  durationMs: number,
  resultsCount = 0
): void => {
  metrics.incCounter(MetricNames.SEARCH_REQUESTS_TOTAL, { status });
  metrics.observeHistogram(MetricNames.SEARCH_DURATION_MS, durationMs, { status });
  if (resultsCount > 0) {
    metrics.setGauge(MetricNames.SEARCH_RESULTS_COUNT, resultsCount);
  }
};

export const recordCacheAccess = (hit: boolean): void => {
  if (hit) {
    metrics.incCounter(MetricNames.CACHE_HITS_TOTAL);
  } else {
    metrics.incCounter(MetricNames.CACHE_MISSES_TOTAL);
  }
};

export const recordRateLimitHit = (): void => {
  metrics.incCounter(MetricNames.RATE_LIMIT_HITS_TOTAL);
};

export const recordDataForSEORequest = (
  operation: string,
  success: boolean,
  durationMs: number
): void => {
  const labels = { operation, status: success ? "success" : "error" };
  metrics.incCounter(MetricNames.DATAFORSEO_REQUESTS_TOTAL, labels);
  metrics.observeHistogram(MetricNames.DATAFORSEO_DURATION_MS, durationMs, labels);
  if (!success) {
    metrics.incCounter(MetricNames.DATAFORSEO_ERRORS_TOTAL, { operation });
  }
};

export const recordUpload = (success: boolean, sizeBytes: number, durationMs: number): void => {
  const labels = { status: success ? "success" : "error" };
  metrics.incCounter(MetricNames.UPLOAD_REQUESTS_TOTAL, labels);
  if (success) {
    metrics.observeHistogram(MetricNames.UPLOAD_SIZE_BYTES, sizeBytes);
    metrics.observeHistogram(MetricNames.UPLOAD_DURATION_MS, durationMs);
  }
};

export const recordHealthCheck = (
  service: string,
  healthy: boolean,
  durationMs: number
): void => {
  metrics.setGauge(MetricNames.HEALTH_CHECK_STATUS, healthy ? 1 : 0, { service });
  metrics.observeHistogram(MetricNames.HEALTH_CHECK_DURATION_MS, durationMs, { service });
};
