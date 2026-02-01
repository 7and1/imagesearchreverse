/**
 * CSP Violation Report Endpoint
 *
 * Receives Content Security Policy violation reports from browsers.
 * Reports are logged for security monitoring and analysis.
 *
 * Note: In production, consider forwarding to a logging service
 * (e.g., Sentry, Datadog, or custom analytics).
 */

export const runtime = "edge";

// Rate limit CSP reports to prevent abuse
const MAX_REPORT_SIZE = 10 * 1024; // 10KB max report size

interface CSPViolationReport {
  "csp-report"?: {
    "document-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "original-policy"?: string;
    "blocked-uri"?: string;
    "status-code"?: number;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    // Check content length
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_REPORT_SIZE) {
      return new Response(null, { status: 413 });
    }

    // Parse the CSP report
    const report: CSPViolationReport = await request.json();
    const violation = report["csp-report"];

    if (violation) {
      // Log sanitized violation data (no sensitive info)
      console.log("[CSP Violation]", {
        documentUri: sanitizeUri(violation["document-uri"]),
        violatedDirective: violation["violated-directive"],
        effectiveDirective: violation["effective-directive"],
        blockedUri: sanitizeUri(violation["blocked-uri"]),
        sourceFile: sanitizeUri(violation["source-file"]),
        lineNumber: violation["line-number"],
      });
    }

    // Return 204 No Content (standard for report endpoints)
    return new Response(null, { status: 204 });
  } catch {
    // Silently accept malformed reports
    return new Response(null, { status: 204 });
  }
}

/**
 * Sanitize URI to remove potential sensitive data
 */
function sanitizeUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;

  try {
    const url = new URL(uri);
    // Remove query params and hash which may contain sensitive data
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    // If not a valid URL, return truncated version
    return uri.substring(0, 100);
  }
}
