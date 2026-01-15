/**
 * Custom error types for backend error handling
 * Each error includes proper error codes, messages, and optional context
 */

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

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
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
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
    context?: Record<string, unknown>,
  ) {
    super(message, "VALIDATION_ERROR", 400, {
      ...context,
      field,
      value,
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
 * Format error for logging
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
 */
export function errorToResponse(error: unknown): {
  error: string;
  code?: string;
  context?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    return {
      error: error.message,
      code: error.code,
      context: error.context,
    };
  }

  return {
    error:
      error instanceof Error ? error.message : "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
}
