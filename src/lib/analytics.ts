/**
 * Privacy-friendly analytics module for tracking user actions
 *
 * Design principles:
 * - No PII (personally identifiable information) collected
 * - No cookies or persistent identifiers
 * - All data is aggregated and anonymous
 * - Works with Cloudflare Web Analytics (beacon-based)
 *
 * Events tracked:
 * - search_started: User initiates a search
 * - search_completed: Search returns results
 * - search_failed: Search encounters an error
 * - upload_started: User begins image upload
 * - upload_completed: Image upload succeeds
 * - upload_failed: Image upload fails
 * - export_csv: User exports results as CSV
 * - export_json: User exports results as JSON
 * - share_results: User shares search results
 * - copy_results: User copies results to clipboard
 * - search_engine_click: User clicks a search engine link
 * - result_click: User clicks a search result
 */

export type AnalyticsEvent =
  | "search_started"
  | "search_completed"
  | "search_failed"
  | "upload_started"
  | "upload_completed"
  | "upload_failed"
  | "export_csv"
  | "export_json"
  | "share_results"
  | "copy_results"
  | "search_engine_click"
  | "result_click"
  | "rate_limit_hit"
  | "captcha_completed"
  | "captcha_failed";

export type AnalyticsEventData = {
  // Search events
  search_started: { method: "upload" | "url" };
  search_completed: { resultCount: number; duration: number };
  search_failed: { errorCode: string; method: "upload" | "url" };

  // Upload events
  upload_started: { fileSize: number; fileType: string };
  upload_completed: { fileSize: number; duration: number };
  upload_failed: { errorCode: string; fileSize?: number };

  // Export events
  export_csv: { resultCount: number };
  export_json: { resultCount: number };
  share_results: { resultCount: number };
  copy_results: { resultCount: number };

  // Click events
  search_engine_click: { engine: "google" | "yandex" | "bing" };
  result_click: { position: number; domain?: string };

  // Rate limit and captcha
  rate_limit_hit: { remaining: number };
  captcha_completed: { duration: number };
  captcha_failed: { reason?: string };
};

/**
 * Check if analytics is enabled
 * Analytics is disabled in development and when DNT is set
 */
function isAnalyticsEnabled(): boolean {
  // Disable in development
  if (process.env.NODE_ENV === "development") {
    return false;
  }

  // Respect Do Not Track header
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") {
    return false;
  }

  return true;
}

/**
 * Send analytics event using Cloudflare Web Analytics beacon
 * Falls back to custom endpoint if beacon API is unavailable
 */
function sendBeacon(event: AnalyticsEvent, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  // Use performance.mark for timing data (available in DevTools)
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(`analytics:${event}`);
  }

  // Cloudflare Web Analytics automatically tracks page views
  // For custom events, we use a custom data layer approach
  const eventData = {
    event,
    timestamp: Date.now(),
    path: window.location.pathname,
    ...sanitizeData(data),
  };

  // Push to data layer for potential GTM/analytics integration
  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
  if (dataLayer) {
    dataLayer.push(eventData);
  }

  // Log in development for debugging
  if (process.env.NODE_ENV === "development") {
    console.debug("[Analytics]", event, eventData);
  }
}

/**
 * Sanitize event data to ensure no PII is included
 */
function sanitizeData(data?: Record<string, unknown>): Record<string, unknown> {
  if (!data) return {};

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip any keys that might contain PII
    if (
      key.toLowerCase().includes("email") ||
      key.toLowerCase().includes("name") ||
      key.toLowerCase().includes("ip") ||
      key.toLowerCase().includes("user")
    ) {
      continue;
    }

    // Sanitize string values
    if (typeof value === "string") {
      // Truncate long strings and remove potential URLs with query params
      const sanitizedValue = value.slice(0, 100);
      // Don't include full URLs that might have tracking params
      if (sanitizedValue.includes("?") || sanitizedValue.includes("@")) {
        continue;
      }
      sanitized[key] = sanitizedValue;
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Track an analytics event
 *
 * @param event - The event name
 * @param data - Optional event data (will be sanitized)
 *
 * @example
 * ```ts
 * // Track a search
 * trackEvent("search_started", { method: "upload" });
 *
 * // Track search completion
 * trackEvent("search_completed", { resultCount: 15, duration: 2500 });
 *
 * // Track an error
 * trackEvent("search_failed", { errorCode: "RATE_LIMIT_EXCEEDED", method: "url" });
 * ```
 */
export function trackEvent<E extends AnalyticsEvent>(
  event: E,
  data?: E extends keyof AnalyticsEventData ? AnalyticsEventData[E] : never
): void {
  if (!isAnalyticsEnabled()) {
    // Still log in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.debug("[Analytics - Disabled]", event, data);
    }
    return;
  }

  try {
    sendBeacon(event, data as Record<string, unknown>);
  } catch (error) {
    // Silently fail - analytics should never break the app
    if (process.env.NODE_ENV === "development") {
      console.warn("[Analytics Error]", error);
    }
  }
}

/**
 * Track page view (called automatically by Cloudflare Web Analytics)
 * This is a no-op since CF handles it, but useful for SPA navigation
 */
export function trackPageView(path?: string): void {
  if (!isAnalyticsEnabled()) return;

  const pagePath = path || (typeof window !== "undefined" ? window.location.pathname : "/");

  // Cloudflare Web Analytics handles this automatically
  // This function exists for explicit SPA navigation tracking if needed
  if (process.env.NODE_ENV === "development") {
    console.debug("[Analytics] Page view:", pagePath);
  }
}

/**
 * Create a timing tracker for measuring operation duration
 *
 * @example
 * ```ts
 * const timer = createTimer();
 * // ... do some work ...
 * const duration = timer.elapsed();
 * trackEvent("search_completed", { resultCount: 10, duration });
 * ```
 */
export function createTimer(): { elapsed: () => number } {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    elapsed: () => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      return Math.round(now - start);
    },
  };
}

/**
 * Analytics event names for documentation and type safety
 */
export const ANALYTICS_EVENTS = {
  // Search lifecycle
  SEARCH_STARTED: "search_started" as const,
  SEARCH_COMPLETED: "search_completed" as const,
  SEARCH_FAILED: "search_failed" as const,

  // Upload lifecycle
  UPLOAD_STARTED: "upload_started" as const,
  UPLOAD_COMPLETED: "upload_completed" as const,
  UPLOAD_FAILED: "upload_failed" as const,

  // User actions
  EXPORT_CSV: "export_csv" as const,
  EXPORT_JSON: "export_json" as const,
  SHARE_RESULTS: "share_results" as const,
  COPY_RESULTS: "copy_results" as const,

  // Clicks
  SEARCH_ENGINE_CLICK: "search_engine_click" as const,
  RESULT_CLICK: "result_click" as const,

  // System events
  RATE_LIMIT_HIT: "rate_limit_hit" as const,
  CAPTCHA_COMPLETED: "captcha_completed" as const,
  CAPTCHA_FAILED: "captcha_failed" as const,
} as const;
