const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const GIF87A_SIGNATURE = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89A_SIGNATURE = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];

const matchesSignature = (
  bytes: Uint8Array,
  signature: number[],
  offset = 0,
) => {
  if (bytes.length < signature.length + offset) return false;
  return signature.every((byte, index) => bytes[index + offset] === byte);
};

export const detectImageType = (bytes: Uint8Array): string | null => {
  if (matchesSignature(bytes, PNG_SIGNATURE)) return "image/png";
  if (matchesSignature(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (
    matchesSignature(bytes, GIF87A_SIGNATURE) ||
    matchesSignature(bytes, GIF89A_SIGNATURE)
  ) {
    return "image/gif";
  }
  if (
    matchesSignature(bytes, RIFF_SIGNATURE) &&
    matchesSignature(bytes, WEBP_SIGNATURE, 8)
  ) {
    return "image/webp";
  }
  return null;
};

export const extensionForType = (mimeType: string) => {
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
