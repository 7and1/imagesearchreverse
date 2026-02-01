import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

/**
 * Content Security Policy Configuration
 *
 * Security Notes:
 * - 'unsafe-inline' in style-src: Required for Next.js styled-jsx and inline styles.
 *   Removing would require nonce-based CSP which is complex with edge runtime.
 * - 'unsafe-inline' in script-src: Required for Next.js hydration and inline scripts.
 *   Next.js doesn't support strict CSP without custom server configuration.
 *
 * Mitigations:
 * - frame-ancestors 'none' prevents clickjacking
 * - object-src 'none' blocks plugins
 * - base-uri 'self' prevents base tag injection
 * - form-action 'self' prevents form hijacking
 * - Strict connect-src limits fetch destinations
 *
 * TODO: Consider nonce-based CSP when Next.js edge runtime supports it better
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  // unsafe-inline required for Next.js - see security notes above
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // unsafe-inline required for Next.js hydration - see security notes above
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  // Report CSP violations for monitoring
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
].join("; ");

// CSP Reporting API configuration (Reporting-Endpoints header)
const reportingEndpoints = "csp-endpoint=\"/api/csp-report\"";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
    formats: ["image/webp", "image/avif"],
  },
  compress: true,
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Reporting-Endpoints", value: reportingEndpoints },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          // Compression hints for Cloudflare - indicate content is compressible
          { key: "Vary", value: "Accept-Encoding" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex" },
          // API responses are JSON - highly compressible
          { key: "Vary", value: "Accept-Encoding" },
        ],
      },
      {
        source: "/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Optimize font caching
      {
        source: "/:path*.woff2",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Content-Type", value: "font/woff2" },
        ],
      },
      // Optimize JS/CSS caching with compression hints
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Vary", value: "Accept-Encoding" },
        ],
      },
    ];
  },
};

const config = async () => {
  if (process.env.NODE_ENV === "development") {
    await setupDevPlatform();
  }
  return nextConfig;
};

export default config;
