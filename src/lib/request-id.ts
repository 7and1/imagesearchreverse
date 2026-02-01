/**
 * Request ID generation utilities
 *
 * Generates unique identifiers for request tracking and correlation
 * across distributed systems and log aggregation.
 */

/**
 * Converts a byte array to a hexadecimal string.
 *
 * @param bytes - The byte array to convert
 * @returns A lowercase hexadecimal string
 */
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * Formats a byte array as a UUID string.
 *
 * @param bytes - A 16-byte array
 * @returns A UUID string in format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const uuidFromBytes = (bytes: Uint8Array): string => {
  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Creates a unique request ID for tracking purposes.
 *
 * Uses the most secure method available in the current environment:
 * 1. crypto.randomUUID() - Native UUID v4 generation (preferred)
 * 2. crypto.getRandomValues() - Manual UUID v4 construction
 * 3. Timestamp + random fallback for environments without crypto
 *
 * @returns A unique identifier string (UUID format when possible)
 *
 * @example
 * ```ts
 * const requestId = createRequestId();
 * // => "550e8400-e29b-41d4-a716-446655440000"
 *
 * // Use in request headers
 * headers.set("x-request-id", requestId);
 * ```
 */
export const createRequestId = (): string => {
  if (typeof crypto !== "undefined") {
    // Preferred: Native UUID generation
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    // Fallback: Manual UUID v4 construction
    if (typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // RFC 4122 version 4: Set version (4) and variant (10xx) bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      return uuidFromBytes(bytes);
    }
  }

  // Last resort: Timestamp-based ID for environments without crypto
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
