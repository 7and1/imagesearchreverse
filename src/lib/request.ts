/**
 * Request utilities for extracting and validating client information
 *
 * Provides secure IP address extraction with validation to prevent
 * injection attacks and ensure reliable rate limiting.
 */

import type { NextRequest } from "next/server";

/** IPv4 address pattern (e.g., 192.168.1.1) */
const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

/** IPv6 address pattern (allows hex digits, colons, and dots for IPv4-mapped) */
const IPV6_PATTERN = /^[\da-fA-F:.]+$/;

/** Maximum valid value for an IPv4 octet */
const MAX_IPV4_OCTET = 255;

/** Fallback IP for local development */
const LOCALHOST_IP = "127.0.0.1";

/**
 * Validates and sanitizes an IP address string.
 *
 * Prevents IP injection attacks by:
 * - Removing port numbers
 * - Validating IPv4 octet ranges
 * - Checking IPv6 character validity
 *
 * @param ip - The raw IP address string to validate
 * @returns The sanitized IP address, or null if invalid
 */
const validateAndSanitizeIp = (ip: string | null): string | null => {
  if (!ip || ip.trim().length === 0) {
    return null;
  }

  const sanitized = ip.trim();

  // Remove port number if present (IPv4 with :port)
  const withoutPort = sanitized.split(":")[0];

  // Basic IPv4 validation
  if (IPV4_PATTERN.test(withoutPort)) {
    const parts = withoutPort.split(".");
    const valid = parts.every((part) => {
      const num = Number.parseInt(part, 10);
      return num >= 0 && num <= MAX_IPV4_OCTET;
    });
    if (valid) {
      return withoutPort;
    }
  }

  // Basic IPv6 validation (allow valid characters)
  // IPv6 can contain colons, hex digits, and dots (for IPv4-mapped)
  if (IPV6_PATTERN.test(sanitized) && sanitized.includes(":")) {
    return sanitized;
  }

  // If validation fails, return null
  return null;
};

/**
 * Extracts the client IP address from a request with proper validation.
 *
 * Priority order:
 * 1. CF-Connecting-IP (Cloudflare verified, most reliable)
 * 2. X-Forwarded-For (first IP, can be spoofed)
 * 3. Fallback to localhost for local development
 *
 * Security considerations:
 * - Only trusts CF-Connecting-IP from Cloudflare (verified by their edge)
 * - X-Forwarded-For can be spoofed, so it's validated carefully
 * - All IPs are validated to prevent injection attacks
 *
 * @param request - The Next.js request object
 * @returns A validated client IP address
 *
 * @example
 * ```ts
 * const clientIp = getClientIp(request);
 * const rateLimit = await checkRateLimit(kv, clientIp);
 * ```
 */
export const getClientIp = (request: NextRequest): string => {
  // Priority 1: Cloudflare's CF-Connecting-IP header
  // This is the most reliable as Cloudflare verifies it
  const cfIp = request.headers.get("cf-connecting-ip");
  const validatedCfIp = validateAndSanitizeIp(cfIp);
  if (validatedCfIp) {
    return validatedCfIp;
  }

  // Priority 2: X-Forwarded-For (less reliable, can be spoofed)
  // Only use if CF-Connecting-IP is not available
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2, ...
    // The leftmost IP is the original client, but can be spoofed
    const ips = forwarded.split(",");
    const firstIp = ips[0]?.trim();

    const validatedForwardedIp = validateAndSanitizeIp(firstIp);
    if (validatedForwardedIp) {
      return validatedForwardedIp;
    }
  }

  // Fallback: return localhost IP for local development
  // This should only happen in non-production environments
  return LOCALHOST_IP;
};
