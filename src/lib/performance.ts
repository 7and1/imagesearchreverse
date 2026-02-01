/**
 * Performance monitoring module
 *
 * Tracks Web Vitals (LCP, FID, CLS, TTFB, INP) and custom performance marks.
 * Integrates with the logger for consistent reporting.
 */

import { createLogger, type LogContext } from "./logger";

const logger = createLogger("performance");

/**
 * Web Vitals metric types
 */
export type WebVitalName = "LCP" | "FID" | "CLS" | "TTFB" | "INP" | "FCP";

/**
 * Web Vital metric data
 */
export type WebVitalMetric = {
  name: WebVitalName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType: string;
};

/**
 * Custom performance mark
 */
export type PerformanceMark = {
  name: string;
  startTime: number;
  duration?: number;
  metadata?: LogContext;
};

/**
 * Thresholds for Web Vitals ratings (in milliseconds, except CLS which is unitless)
 * Based on Google's Core Web Vitals thresholds
 */
const WEB_VITAL_THRESHOLDS: Record<WebVitalName, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint
  FID: { good: 100, poor: 300 },         // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },        // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 },       // Time to First Byte
  INP: { good: 200, poor: 500 },         // Interaction to Next Paint
  FCP: { good: 1800, poor: 3000 },       // First Contentful Paint
};

/**
 * Get rating for a Web Vital metric
 */
export const getWebVitalRating = (
  name: WebVitalName,
  value: number
): "good" | "needs-improvement" | "poor" => {
  const thresholds = WEB_VITAL_THRESHOLDS[name];
  if (value <= thresholds.good) return "good";
  if (value <= thresholds.poor) return "needs-improvement";
  return "poor";
};

/**
 * Performance observer for tracking Web Vitals
 * Only runs in browser environment
 */
export class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();
  private metrics: WebVitalMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private onMetric?: (metric: WebVitalMetric) => void;

  constructor(options?: { onMetric?: (metric: WebVitalMetric) => void }) {
    this.onMetric = options?.onMetric;
  }

  /**
   * Initialize performance monitoring
   * Should be called once on app mount
   */
  init(): void {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
      return;
    }

    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeTTFB();
    this.observeINP();
    this.observeFCP();

    logger.info("Performance monitoring initialized");
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (lastEntry) {
          this.reportMetric("LCP", lastEntry.startTime);
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      this.observers.push(observer);
    } catch {
      // LCP not supported
    }
  }

  /**
   * Observe First Input Delay
   */
  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as PerformanceEventTiming;
        if (firstEntry) {
          this.reportMetric("FID", firstEntry.processingStart - firstEntry.startTime);
        }
      });
      observer.observe({ type: "first-input", buffered: true });
      this.observers.push(observer);
    } catch {
      // FID not supported
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS(): void {
    try {
      let clsValue = 0;
      let sessionValue = 0;
      let sessionEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[]) {
          // Only count layout shifts without recent user input
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0] as PerformanceEntry | undefined;
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1] as PerformanceEntry | undefined;

            // If the entry occurred less than 1 second after the previous entry
            // and less than 5 seconds after the first entry in the session,
            // include the entry in the current session
            if (
              sessionValue &&
              entry.startTime - (lastSessionEntry?.startTime ?? 0) < 1000 &&
              entry.startTime - (firstSessionEntry?.startTime ?? 0) < 5000
            ) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            // Update CLS if the current session value is larger
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              this.reportMetric("CLS", clsValue);
            }
          }
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
      this.observers.push(observer);
    } catch {
      // CLS not supported
    }
  }

  /**
   * Observe Time to First Byte
   */
  private observeTTFB(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const navigationEntry = entries[0] as PerformanceNavigationTiming;
        if (navigationEntry) {
          this.reportMetric("TTFB", navigationEntry.responseStart - navigationEntry.requestStart);
        }
      });
      observer.observe({ type: "navigation", buffered: true });
      this.observers.push(observer);
    } catch {
      // TTFB not supported
    }
  }

  /**
   * Observe Interaction to Next Paint
   */
  private observeINP(): void {
    try {
      let maxINP = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEventTiming[]) {
          // INP is the longest interaction duration
          if (entry.duration > maxINP) {
            maxINP = entry.duration;
            this.reportMetric("INP", maxINP);
          }
        }
      });
      observer.observe({ type: "event", buffered: true });
      this.observers.push(observer);
    } catch {
      // INP not supported
    }
  }

  /**
   * Observe First Contentful Paint
   */
  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find((e) => e.name === "first-contentful-paint");
        if (fcpEntry) {
          this.reportMetric("FCP", fcpEntry.startTime);
        }
      });
      observer.observe({ type: "paint", buffered: true });
      this.observers.push(observer);
    } catch {
      // FCP not supported
    }
  }

  /**
   * Report a Web Vital metric
   */
  private reportMetric(name: WebVitalName, value: number): void {
    const rating = getWebVitalRating(name, value);
    const metric: WebVitalMetric = {
      name,
      value: Math.round(name === "CLS" ? value * 1000 : value) / (name === "CLS" ? 1000 : 1),
      rating,
      delta: value,
      id: `${name}-${Date.now()}`,
      navigationType: this.getNavigationType(),
    };

    this.metrics.push(metric);

    logger.info(`Web Vital: ${name}`, {
      value: metric.value,
      rating,
      unit: name === "CLS" ? "score" : "ms",
    });

    this.onMetric?.(metric);
  }

  /**
   * Get navigation type
   */
  private getNavigationType(): string {
    if (typeof window === "undefined") return "unknown";
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type ?? "unknown";
  }

  /**
   * Start a custom performance mark
   */
  mark(name: string, metadata?: LogContext): void {
    if (typeof performance === "undefined") return;

    const startTime = performance.now();
    this.marks.set(name, { name, startTime, metadata });

    try {
      performance.mark(`${name}-start`);
    } catch {
      // Mark not supported
    }
  }

  /**
   * End a custom performance mark and log duration
   */
  measure(name: string, additionalMetadata?: LogContext): number | null {
    if (typeof performance === "undefined") return null;

    const mark = this.marks.get(name);
    if (!mark) {
      logger.warn(`Performance mark "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - mark.startTime;

    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    } catch {
      // Measure not supported
    }

    logger.info(`Performance: ${name}`, {
      durationMs: Math.round(duration * 100) / 100,
      ...mark.metadata,
      ...additionalMetadata,
    });

    this.marks.delete(name);
    return duration;
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): WebVitalMetric[] {
    return [...this.metrics];
  }

  /**
   * Get a summary of all Web Vitals
   */
  getSummary(): Record<WebVitalName, WebVitalMetric | null> {
    const summary: Record<WebVitalName, WebVitalMetric | null> = {
      LCP: null,
      FID: null,
      CLS: null,
      TTFB: null,
      INP: null,
      FCP: null,
    };

    // Get the latest metric for each type
    for (const metric of this.metrics) {
      summary[metric.name] = metric;
    }

    return summary;
  }

  /**
   * Cleanup observers
   */
  disconnect(): void {
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
    this.marks.clear();
    this.metrics = [];
  }
}

/**
 * Singleton performance monitor instance
 */
let monitor: PerformanceMonitor | null = null;

/**
 * Get or create the performance monitor singleton
 */
export const getPerformanceMonitor = (
  options?: { onMetric?: (metric: WebVitalMetric) => void }
): PerformanceMonitor => {
  if (!monitor) {
    monitor = new PerformanceMonitor(options);
  }
  return monitor;
};

/**
 * Initialize performance monitoring (call once on app mount)
 */
export const initPerformanceMonitoring = (
  options?: { onMetric?: (metric: WebVitalMetric) => void }
): void => {
  const perf = getPerformanceMonitor(options);
  perf.init();
};

/**
 * Convenience function to mark performance
 */
export const perfMark = (name: string, metadata?: LogContext): void => {
  getPerformanceMonitor().mark(name, metadata);
};

/**
 * Convenience function to measure performance
 */
export const perfMeasure = (name: string, metadata?: LogContext): number | null => {
  return getPerformanceMonitor().measure(name, metadata);
};

/**
 * Higher-order function to measure async function performance
 */
export const withPerformance = <T extends unknown[], R>(
  name: string,
  fn: (...args: T) => Promise<R>,
  metadata?: LogContext
): ((...args: T) => Promise<R>) => {
  return async (...args: T): Promise<R> => {
    perfMark(name, metadata);
    try {
      const result = await fn(...args);
      perfMeasure(name, { success: true });
      return result;
    } catch (error) {
      perfMeasure(name, { success: false, error: String(error) });
      throw error;
    }
  };
};
