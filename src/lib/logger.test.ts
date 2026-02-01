import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  Logger,
  TimingScope,
  createLogger,
  createRequestLogger,
  createTraceContext,
  parseTraceParent,
  formatTraceParent,
  loggers,
} from "@/lib/logger";

describe("Logger", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("creates logger with context", () => {
      const logger = new Logger("test-context");

      logger.info("test message");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"context":"test-context"'),
      );
    });

    it("can be disabled", () => {
      const logger = new Logger("test-context", false);

      logger.info("test message");
      logger.warn("test warning");
      logger.error("test error");
      logger.debug("test debug");

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe("child", () => {
    it("creates child logger with combined context", () => {
      const parent = new Logger("parent");
      const child = parent.child("child");

      child.info("test message");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"context":"parent:child"'),
      );
    });

    it("inherits enabled state", () => {
      const parent = new Logger("parent", false);
      const child = parent.child("child");

      child.info("test message");

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it("inherits trace context", () => {
      const parent = new Logger("parent").withRequest("req-123", {
        traceId: "abc123",
        spanId: "def456",
      });
      const child = parent.child("child");

      child.info("test message");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"traceId":"abc123"'),
      );
    });
  });

  describe("withRequest", () => {
    it("creates logger with request context", () => {
      const logger = new Logger("test").withRequest("req-123");

      logger.info("test message");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"req-123"'),
      );
    });

    it("includes trace context", () => {
      const logger = new Logger("test").withRequest("req-123", {
        traceId: "trace-abc",
        spanId: "span-def",
      });

      logger.info("test message");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"traceId":"trace-abc"'),
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"spanId":"span-def"'),
      );
    });
  });

  describe("info", () => {
    it("logs info message", () => {
      const logger = new Logger("test");

      logger.info("info message");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"message":"info message"'),
      );
    });

    it("logs info message with context", () => {
      const logger = new Logger("test");

      logger.info("info message", { key: "value" });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"key":"value"'),
      );
    });
  });

  describe("warn", () => {
    it("logs warning message", () => {
      const logger = new Logger("test");

      logger.warn("warning message");

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('"message":"warning message"'),
      );
    });

    it("logs warning message with context", () => {
      const logger = new Logger("test");

      logger.warn("warning message", { count: 5 });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('"count":5'),
      );
    });
  });

  describe("error", () => {
    it("logs error message", () => {
      const logger = new Logger("test");

      logger.error("error message");

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('"message":"error message"'),
      );
    });

    it("logs error with Error object", () => {
      const logger = new Logger("test");
      const error = new Error("test error");

      logger.error("error occurred", error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('"error":"test error"'),
      );
    });

    it("logs error with context", () => {
      const logger = new Logger("test");

      logger.error("error message", null, { requestId: "123" });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"123"'),
      );
    });

    it("handles non-Error objects", () => {
      const logger = new Logger("test");

      logger.error("error occurred", { code: "ERR_001" });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("ERR_001"),
      );
    });

    it("handles string errors", () => {
      const logger = new Logger("test");

      logger.error("error occurred", "string error");

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("string error"),
      );
    });

    it("handles circular reference in error object", () => {
      const logger = new Logger("test");
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;

      // Should not throw
      expect(() => logger.error("error occurred", circular)).not.toThrow();
    });
  });

  describe("debug", () => {
    it("logs debug message", () => {
      const logger = new Logger("test");

      logger.debug("debug message");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"message":"debug message"'),
      );
    });

    it("logs debug message with context", () => {
      const logger = new Logger("test");

      logger.debug("debug message", { data: [1, 2, 3] });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"data"'),
      );
    });
  });

  describe("timing", () => {
    it("logs timing with duration", () => {
      const logger = new Logger("test");

      logger.timing("operation completed", 150);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"durationMs":150'),
      );
    });

    it("logs timing with additional context", () => {
      const logger = new Logger("test");

      logger.timing("operation completed", 150, { operation: "fetch" });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"fetch"'),
      );
    });
  });

  describe("metric", () => {
    it("logs business metric", () => {
      const logger = new Logger("test");

      logger.metric({ name: "searches_per_day", value: 100 });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"metricName":"searches_per_day"'),
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"metricValue":100'),
      );
    });

    it("logs metric with unit and tags", () => {
      const logger = new Logger("test");

      logger.metric({
        name: "cache_hit_rate",
        value: 0.85,
        unit: "ratio",
        tags: { cache: "kv" },
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"metricUnit":"ratio"'),
      );
    });
  });

  describe("requestStart and requestEnd", () => {
    it("logs request start", () => {
      const logger = new Logger("test");

      logger.requestStart("GET", "/api/search");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"_type":"request_start"'),
      );
    });

    it("logs request end with status and duration", () => {
      const logger = new Logger("test");

      logger.requestEnd("GET", "/api/search", 200, 150);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"_type":"request_end"'),
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"statusCode":200'),
      );
    });

    it("logs 5xx errors as error level", () => {
      const logger = new Logger("test");

      logger.requestEnd("GET", "/api/search", 500, 150);

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("logs 4xx errors as warn level", () => {
      const logger = new Logger("test");

      logger.requestEnd("GET", "/api/search", 404, 150);

      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe("startTiming", () => {
    it("returns TimingScope instance", () => {
      const logger = new Logger("test");

      const scope = logger.startTiming("operation");

      expect(scope).toBeInstanceOf(TimingScope);
    });
  });
});

describe("TimingScope", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("addMetric", () => {
    it("adds timing metric", () => {
      const logger = new Logger("test");
      const scope = logger.startTiming("operation");

      const start = Date.now();
      scope.addMetric("step1", start, start + 100);
      scope.end();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("step1"),
      );
    });

    it("uses current time as end if not provided", () => {
      const logger = new Logger("test");
      const scope = logger.startTiming("operation");

      const start = Date.now() - 50;
      scope.addMetric("step1", start);
      scope.end();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("step1"),
      );
    });
  });

  describe("end", () => {
    it("logs completion with total duration", () => {
      const logger = new Logger("test");
      const scope = logger.startTiming("operation");

      scope.end();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("operation completed"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("totalDurationMs"),
      );
    });

    it("includes timing breakdown", () => {
      const logger = new Logger("test");
      const scope = logger.startTiming("operation");

      const start = Date.now();
      scope.addMetric("step1", start, start + 50);
      scope.addMetric("step2", start + 50, start + 100);
      scope.end();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("timingBreakdown"),
      );
    });

    it("includes additional context", () => {
      const logger = new Logger("test");
      const scope = logger.startTiming("operation");

      scope.end({ status: "success", count: 10 });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"status":"success"'),
      );
    });

    it("calculates percentage of total for each metric", () => {
      const logger = new Logger("test");
      const scope = logger.startTiming("operation");

      const start = Date.now();
      scope.addMetric("step1", start, start + 100);
      scope.end();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("percentOfTotal"),
      );
    });
  });

  describe("endWithError", () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("logs error with duration", () => {
      const logger = new Logger("test");
      const scope = logger.startTiming("operation");

      scope.endWithError(new Error("test error"));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("operation failed"),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("totalDurationMs"),
      );
    });

    it("includes error details", () => {
      const logger = new Logger("test");
      const scope = logger.startTiming("operation");

      scope.endWithError(new Error("test error"));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("test error"),
      );
    });

    it("includes additional context", () => {
      const logger = new Logger("test");
      const scope = logger.startTiming("operation");

      scope.endWithError(new Error("test error"), { requestId: "123" });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"123"'),
      );
    });
  });
});

describe("createLogger", () => {
  it("creates enabled logger by default", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const logger = createLogger("test");
    logger.info("test message");

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("creates disabled logger when specified", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const logger = createLogger("test", false);
    logger.info("test message");

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe("loggers", () => {
  it("exports pre-configured loggers", () => {
    expect(loggers.search).toBeInstanceOf(Logger);
    expect(loggers.upload).toBeInstanceOf(Logger);
    expect(loggers.dataforseo).toBeInstanceOf(Logger);
    expect(loggers.cache).toBeInstanceOf(Logger);
    expect(loggers.rateLimit).toBeInstanceOf(Logger);
    expect(loggers.health).toBeInstanceOf(Logger);
    expect(loggers.metrics).toBeInstanceOf(Logger);
  });
});

describe("createRequestLogger", () => {
  it("creates logger with request ID", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const logger = createRequestLogger("test", "req-123");
    logger.info("test message");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"requestId":"req-123"'),
    );

    consoleSpy.mockRestore();
  });

  it("parses traceparent header", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const logger = createRequestLogger(
      "test",
      "req-123",
      "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
    );
    logger.info("test message");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"traceId":"0af7651916cd43dd8448eb211c80319c"'),
    );

    consoleSpy.mockRestore();
  });
});

describe("Trace Context", () => {
  describe("createTraceContext", () => {
    it("creates new trace context", () => {
      const ctx = createTraceContext();

      expect(ctx.traceId).toHaveLength(32);
      expect(ctx.spanId).toHaveLength(16);
      expect(ctx.sampled).toBe(true);
    });

    it("inherits traceId from parent", () => {
      const parent = createTraceContext();
      const child = createTraceContext(parent);

      expect(child.traceId).toBe(parent.traceId);
      expect(child.spanId).not.toBe(parent.spanId);
      expect(child.parentSpanId).toBe(parent.spanId);
    });
  });

  describe("parseTraceParent", () => {
    it("parses valid traceparent header", () => {
      const ctx = parseTraceParent(
        "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
      );

      expect(ctx).not.toBeNull();
      expect(ctx?.traceId).toBe("0af7651916cd43dd8448eb211c80319c");
      expect(ctx?.spanId).toBe("b7ad6b7169203331");
      expect(ctx?.sampled).toBe(true);
    });

    it("returns null for invalid header", () => {
      expect(parseTraceParent(null)).toBeNull();
      expect(parseTraceParent("invalid")).toBeNull();
      expect(parseTraceParent("00-short-span-01")).toBeNull();
    });

    it("parses sampled flag correctly", () => {
      const sampled = parseTraceParent(
        "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
      );
      const notSampled = parseTraceParent(
        "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00"
      );

      expect(sampled?.sampled).toBe(true);
      expect(notSampled?.sampled).toBe(false);
    });
  });

  describe("formatTraceParent", () => {
    it("formats trace context as traceparent header", () => {
      const ctx = {
        traceId: "0af7651916cd43dd8448eb211c80319c",
        spanId: "b7ad6b7169203331",
        sampled: true,
      };

      const header = formatTraceParent(ctx);

      expect(header).toBe(
        "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
      );
    });

    it("formats unsampled trace correctly", () => {
      const ctx = {
        traceId: "0af7651916cd43dd8448eb211c80319c",
        spanId: "b7ad6b7169203331",
        sampled: false,
      };

      const header = formatTraceParent(ctx);

      expect(header).toBe(
        "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00"
      );
    });
  });
});
