import { describe, expect, it } from "vitest";
import { detectImageType, extensionForType } from "@/lib/image";

describe("detectImageType", () => {
  describe("PNG detection", () => {
    it("detects PNG from signature", () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      expect(detectImageType(pngBytes)).toBe("image/png");
    });

    it("detects PNG with additional data", () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02,
      ]);
      expect(detectImageType(pngBytes)).toBe("image/png");
    });
  });

  describe("JPEG detection", () => {
    it("detects JPEG from signature", () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff]);
      expect(detectImageType(jpegBytes)).toBe("image/jpeg");
    });

    it("detects JPEG with additional data", () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectImageType(jpegBytes)).toBe("image/jpeg");
    });
  });

  describe("GIF detection", () => {
    it("detects GIF87a from signature", () => {
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
      expect(detectImageType(gifBytes)).toBe("image/gif");
    });

    it("detects GIF89a from signature", () => {
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(detectImageType(gifBytes)).toBe("image/gif");
    });

    it("detects GIF with additional data", () => {
      const gifBytes = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x01,
      ]);
      expect(detectImageType(gifBytes)).toBe("image/gif");
    });
  });

  describe("WebP detection", () => {
    it("detects WebP from signature", () => {
      const webpBytes = new Uint8Array([
        0x52,
        0x49,
        0x46,
        0x46, // RIFF
        0x00,
        0x00,
        0x00,
        0x00, // chunk size
        0x57,
        0x45,
        0x42,
        0x50, // WEBP
      ]);
      expect(detectImageType(webpBytes)).toBe("image/webp");
    });

    it("detects WebP with actual chunk size", () => {
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x1c, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detectImageType(webpBytes)).toBe("image/webp");
    });
  });

  describe("Edge cases", () => {
    it("returns null for empty array", () => {
      const emptyBytes = new Uint8Array([]);
      expect(detectImageType(emptyBytes)).toBeNull();
    });

    it("returns null for unknown format", () => {
      const unknownBytes = new Uint8Array([0x00, 0x01, 0x02]);
      expect(detectImageType(unknownBytes)).toBeNull();
    });

    it("returns null for partial signature", () => {
      const partialBytes = new Uint8Array([0x89, 0x50]);
      expect(detectImageType(partialBytes)).toBeNull();
    });

    it("returns null when array is shorter than signature", () => {
      const shortBytes = new Uint8Array([0xff, 0xd8]);
      expect(detectImageType(shortBytes)).toBeNull();
    });

    it("returns null for RIFF without WEBP", () => {
      const riffBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      expect(detectImageType(riffBytes)).toBeNull();
    });

    it("returns null when RIFF array is too short for WEBP check", () => {
      const riffBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      ]);
      expect(detectImageType(riffBytes)).toBeNull();
    });
  });

  describe("Priority order", () => {
    it("prioritizes PNG over other formats", () => {
      // PNG signature is unique, so no overlap possible
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      expect(detectImageType(pngBytes)).toBe("image/png");
    });

    it("detects JPEG when signature matches", () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff]);
      expect(detectImageType(jpegBytes)).toBe("image/jpeg");
    });
  });
});

describe("extensionForType", () => {
  it("returns 'png' for image/png", () => {
    expect(extensionForType("image/png")).toBe("png");
  });

  it("returns 'jpg' for image/jpeg", () => {
    expect(extensionForType("image/jpeg")).toBe("jpg");
  });

  it("returns 'gif' for image/gif", () => {
    expect(extensionForType("image/gif")).toBe("gif");
  });

  it("returns 'webp' for image/webp", () => {
    expect(extensionForType("image/webp")).toBe("webp");
  });

  it("returns 'bin' for unknown mime type", () => {
    expect(extensionForType("image/unknown")).toBe("bin");
  });

  it("returns 'bin' for empty string", () => {
    expect(extensionForType("")).toBe("bin");
  });

  it("returns 'bin' for non-image types", () => {
    expect(extensionForType("application/pdf")).toBe("bin");
    expect(extensionForType("text/plain")).toBe("bin");
  });
});
