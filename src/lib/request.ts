import type { NextRequest } from "next/server";

/**
 * Validate and sanitize IP address
 * Prevents IP injection attacks and malformed IPs
 */
const validateAndSanitizeIp = (ip: string | null): string | null => {
  if (!ip || ip.trim().length === 0) {
    return null;
  }

  const sanitized = ip.trim();

  // Remove port number if present (IPv4 with :port)
  const withoutPort = sanitized.split(":")[0];

  // Basic IPv4 validation (simplified)
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(withoutPort)) {
    const parts = withoutPort.split(".");
    const valid = parts.every((part) => {
      const num = Number.parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
    if (valid) {
      return withoutPort;
    }
  }

  // Basic IPv6 validation (allow valid characters)
  // IPv6 can contain colons, hex digits, and dots (for IPv4-mapped)
  const ipv6Pattern = /^[\da-fA-F:.]+$/;
  if (ipv6Pattern.test(sanitized) && sanitized.includes(":")) {
    return sanitized;
  }

  // If validation fails, return null
  return null;
};

/**
 * Get client IP from request with proper validation
 *
 * Security considerations:
 * 1. Only trust CF-Connecting-IP from Cloudflare (it's verified)
 * 2. X-Forwarded-For can be spoofed, so validate it carefully
 * 3. Validate IP format to prevent injection attacks
 * 4. Remove port numbers and sanitize input
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
  return "127.0.0.1";
};
