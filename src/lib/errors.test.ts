import { describe, expect, it } from "vitest";
import {
  AppError,
  DataForSEOError,
  RateLimitError,
  ValidationError,
  NetworkError,
  CacheError,
  isAppError,
  formatError,
  errorToResponse,
} from "@/lib/errors";

describe("AppError", () => {
  it("creates error with message, code, and status", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400);

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe("AppError");
  });

  it("defaults statusCode to 500", () => {
    const error = new AppError("Test error", "TEST_ERROR");

    expect(error.statusCode).toBe(500);
  });

  it("includes context in error", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400, {
      field: "email",
      value: "invalid",
    });

    expect(error.context).toEqual({ field: "email", value: "invalid" });
  });

  it("serializes to JSON correctly", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400, {
      field: "email",
    });

    const json = error.toJSON();

    expect(json).toEqual({
      name: "AppError",
      message: "Test error",
      code: "TEST_ERROR",
      statusCode: 400,
      context: { field: "email" },
    });
  });

  it("is an instance of Error", () => {
    const error = new AppError("Test error", "TEST_ERROR");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  describe("toPublicJSON", () => {
    it("sanitizes context to only include public keys", () => {
      const error = new AppError("Test error", "TEST_ERROR", 400, {
        field: "email",
        sensitiveData: "should-be-removed",
        limit: 10,
        remaining: 5,
        resetAt: "2026-01-15T00:00:00Z",
        timeout: true,
        operation: "read",
        internalKey: "should-be-removed",
      });

      const publicJson = error.toPublicJSON();

      expect(publicJson.context?.field).toBe("email");
      expect(publicJson.context?.limit).toBe(10);
      expect(publicJson.context?.remaining).toBe(5);
      expect(publicJson.context?.resetAt).toBe("2026-01-15T00:00:00Z");
      expect(publicJson.context?.timeout).toBe(true);
      expect(publicJson.context?.operation).toBe("read");
      expect(publicJson.context?.sensitiveData).toBeUndefined();
      expect(publicJson.context?.internalKey).toBeUndefined();
    });

    it("returns undefined context when no public keys present", () => {
      const error = new AppError("Test error", "TEST_ERROR", 400, {
        sensitiveData: "should-be-removed",
        internalKey: "also-removed",
      });

      const publicJson = error.toPublicJSON();

      expect(publicJson.context).toBeUndefined();
    });

    it("returns undefined context when context is undefined", () => {
      const error = new AppError("Test error", "TEST_ERROR", 400);

      const publicJson = error.toPublicJSON();

      expect(publicJson.context).toBeUndefined();
    });
  });
});

describe("DataForSEOError", () => {
  it("creates error with DFS-specific fields", () => {
    const error = new DataForSEOError(
      "API error",
      "invalid_request",
      40001,
      { taskId: "123" },
    );

    expect(error.message).toBe("API error");
    expect(error.code).toBe("DATAFORSEO_ERROR");
    expect(error.dfsCode).toBe("invalid_request");
    expect(error.dfsStatusCode).toBe(40001);
    expect(error.name).toBe("DataForSEOError");
  });

  it("calculates HTTP status from DFS status code", () => {
    const error400 = new DataForSEOError("Bad request", undefined, 400);
    expect(error400.statusCode).toBe(400);

    const error500 = new DataForSEOError("Server error", undefined, 500);
    expect(error500.statusCode).toBe(500);

    const error429 = new DataForSEOError("Rate limited", undefined, 429);
    expect(error429.statusCode).toBe(400);
  });

  it("defaults to 500 when no DFS status code", () => {
    const error = new DataForSEOError("Unknown error");

    expect(error.statusCode).toBe(500);
  });

  describe("isRateLimit", () => {
    it("returns true for 429 status", () => {
      const error = new DataForSEOError("Rate limited", undefined, 429);

      expect(DataForSEOError.isRateLimit(error)).toBe(true);
    });

    it("returns true for rate_limit_exceeded code", () => {
      const error = new DataForSEOError("Rate limited", "rate_limit_exceeded");

      expect(DataForSEOError.isRateLimit(error)).toBe(true);
    });

    it("returns false for other errors", () => {
      const error = new DataForSEOError("Other error", "other_code", 400);

      expect(DataForSEOError.isRateLimit(error)).toBe(false);
    });

    it("returns false for non-DataForSEOError", () => {
      const error = new Error("Regular error");

      expect(DataForSEOError.isRateLimit(error)).toBe(false);
    });
  });

  describe("isTimeout", () => {
    it("returns true for 408 status", () => {
      const error = new DataForSEOError("Timeout", undefined, 408);

      expect(DataForSEOError.isTimeout(error)).toBe(true);
    });

    it("returns true for timeout code", () => {
      const error = new DataForSEOError("Timeout", "timeout");

      expect(DataForSEOError.isTimeout(error)).toBe(true);
    });

    it("returns false for other errors", () => {
      const error = new DataForSEOError("Other error", "other_code", 400);

      expect(DataForSEOError.isTimeout(error)).toBe(false);
    });
  });

  describe("isAuthError", () => {
    it("returns true for 401 status", () => {
      const error = new DataForSEOError("Unauthorized", undefined, 401);

      expect(DataForSEOError.isAuthError(error)).toBe(true);
    });

    it("returns true for 403 status", () => {
      const error = new DataForSEOError("Forbidden", undefined, 403);

      expect(DataForSEOError.isAuthError(error)).toBe(true);
    });

    it("returns false for other errors", () => {
      const error = new DataForSEOError("Other error", undefined, 400);

      expect(DataForSEOError.isAuthError(error)).toBe(false);
    });
  });

  describe("isClientError", () => {
    it("returns true for 4xx errors except 429", () => {
      const error400 = new DataForSEOError("Bad request", undefined, 400);
      const error404 = new DataForSEOError("Not found", undefined, 404);

      expect(DataForSEOError.isClientError(error400)).toBe(true);
      expect(DataForSEOError.isClientError(error404)).toBe(true);
    });

    it("returns false for 429 (rate limit)", () => {
      const error = new DataForSEOError("Rate limited", undefined, 429);

      expect(DataForSEOError.isClientError(error)).toBe(false);
    });

    it("returns false for 5xx errors", () => {
      const error = new DataForSEOError("Server error", undefined, 500);

      expect(DataForSEOError.isClientError(error)).toBe(false);
    });

    it("returns false when dfsStatusCode is undefined", () => {
      const error = new DataForSEOError("Unknown error");

      expect(DataForSEOError.isClientError(error)).toBe(false);
    });
  });
});

describe("RateLimitError", () => {
  it("creates error with rate limit fields", () => {
    const resetAt = new Date("2026-01-15T00:00:00Z");
    const error = new RateLimitError(
      "Too many requests",
      resetAt,
      10,
      0,
      { ip: "127.0.0.1" },
    );

    expect(error.message).toBe("Too many requests");
    expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(error.statusCode).toBe(429);
    expect(error.resetAt).toEqual(resetAt);
    expect(error.limit).toBe(10);
    expect(error.remaining).toBe(0);
    expect(error.name).toBe("RateLimitError");
  });

  it("uses default message", () => {
    const error = new RateLimitError();

    expect(error.message).toBe("Rate limit exceeded");
  });

  it("includes resetAt in context as ISO string", () => {
    const resetAt = new Date("2026-01-15T00:00:00Z");
    const error = new RateLimitError("Limited", resetAt);

    expect(error.context?.resetAt).toBe("2026-01-15T00:00:00.000Z");
  });
});

describe("ValidationError", () => {
  it("creates error with validation fields", () => {
    const error = new ValidationError(
      "Invalid email",
      "email",
      "not-an-email", // value is accepted but not stored for security
      { format: "email" },
    );

    expect(error.message).toBe("Invalid email");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.statusCode).toBe(400);
    expect(error.field).toBe("email");
    // SECURITY: value is intentionally not stored to prevent sensitive data exposure
    expect(error.name).toBe("ValidationError");
  });

  it("includes field in context but not value (security)", () => {
    const error = new ValidationError("Invalid", "field", "sensitive-value");

    expect(error.context?.field).toBe("field");
    // SECURITY: value should NOT be in context
    expect(error.context?.value).toBeUndefined();
  });
});

describe("NetworkError", () => {
  it("creates error with network fields", () => {
    const error = new NetworkError(
      "Connection failed",
      false,
      { url: "https://api.example.com" },
    );

    expect(error.message).toBe("Connection failed");
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.statusCode).toBe(503);
    expect(error.timeout).toBe(false);
    expect(error.name).toBe("NetworkError");
  });

  it("indicates timeout errors", () => {
    const error = new NetworkError("Request timed out", true);

    expect(error.timeout).toBe(true);
    expect(error.context?.timeout).toBe(true);
  });
});

describe("CacheError", () => {
  it("creates error with cache operation", () => {
    const error = new CacheError(
      "Cache read failed",
      "read",
      { key: "cache:123" },
    );

    expect(error.message).toBe("Cache read failed");
    expect(error.code).toBe("CACHE_ERROR");
    expect(error.statusCode).toBe(500);
    expect(error.operation).toBe("read");
    expect(error.name).toBe("CacheError");
  });

  it("supports write operation", () => {
    const error = new CacheError("Cache write failed", "write");

    expect(error.operation).toBe("write");
  });

  it("supports delete operation", () => {
    const error = new CacheError("Cache delete failed", "delete");

    expect(error.operation).toBe("delete");
  });
});

describe("isAppError", () => {
  it("returns true for AppError instances", () => {
    expect(isAppError(new AppError("Test", "TEST"))).toBe(true);
  });

  it("returns true for AppError subclasses", () => {
    expect(isAppError(new DataForSEOError("Test"))).toBe(true);
    expect(isAppError(new RateLimitError())).toBe(true);
    expect(isAppError(new ValidationError("Test"))).toBe(true);
    expect(isAppError(new NetworkError("Test"))).toBe(true);
    expect(isAppError(new CacheError("Test", "read"))).toBe(true);
  });

  it("returns false for regular Error", () => {
    expect(isAppError(new Error("Test"))).toBe(false);
  });

  it("returns false for non-errors", () => {
    expect(isAppError("string")).toBe(false);
    expect(isAppError(123)).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError({})).toBe(false);
  });
});

describe("formatError", () => {
  it("formats AppError correctly", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400, {
      field: "email",
    });

    const formatted = formatError(error);

    expect(formatted).toEqual({
      name: "AppError",
      message: "Test error",
      code: "TEST_ERROR",
      statusCode: 400,
      context: { field: "email" },
    });
  });

  it("formats regular Error", () => {
    const error = new Error("Regular error");

    const formatted = formatError(error);

    expect(formatted.message).toBe("Regular error");
    expect(formatted.code).toBe("UNKNOWN_ERROR");
    expect(formatted.context?.name).toBe("Error");
    expect(formatted.context?.stack).toBeDefined();
  });

  it("formats string errors", () => {
    const formatted = formatError("String error");

    expect(formatted.message).toBe("String error");
    expect(formatted.code).toBe("UNKNOWN_ERROR");
  });

  it("formats number errors", () => {
    const formatted = formatError(404);

    expect(formatted.message).toBe("404");
    expect(formatted.code).toBe("UNKNOWN_ERROR");
  });

  it("formats null/undefined", () => {
    expect(formatError(null).message).toBe("null");
    expect(formatError(undefined).message).toBe("undefined");
  });
});

describe("errorToResponse", () => {
  it("converts AppError to response format with sanitized context", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400, {
      field: "email", // public - should be included
      internalData: "secret", // internal - should be excluded
    });

    const response = errorToResponse(error);

    expect(response).toEqual({
      error: "Test error",
      code: "TEST_ERROR",
      context: { field: "email" }, // only public keys
    });
  });

  it("excludes sensitive context from response", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400, {
      dfsCode: "internal_code", // internal - excluded
      dfsStatusCode: 40001, // internal - excluded
      stack: "Error at...", // internal - excluded
      field: "email", // public - included
    });

    const response = errorToResponse(error);

    expect(response.context).toEqual({ field: "email" });
    expect(response.context?.dfsCode).toBeUndefined();
    expect(response.context?.stack).toBeUndefined();
  });

  it("returns undefined context when no public keys present", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400, {
      internalOnly: "secret",
    });

    const response = errorToResponse(error);

    expect(response.context).toBeUndefined();
  });

  it("converts regular Error to generic response (security)", () => {
    const error = new Error("Internal details exposed");

    const response = errorToResponse(error);

    // SECURITY: Should NOT expose the actual error message
    expect(response).toEqual({
      error: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
    });
  });

  it("converts non-Error to generic response", () => {
    const response = errorToResponse("string error");

    expect(response).toEqual({
      error: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
    });
  });

  it("handles null/undefined with generic message", () => {
    expect(errorToResponse(null).error).toBe("An unexpected error occurred");
    expect(errorToResponse(undefined).error).toBe("An unexpected error occurred");
  });

  it("includes rate limit context in response", () => {
    const error = new RateLimitError("Too many requests", new Date(), 10, 0);

    const response = errorToResponse(error);

    expect(response.context?.limit).toBe(10);
    expect(response.context?.remaining).toBe(0);
    expect(response.context?.resetAt).toBeDefined();
  });
});
