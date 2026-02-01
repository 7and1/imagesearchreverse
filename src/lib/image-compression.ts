/**
 * Image compression utilities for client-side optimization
 *
 * Reduces upload size and improves performance by resizing and
 * compressing images before uploading to the server.
 */

/** Default maximum width for compressed images */
const DEFAULT_MAX_WIDTH = 2048;

/** Default maximum height for compressed images */
const DEFAULT_MAX_HEIGHT = 2048;

/** Default compression quality (0-1) */
const DEFAULT_QUALITY = 0.85;

/** Default output format for compressed images */
const DEFAULT_FORMAT: CompressedImageFormat = "image/webp";

/** Default blur placeholder dimensions */
const DEFAULT_BLUR_WIDTH = 10;
const DEFAULT_BLUR_HEIGHT = 10;

/** Blur placeholder quality */
const BLUR_QUALITY = 0.5;

/** Blur filter radius in pixels */
const BLUR_RADIUS = 2;

/** Supported output formats for compression */
export type CompressedImageFormat = "image/jpeg" | "image/webp";

/**
 * Options for image compression
 */
export interface CompressImageOptions {
  /** Maximum width in pixels (default: 2048) */
  maxWidth?: number;
  /** Maximum height in pixels (default: 2048) */
  maxHeight?: number;
  /** Compression quality 0-1 (default: 0.85) */
  quality?: number;
  /** Output format (default: "image/webp") */
  format?: CompressedImageFormat;
}

/**
 * Compresses an image file before upload.
 *
 * Resizes the image to fit within the specified dimensions while
 * maintaining aspect ratio, then compresses using the specified format.
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns A promise that resolves to the compressed image blob
 * @throws Error if canvas context cannot be obtained or compression fails
 *
 * @example
 * ```ts
 * const compressed = await compressImage(file, {
 *   maxWidth: 1920,
 *   quality: 0.8,
 *   format: "image/webp"
 * });
 * // Upload compressed blob instead of original file
 * ```
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<Blob> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    format = DEFAULT_FORMAT,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Create canvas and compress
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Generates a small blur placeholder for progressive image loading.
 *
 * Creates a tiny, blurred version of the image that can be displayed
 * while the full image loads, providing a better user experience.
 *
 * @param file - The image file to generate a placeholder for
 * @param width - Placeholder width in pixels (default: 10)
 * @param height - Placeholder height in pixels (default: 10)
 * @returns A promise that resolves to a base64 data URL
 *
 * @example
 * ```ts
 * const placeholder = await generateBlurPlaceholder(file);
 * // Use as background while loading
 * <img style={{ backgroundImage: `url(${placeholder})` }} />
 * ```
 */
export async function generateBlurPlaceholder(
  file: File,
  width: number = DEFAULT_BLUR_WIDTH,
  height: number = DEFAULT_BLUR_HEIGHT
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Draw scaled down and apply blur
      ctx.drawImage(img, 0, 0, width, height);
      ctx.filter = `blur(${BLUR_RADIUS}px)`;
      ctx.drawImage(canvas, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", BLUR_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Image dimensions
 */
export interface ImageDimensions {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Gets the dimensions of an image file.
 *
 * @param file - The image file to measure
 * @returns A promise that resolves to the image dimensions
 *
 * @example
 * ```ts
 * const { width, height } = await getImageDimensions(file);
 * console.log(`Image is ${width}x${height}`);
 * ```
 */
export function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/** Size unit labels for formatting */
const SIZE_UNITS = ["B", "KB", "MB"] as const;

/** Bytes per kilobyte */
const BYTES_PER_KB = 1024;

/**
 * Formats a byte count as a human-readable string.
 *
 * @param bytes - The number of bytes
 * @returns A formatted string like "1.5 MB"
 *
 * @example
 * ```ts
 * formatFileSize(1536);    // => "1.5 KB"
 * formatFileSize(1048576); // => "1 MB"
 * formatFileSize(0);       // => "0 B"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KB));
  const size = parseFloat((bytes / Math.pow(BYTES_PER_KB, i)).toFixed(1));
  return `${size} ${SIZE_UNITS[i]}`;
}
