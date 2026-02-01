import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  dataForSEOCircuitBreaker,
} from "./circuit-breaker";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      halfOpenMaxCalls: 2,
    });
  });

  describe("closed state (normal operation)", () => {
    it("should execute successful functions normally", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const result = await breaker.execute(fn);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should track success count", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      await breaker.execute(fn);
      await breaker.execute(fn);
      const metrics = breaker.getMetrics();
      expect(metrics.successCount).toBe(2);
      expect(metrics.totalCalls).toBe(2);
    });

    it("should count failures", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      await expect(breaker.execute(fn)).rejects.toThrow("fail");
      const metrics = breaker.getMetrics();
      expect(metrics.failureCount).toBe(1);
      expect(metrics.totalFailures).toBe(1);
    });
  });

  describe("open state (circuit broken)", () => {
    it("should open circuit after threshold failures", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));

      // Trigger 3 failures
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow("fail");
      }

      // Circuit should now be open
      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe("open");

      // Next call should fail immediately without executing
      await expect(breaker.execute(fn)).rejects.toThrow(
        CircuitBreakerOpenError
      );
      expect(fn).toHaveBeenCalledTimes(3); // Not called again
    });

    it("should include retry time in error message", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow("fail");
      }

      await expect(breaker.execute(fn)).rejects.toThrow(/Try again after/);
    });
  });

  describe("half-open state", () => {
    it("should transition to half-open after timeout", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow("fail");
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Circuit should be half-open, allowing limited calls
      const successFn = vi.fn().mockResolvedValue("success");
      const result = await breaker.execute(successFn);
      expect(result).toBe("success");

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe("half-open");
    });

    it("should close circuit after successful half-open calls", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow("fail");
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Make successful calls to close the circuit
      const successFn = vi.fn().mockResolvedValue("success");
      await breaker.execute(successFn);
      await breaker.execute(successFn);

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe("closed");
    });

    it("should reopen on failure in half-open state", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow("fail");
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Fail in half-open state
      await expect(breaker.execute(fn)).rejects.toThrow("fail");

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe("open");
    });
  });

  describe("reset", () => {
    it("should reset circuit to closed state", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow("fail");
      }

      expect(breaker.getMetrics().state).toBe("open");

      // Reset
      breaker.reset();

      expect(breaker.getMetrics().state).toBe("closed");
      expect(breaker.getMetrics().failureCount).toBe(0);
    });
  });

  describe("context in errors", () => {
    it("should include context in error message when circuit is open", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      const breaker = new CircuitBreaker({ failureThreshold: 1 });

      // First call fails and opens the circuit
      await expect(breaker.execute(fn, "DataForSEO")).rejects.toThrow("fail");

      // Second call should throw CircuitBreakerOpenError with context
      await expect(breaker.execute(fn, "DataForSEO")).rejects.toThrow(
        /DataForSEO/
      );
    });
  });
});

describe("dataForSEOCircuitBreaker", () => {
  it("should be a singleton instance with default settings", () => {
    expect(dataForSEOCircuitBreaker).toBeInstanceOf(CircuitBreaker);
    const metrics = dataForSEOCircuitBreaker.getMetrics();
    expect(metrics.state).toBe("closed");
  });
});
