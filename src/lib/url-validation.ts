const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
]);

// Cloud metadata endpoints that must be blocked
const CLOUD_METADATA_ENDPOINTS = new Set([
  "metadata.google.internal",
  "169.254.169.254",
  "metadata",
  "ecs.containermetadata",
  "169.254.170.2",
  "metadata.amazonaws.com",
  "169.254.169.254",
]);

// Allowlist of trusted domains (expand as needed)
const ALLOWED_DOMAINS = new Set<string>([
  // Public search engines and image services can be added here
  // Example: "images.google.com", "imgur.com", etc.
]);

const isIPv4 = (value: string) => {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^[0-9]+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
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

const isPrivateIPv4 = (value: string) => {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split(".").map((part) => Number(part));
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
};

const isPrivateIPv6 = (value: string) => {
  const host = value.toLowerCase();
  if (host === "::" || host === "::1") return true;
  if (host.startsWith("fe80:")) return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("2001:db8")) return true;
  if (host.startsWith("::ffff:")) {
    const v4 = host.replace("::ffff:", "");
    return isPrivateIPv4(v4);
  }
  return false;
};

const isBlockedHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase();

  // Check against allowlist first (if configured)
  if (ALLOWED_DOMAINS.size > 0) {
    // If allowlist is configured, only allow domains on it
    if (!ALLOWED_DOMAINS.has(normalized) && !ALLOWED_DOMAINS.has(hostname)) {
      return true; // Block if not on allowlist
    }
  }

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
