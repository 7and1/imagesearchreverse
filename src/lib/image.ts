/**
 * Image type detection and utilities
 *
 * Detects image formats by reading magic bytes (file signatures) from binary data.
 * This is more reliable than relying on file extensions or MIME types from headers.
 */

/** Supported image MIME types */
export type ImageMimeType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

/** File extension mapping for supported image types */
export type ImageExtension = "png" | "jpg" | "gif" | "webp" | "bin";

/**
 * Magic byte signatures for supported image formats.
 * These are the first bytes that identify each file type.
 */
const IMAGE_SIGNATURES = {
  /** PNG: 89 50 4E 47 0D 0A 1A 0A */
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const,
  /** JPEG: FF D8 FF */
  JPEG: [0xff, 0xd8, 0xff] as const,
  /** GIF87a: 47 49 46 38 37 61 */
  GIF87A: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] as const,
  /** GIF89a: 47 49 46 38 39 61 */
  GIF89A: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] as const,
  /** RIFF container: 52 49 46 46 */
  RIFF: [0x52, 0x49, 0x46, 0x46] as const,
  /** WebP identifier at offset 8: 57 45 42 50 */
  WEBP: [0x57, 0x45, 0x42, 0x50] as const,
} as const;

/** Offset where WebP signature appears within RIFF container */
const WEBP_SIGNATURE_OFFSET = 8;

/**
 * Checks if a byte array matches a signature at a given offset.
 *
 * @param bytes - The byte array to check
 * @param signature - The signature bytes to match
 * @param offset - The offset in bytes to start matching (default: 0)
 * @returns True if the signature matches at the given offset
 */
const matchesSignature = (
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0,
): boolean => {
  if (bytes.length < signature.length + offset) return false;
  return signature.every((byte, index) => bytes[index + offset] === byte);
};

/**
 * Detects the image type from raw bytes by checking magic byte signatures.
 *
 * @param bytes - The first bytes of the image file (at least 12 bytes recommended)
 * @returns The MIME type if detected, or null if unknown format
 *
 * @example
 * ```ts
 * const buffer = await file.arrayBuffer();
 * const type = detectImageType(new Uint8Array(buffer));
 * if (type) {
 *   console.log(`Detected: ${type}`);
 * }
 * ```
 */
export const detectImageType = (bytes: Uint8Array): ImageMimeType | null => {
  if (matchesSignature(bytes, IMAGE_SIGNATURES.PNG)) return "image/png";
  if (matchesSignature(bytes, IMAGE_SIGNATURES.JPEG)) return "image/jpeg";
  if (
    matchesSignature(bytes, IMAGE_SIGNATURES.GIF87A) ||
    matchesSignature(bytes, IMAGE_SIGNATURES.GIF89A)
  ) {
    return "image/gif";
  }
  if (
    matchesSignature(bytes, IMAGE_SIGNATURES.RIFF) &&
    matchesSignature(bytes, IMAGE_SIGNATURES.WEBP, WEBP_SIGNATURE_OFFSET)
  ) {
    return "image/webp";
  }
  return null;
};

/**
 * Maps a MIME type to its corresponding file extension.
 *
 * @param mimeType - The MIME type to convert
 * @returns The file extension (without dot), or "bin" for unknown types
 *
 * @example
 * ```ts
 * extensionForType("image/png");  // => "png"
 * extensionForType("image/jpeg"); // => "jpg"
 * extensionForType("unknown");    // => "bin"
 * ```
 */
export const extensionForType = (mimeType: string): ImageExtension => {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
};
