/**
 * Custom error types for backend error handling
 * Each error includes proper error codes, messages, and optional context
 *
 * SECURITY NOTE: Error context is split into two categories:
 * - publicContext: Safe to expose in HTTP responses (user-facing)
 * - internalContext: Only for logging, never exposed to clients
 */

/**
 * Keys that are safe to expose in HTTP responses
 * All other context keys are considered internal/sensitive
 */
const PUBLIC_CONTEXT_KEYS = new Set([
  "field", // Which field failed validation
  "limit", // Rate limit info
  "remaining", // Rate limit remaining
  "resetAt", // Rate limit reset time
  "timeout", // Whether it was a timeout
  "operation", // Cache operation type
]);

/**
 * Sanitize context for public exposure
 * Only includes keys that are safe to show to users
 */
function sanitizeContextForResponse(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return undefined;

  const sanitized: Record<string, unknown> = {};
  let hasKeys = false;

  for (const key of PUBLIC_CONTEXT_KEYS) {
    if (key in context && context[key] !== undefined) {
      sanitized[key] = context[key];
      hasKeys = true;
    }
  }

  return hasKeys ? sanitized : undefined;
}

/**
 * Base error class for all custom errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Full error details for internal logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    };
  }

  /**
   * Sanitized error for HTTP responses - excludes sensitive context
   */
  toPublicJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: sanitizeContextForResponse(this.context),
    };
  }
}

/**
 * DataForSEO API specific errors
 */
export class DataForSEOError extends AppError {
  constructor(
    message: string,
    public readonly dfsCode?: string,
    public readonly dfsStatusCode?: number,
    context?: Record<string, unknown>,
  ) {
    const statusCode = dfsStatusCode
      ? Math.floor(dfsStatusCode / 100) * 100
      : 500;
    super(message, "DATAFORSEO_ERROR", statusCode, {
      ...context,
      dfsCode,
      dfsStatusCode,
    });
    this.name = "DataForSEOError";
  }

  static isRateLimit(error: unknown): error is DataForSEOError {
    return (
      error instanceof DataForSEOError &&
      (error.dfsStatusCode === 429 || error.dfsCode === "rate_limit_exceeded")
    );
  }

  static isTimeout(error: unknown): error is DataForSEOError {
    return (
      error instanceof DataForSEOError &&
      (error.dfsStatusCode === 408 || error.dfsCode === "timeout")
    );
  }

  static isAuthError(error: unknown): error is DataForSEOError {
    return (
      error instanceof DataForSEOError &&
      (error.dfsStatusCode === 401 || error.dfsStatusCode === 403)
    );
  }

  /**
   * Check if error is a client error (4xx) that should not be retried
   * Excludes 429 (rate limit) which can be retried after backoff
   */
  static isClientError(error: unknown): error is DataForSEOError {
    return (
      error instanceof DataForSEOError &&
      error.dfsStatusCode !== undefined &&
      error.dfsStatusCode >= 400 &&
      error.dfsStatusCode < 500 &&
      error.dfsStatusCode !== 429
    );
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = "Rate limit exceeded",
    public readonly resetAt?: Date,
    public readonly limit?: number,
    public readonly remaining?: number,
    context?: Record<string, unknown>,
  ) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, {
      ...context,
      resetAt: resetAt?.toISOString(),
      limit,
      remaining,
    });
    this.name = "RateLimitError";
  }
}

/**
 * Input validation errors
 * SECURITY: Does not store the actual value to prevent leaking sensitive user input
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
    _value?: unknown, // Accepted but not stored for security
    context?: Record<string, unknown>,
  ) {
    super(message, "VALIDATION_ERROR", 400, {
      ...context,
      field,
      // Note: value is intentionally NOT stored to prevent sensitive data exposure
    });
    this.name = "ValidationError";
  }
}

/**
 * Network/timeout errors
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    public readonly timeout?: boolean,
    context?: Record<string, unknown>,
  ) {
    super(message, "NETWORK_ERROR", 503, {
      ...context,
      timeout,
    });
    this.name = "NetworkError";
  }
}

/**
 * Cache operation errors
 */
export class CacheError extends AppError {
  constructor(
    message: string,
    public readonly operation: "read" | "write" | "delete",
    context?: Record<string, unknown>,
  ) {
    super(message, "CACHE_ERROR", 500, {
      ...context,
      operation,
    });
    this.name = "CacheError";
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Format error for internal logging (includes all details)
 * SECURITY: This output should NEVER be sent to clients
 */
export function formatError(error: unknown): {
  message: string;
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: "UNKNOWN_ERROR",
      context: {
        name: error.name,
        // Stack trace included for logging only
        stack: error.stack,
      },
    };
  }

  return {
    message: String(error),
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Convert error to HTTP response data
 * SECURITY: This function sanitizes error output for client exposure
 * - Removes sensitive context fields
 * - Removes stack traces
 * - Uses generic message for unknown errors
 */
export function errorToResponse(error: unknown): {
  error: string;
  code?: string;
  context?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    const publicData = error.toPublicJSON();
    return {
      error: publicData.message,
      code: publicData.code,
      context: publicData.context,
    };
  }

  // For unknown errors, return a generic message to avoid leaking internal details
  return {
    error: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
}
