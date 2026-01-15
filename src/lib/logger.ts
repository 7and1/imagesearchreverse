/**
 * Structured logging module
 * Provides consistent logging format with timing breakdowns and context
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
 * Structured logger with consistent format
 */
export class Logger {
  constructor(
    private readonly context: string,
    private readonly enabled: boolean = true,
  ) {}

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: string): Logger {
    return new Logger(`${this.context}:${additionalContext}`, this.enabled);
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
   * Create a timing scope for measuring operation duration
   */
  startTiming(operation: string): TimingScope {
    return new TimingScope(this, operation);
  }

  /**
   * Format error for logging
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
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry = {
      level,
      context: this.context,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    const consoleMethod =
      level === "error" ? "error" : level === "warn" ? "warn" : "log";
    const prefix = `[${this.context}] ${message}`;
    const contextStr =
      Object.keys(logEntry).length > 4
        ? " " + JSON.stringify(logEntry, null, 2)
        : "";

    console[consoleMethod](prefix + contextStr);
  }
}

/**
 * Timing scope for measuring operation duration
 */
export class TimingScope {
  private metrics: TimingMetric[] = [];
  private readonly startTime: number;

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
   * End the timing scope and log the results
   */
  end(additionalContext?: LogContext): void {
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
      ...additionalContext,
    });
  }

  /**
   * End the timing scope with an error
   */
  endWithError(error: unknown, additionalContext?: LogContext): void {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    this.logger.error(`${this.operation} failed`, error, {
      totalDurationMs: totalDuration,
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
 * Global logger instances for common operations
 */
export const loggers = {
  search: new Logger("api:search"),
  upload: new Logger("api:upload"),
  dataforseo: new Logger("dataforseo"),
  cache: new Logger("cache"),
  rateLimit: new Logger("rateLimit"),
} as const;
