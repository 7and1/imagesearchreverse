/**
 * Structured logging module
 * Provides consistent logging format with timing breakdowns, request tracing,
 * and business metrics tracking
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export type LogContext = {
  [key: string]: unknown;
};

export type TimingMetric = {
  name: string;
  durationMs: number;
  start: number;
  end: number;
};

/**
 * Trace context for distributed tracing
 * Follows W3C Trace Context specification patterns
 */
export type TraceContext = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled?: boolean;
};

/**
 * Business metrics for tracking application KPIs
 */
export type BusinessMetric = {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
};

/**
 * Generate a random hex string of specified length
 */
const randomHex = (length: number): string => {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Create a new trace context
 */
export const createTraceContext = (parentContext?: TraceContext): TraceContext => {
  return {
    traceId: parentContext?.traceId ?? randomHex(32),
    spanId: randomHex(16),
    parentSpanId: parentContext?.spanId,
    sampled: parentContext?.sampled ?? true,
  };
};

/**
 * Parse trace context from W3C traceparent header
 * Format: version-traceId-spanId-flags
 */
export const parseTraceParent = (header: string | null): TraceContext | null => {
  if (!header) return null;

  const parts = header.split("-");
  if (parts.length !== 4) return null;

  const [version, traceId, spanId, flags] = parts;
  if (version !== "00" || traceId.length !== 32 || spanId.length !== 16) {
    return null;
  }

  return {
    traceId,
    spanId,
    sampled: (parseInt(flags, 16) & 0x01) === 1,
  };
};

/**
 * Format trace context as W3C traceparent header
 */
export const formatTraceParent = (ctx: TraceContext): string => {
  const flags = ctx.sampled ? "01" : "00";
  return `00-${ctx.traceId}-${ctx.spanId}-${flags}`;
};

/**
 * Structured logger with consistent format, request tracing, and metrics
 */
export class Logger {
  private traceContext?: TraceContext;
  private requestId?: string;

  constructor(
    private readonly context: string,
    private readonly enabled: boolean = true,
  ) {}

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: string): Logger {
    const child = new Logger(`${this.context}:${additionalContext}`, this.enabled);
    child.traceContext = this.traceContext;
    child.requestId = this.requestId;
    return child;
  }

  /**
   * Create a logger with request context for tracing
   */
  withRequest(requestId: string, traceContext?: TraceContext): Logger {
    const child = new Logger(this.context, this.enabled);
    child.requestId = requestId;
    child.traceContext = traceContext ?? createTraceContext();
    return child;
  }

  /**
   * Get current trace context
   */
  getTraceContext(): TraceContext | undefined {
    return this.traceContext;
  }

  /**
   * Get current request ID
   */
  getRequestId(): string | undefined {
    return this.requestId;
  }

  /**
   * Log info message with context
   */
  info(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    this.log("info", message, context);
  }

  /**
   * Log warning message with context
   */
  warn(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    this.log("warn", message, context);
  }

  /**
   * Log error message with context
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (!this.enabled) return;
    const errorContext = this.formatError(error);
    this.log("error", message, { ...context, ...errorContext });
  }

  /**
   * Log debug message with context
   */
  debug(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    this.log("debug", message, context);
  }

  /**
   * Log with timing information
   */
  timing(message: string, durationMs: number, context?: LogContext): void {
    this.info(message, { ...context, durationMs });
  }

  /**
   * Log a business metric
   */
  metric(metric: BusinessMetric): void {
    if (!this.enabled) return;
    this.log("info", `metric:${metric.name}`, {
      metricName: metric.name,
      metricValue: metric.value,
      metricUnit: metric.unit,
      metricTags: metric.tags,
      _type: "metric",
    });
  }

  /**
   * Log request start (for request/response pair tracking)
   */
  requestStart(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path} started`, {
      ...context,
      _type: "request_start",
      method,
      path,
    });
  }

  /**
   * Log request end (for request/response pair tracking)
   */
  requestEnd(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    this.log(level, `${method} ${path} completed`, {
      ...context,
      _type: "request_end",
      method,
      path,
      statusCode,
      durationMs,
    });
  }

  /**
   * Create a timing scope for measuring operation duration
   */
  startTiming(operation: string): TimingScope {
    return new TimingScope(this, operation);
  }

  /**
   * Format error for logging (sanitized - no sensitive data)
   */
  private formatError(error: unknown): LogContext {
    if (!error) return {};

    if (error instanceof Error) {
      return {
        error: error.message,
        errorName: error.name,
        errorStack: error.stack,
      };
    }

    if (typeof error === "object" && error !== null) {
      try {
        return {
          error: JSON.stringify(error),
        };
      } catch {
        return {
          error: String(error),
        };
      }
    }

    return {
      error: String(error),
    };
  }

  /**
   * Core logging method - outputs structured JSON
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry: Record<string, unknown> = {
      level,
      context: this.context,
      message,
      timestamp: new Date().toISOString(),
    };

    // Add request tracing context
    if (this.requestId) {
      logEntry.requestId = this.requestId;
    }
    if (this.traceContext) {
      logEntry.traceId = this.traceContext.traceId;
      logEntry.spanId = this.traceContext.spanId;
      if (this.traceContext.parentSpanId) {
        logEntry.parentSpanId = this.traceContext.parentSpanId;
      }
    }

    // Add additional context
    if (context) {
      Object.assign(logEntry, context);
    }

    const consoleMethod =
      level === "error" ? "error" : level === "warn" ? "warn" : "log";

    // Output as JSON for structured log aggregation
    console[consoleMethod](JSON.stringify(logEntry));
  }
}

/**
 * Timing scope for measuring operation duration with detailed breakdowns
 */
export class TimingScope {
  private metrics: TimingMetric[] = [];
  private readonly startTime: number;
  private currentSpan?: { name: string; start: number };

  constructor(
    private readonly logger: Logger,
    private readonly operation: string,
  ) {
    this.startTime = Date.now();
  }

  /**
   * Add a timing metric
   */
  addMetric(name: string, start: number, end?: number): void {
    this.metrics.push({
      name,
      durationMs: (end ?? Date.now()) - start,
      start,
      end: end ?? Date.now(),
    });
  }

  /**
   * Start a named span within this timing scope
   */
  startSpan(name: string): void {
    if (this.currentSpan) {
      this.endSpan();
    }
    this.currentSpan = { name, start: Date.now() };
  }

  /**
   * End the current span
   */
  endSpan(): void {
    if (this.currentSpan) {
      this.addMetric(this.currentSpan.name, this.currentSpan.start);
      this.currentSpan = undefined;
    }
  }

  /**
   * Get elapsed time since start
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * End the timing scope and log the results
   */
  end(additionalContext?: LogContext): void {
    if (this.currentSpan) {
      this.endSpan();
    }

    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    const timingBreakdown = this.metrics.map((m) => ({
      metric: m.name,
      durationMs: m.durationMs,
      percentOfTotal: ((m.durationMs / totalDuration) * 100).toFixed(1) + "%",
    }));

    this.logger.info(`${this.operation} completed`, {
      totalDurationMs: totalDuration,
      timingBreakdown,
      _type: "timing",
      ...additionalContext,
    });
  }

  /**
   * End the timing scope with an error
   */
  endWithError(error: unknown, additionalContext?: LogContext): void {
    if (this.currentSpan) {
      this.endSpan();
    }

    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    this.logger.error(`${this.operation} failed`, error, {
      totalDurationMs: totalDuration,
      _type: "timing_error",
      ...additionalContext,
    });
  }
}

/**
 * Create a logger instance
 */
export const createLogger = (context: string, enabled = true): Logger => {
  return new Logger(context, enabled);
};

/**
 * Create a logger with request context
 */
export const createRequestLogger = (
  context: string,
  requestId: string,
  traceParent?: string | null
): Logger => {
  const traceContext = parseTraceParent(traceParent ?? null) ?? createTraceContext();
  return new Logger(context).withRequest(requestId, traceContext);
};

/**
 * Global logger instances for common operations
 */
export const loggers = {
  search: new Logger("api:search"),
  upload: new Logger("api:upload"),
  dataforseo: new Logger("dataforseo"),
  cache: new Logger("cache"),
  rateLimit: new Logger("rateLimit"),
  health: new Logger("api:health"),
  metrics: new Logger("api:metrics"),
} as const;
