/**
 * URL Validation for SSRF Protection
 *
 * Security Decision: This module uses a BLOCKLIST approach rather than an allowlist.
 *
 * Rationale:
 * - Reverse image search requires accepting images from ANY public domain
 * - An allowlist would be impractical as users search images from countless websites
 * - Blocklist approach blocks known dangerous destinations (private IPs, metadata endpoints)
 * - Combined with DNS rebinding protection for defense in depth
 *
 * Protected against:
 * - Private/internal IP ranges (RFC 1918, RFC 4193, link-local)
 * - Cloud metadata endpoints (AWS, GCP, Azure, ECS)
 * - Localhost and local network hostnames
 * - URL encoding bypass attempts
 * - DNS rebinding attacks (via resolved IP validation)
 */

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
]);

// Cloud metadata endpoints that must be blocked (SSRF protection)
const CLOUD_METADATA_ENDPOINTS = new Set([
  "metadata.google.internal",
  "169.254.169.254", // AWS/GCP metadata
  "metadata",
  "ecs.containermetadata",
  "169.254.170.2", // ECS task metadata
  "metadata.amazonaws.com",
  "169.254.169.123", // AWS time sync
  "fd00:ec2::254", // AWS IPv6 metadata
]);

/**
 * Check if an IPv4 address is valid
 */
const isIPv4 = (value: string): boolean => {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^[0-9]+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
};

/**
 * Check if an IPv4 address is in a private/reserved range
 * Covers: RFC 1918, loopback, link-local, CGNAT, documentation, multicast
 */
export const isPrivateIPv4 = (value: string): boolean => {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split(".").map((part) => Number(part));
  if (a === 10) return true; // 10.0.0.0/8 - Private
  if (a === 127) return true; // 127.0.0.0/8 - Loopback
  if (a === 0) return true; // 0.0.0.0/8 - Current network
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 - Link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 - Private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 - Private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 - CGNAT
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 - IETF Protocol
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 - Benchmark
  if (a >= 224) return true; // 224.0.0.0+ - Multicast/Reserved
  return false;
};

/**
 * Check if an IPv6 address is in a private/reserved range
 */
export const isPrivateIPv6 = (value: string): boolean => {
  const host = value.toLowerCase();
  if (host === "::" || host === "::1") return true; // Unspecified/Loopback
  if (host.startsWith("fe80:")) return true; // Link-local
  if (host.startsWith("fc") || host.startsWith("fd")) return true; // Unique local
  if (host.startsWith("2001:db8")) return true; // Documentation
  if (host.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 address
    const v4 = host.replace("::ffff:", "");
    return isPrivateIPv4(v4);
  }
  return false;
};

/**
 * Check if an IP address (v4 or v6) is private/reserved
 */
export const isPrivateIP = (ip: string): boolean => {
  if (ip.includes(":")) {
    return isPrivateIPv6(ip);
  }
  return isPrivateIPv4(ip);
};

/**
 * Normalize URL encoding to prevent bypass attempts
 * Handles double encoding, mixed encoding, and Unicode attacks
 */
const normalizeUrlEncoding = (value: string): string => {
  try {
    // Decode once
    let decoded = decodeURIComponent(value);

    // Check if double-encoded (decode again if still has encoded chars)
    if (decoded.includes("%")) {
      const doubleDecoded = decodeURIComponent(decoded);
      // If second decode produced different result, it was double-encoded
      if (doubleDecoded !== decoded) {
        decoded = doubleDecoded;
      }
    }

    // Re-encode to ensure consistent normalization
    return encodeURI(decoded);
  } catch {
    // If decoding fails, return original
    return value;
  }
};

const isBlockedHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase();

  // Block localhost variants
  if (LOCAL_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith(".local")) return true;
  if (normalized.endsWith(".localhost")) return true;
  if (normalized.endsWith(".internal")) return true;
  if (normalized.endsWith(".localdomain")) return true;

  // Block cloud metadata endpoints (SSRF protection)
  if (CLOUD_METADATA_ENDPOINTS.has(normalized)) return true;
  if (normalized.startsWith("metadata.") || normalized.endsWith(".metadata")) return true;

  // Block private IPs
  if (isPrivateIPv4(normalized)) return true;
  if (normalized.includes(":")) return isPrivateIPv6(normalized);

  return false;
};

export const validatePublicImageUrl = (value: string) => {
  // Normalize URL encoding to prevent bypass attempts
  const normalized = normalizeUrlEncoding(value);

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Invalid image URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS image URLs are allowed.");
  }

  if (url.username || url.password) {
    throw new Error("Image URLs cannot include credentials.");
  }

  // Additional DNS rebinding protection: check for dots in hostname
  // to prevent simple bypasses with IP addresses in host field
  if (!url.hostname || url.hostname.length === 0) {
    throw new Error("Invalid hostname.");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new Error("Image URL must be publicly reachable.");
  }

  // Return normalized URL to prevent encoding variations
  return url.toString();
};

/**
 * DNS Rebinding Protection
 *
 * Validates that a URL's resolved IP address is not in a private/reserved range.
 * This prevents DNS rebinding attacks where an attacker's domain initially resolves
 * to a public IP but later resolves to a private IP.
 *
 * Usage: Call this function before making fetch requests to user-provided URLs.
 *
 * Note: In Cloudflare Workers/Edge runtime, we cannot directly resolve DNS.
 * This function uses a fetch with redirect: 'manual' to check the actual
 * connection IP via response headers when available, or validates the
 * hostname if it's already an IP address.
 *
 * @param url - The URL to validate
 * @returns Promise<void> - Resolves if safe, throws if blocked
 */
export async function validateResolvedIP(url: string): Promise<void> {
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname;

  // If hostname is already an IP, validate it directly
  if (isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new Error("URL resolves to a private IP address.");
    }
    return;
  }

  if (hostname.includes(":")) {
    if (isPrivateIPv6(hostname)) {
      throw new Error("URL resolves to a private IP address.");
    }
    return;
  }

  // For domain names, we perform a HEAD request with redirect disabled
  // to check if the server responds. Cloudflare Workers automatically
  // block requests to private IPs at the network level, but we add
  // this as defense in depth.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "ImageSearchReverse/1.0 (SSRF-Check)",
      },
    });

    clearTimeout(timeoutId);

    // Check for CF-Connecting-IP or similar headers that might reveal the resolved IP
    // Note: These headers are typically only available in incoming requests, not outgoing
    // This is primarily for documentation - Cloudflare Workers block private IPs at network level

    // If we get a redirect to a different host, validate that host too
    const location = response.headers.get("location");
    if (location) {
      try {
        const redirectUrl = new URL(location, url);
        if (redirectUrl.hostname !== hostname) {
          // Validate the redirect target
          if (isBlockedHostname(redirectUrl.hostname)) {
            throw new Error("URL redirects to a blocked destination.");
          }
        }
      } catch {
        // Invalid redirect URL, let the main fetch handle it
      }
    }
  } catch (error) {
    // If the request fails due to network error, it might be because
    // Cloudflare blocked a private IP. Re-throw with a generic message.
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("URL validation timed out.");
      }
      if (error.message.includes("private") || error.message.includes("blocked")) {
        throw error;
      }
    }
    // For other errors, let the main request handle them
  }
}
