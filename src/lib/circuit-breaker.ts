/**
 * Circuit Breaker pattern implementation for fault tolerance
 *
 * Prevents cascading failures when external services are down by
 * temporarily blocking requests after repeated failures.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are blocked
 * - HALF-OPEN: Testing if service has recovered
 */

/**
 * Circuit breaker states
 */
export type CircuitState = "closed" | "open" | "half-open";

/**
 * Configuration options for the circuit breaker
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before attempting recovery (default: 30000) */
  resetTimeoutMs?: number;
  /** Max concurrent requests in half-open state (default: 3) */
  halfOpenMaxCalls?: number;
}

/**
 * Metrics exposed by the circuit breaker for monitoring
 */
export interface CircuitBreakerMetrics {
  /** Current circuit state */
  state: CircuitState;
  /** Failures in current window */
  failureCount: number;
  /** Successes in current window */
  successCount: number;
  /** Timestamp of last failure */
  lastFailureTime?: number;
  /** Timestamp of last success */
  lastSuccessTime?: number;
  /** Total calls since creation */
  totalCalls: number;
  /** Total failures since creation */
  totalFailures: number;
}

/** Default number of failures before opening circuit */
const DEFAULT_FAILURE_THRESHOLD = 5;

/** Default time to wait before attempting recovery (30 seconds) */
const DEFAULT_RESET_TIMEOUT_MS = 30000;

/** Default max calls allowed in half-open state */
const DEFAULT_HALF_OPEN_MAX_CALLS = 3;

/**
 * Circuit Breaker implementation for protecting against cascading failures.
 *
 * @example
 * ```ts
 * const breaker = new CircuitBreaker({ failureThreshold: 3 });
 *
 * try {
 *   const result = await breaker.execute(
 *     () => fetchExternalApi(),
 *     "external-api"
 *   );
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     // Service is temporarily unavailable
 *   }
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalCalls = 0;
  private totalFailures = 0;
  private halfOpenCalls = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxCalls: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.resetTimeoutMs = options.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls ?? DEFAULT_HALF_OPEN_MAX_CALLS;
  }

  /**
   * Executes a function with circuit breaker protection.
   *
   * @param fn - The async function to execute
   * @param context - Optional context for error messages
   * @returns The result of the function
   * @throws CircuitBreakerOpenError if the circuit is open
   * @throws The original error if the function fails
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    this.totalCalls++;

    if (this.state === "open") {
      // Check if we should transition to half-open
      if (Date.now() - (this.lastFailureTime ?? 0) > this.resetTimeoutMs) {
        this.state = "half-open";
        this.halfOpenCalls = 0;
        this.failureCount = 0;
        this.successCount = 0;
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit breaker is open${context ? ` for ${context}` : ""}. ` +
            `Try again after ${this.getRetryAfter()}s`
        );
      }
    }

    if (this.state === "half-open" && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      throw new CircuitBreakerOpenError(
        "Circuit breaker half-open capacity exceeded. Please retry."
      );
    }

    if (this.state === "half-open") {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Returns current circuit breaker metrics for monitoring.
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
    };
  }

  /**
   * Forces the circuit breaker to a specific state.
   * Useful for testing or manual recovery.
   *
   * @param state - The state to set
   */
  forceState(state: CircuitState): void {
    this.state = state;
    if (state === "closed") {
      this.failureCount = 0;
      this.successCount = 0;
      this.halfOpenCalls = 0;
    }
  }

  /**
   * Resets the circuit breaker to closed state.
   */
  reset(): void {
    this.forceState("closed");
  }

  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === "half-open") {
      // If we've had enough successes in half-open, close the circuit
      if (this.successCount >= this.halfOpenMaxCalls) {
        this.state = "closed";
        this.failureCount = 0;
        this.halfOpenCalls = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      // Any failure in half-open goes back to open
      this.state = "open";
    } else if (this.state === "closed" && this.failureCount >= this.failureThreshold) {
      this.state = "open";
    }
  }

  /**
   * Calculates seconds until the circuit breaker can be retried.
   */
  private getRetryAfter(): number {
    const elapsed = Date.now() - (this.lastFailureTime ?? 0);
    const remaining = Math.max(0, this.resetTimeoutMs - elapsed);
    return Math.ceil(remaining / 1000);
  }
}

/**
 * Error thrown when the circuit breaker is open and blocking requests.
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

/**
 * Global circuit breaker instance for DataForSEO API calls.
 * Configured with sensible defaults for external API protection.
 */
export const dataForSEOCircuitBreaker = new CircuitBreaker({
  failureThreshold: DEFAULT_FAILURE_THRESHOLD,
  resetTimeoutMs: DEFAULT_RESET_TIMEOUT_MS,
  halfOpenMaxCalls: DEFAULT_HALF_OPEN_MAX_CALLS,
});
