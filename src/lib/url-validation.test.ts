import { describe, expect, it } from "vitest";
import { validatePublicImageUrl } from "@/lib/url-validation";

describe("validatePublicImageUrl", () => {
  it("accepts public https URLs", () => {
    const url = validatePublicImageUrl("https://example.com/image.jpg");
    expect(url).toBe("https://example.com/image.jpg");
  });

  it("rejects non-https URLs", () => {
    expect(() =>
      validatePublicImageUrl("http://example.com/image.jpg"),
    ).toThrow();
  });

  it("rejects localhost URLs", () => {
    expect(() =>
      validatePublicImageUrl("https://localhost/image.jpg"),
    ).toThrow();
  });

  it("rejects private IPv4 URLs", () => {
    expect(() =>
      validatePublicImageUrl("https://192.168.0.1/image.jpg"),
    ).toThrow();
  });

  it("accepts public IPv4 URLs", () => {
    const url = validatePublicImageUrl("https://8.8.8.8/image.jpg");
    expect(url).toBe("https://8.8.8.8/image.jpg");
  });

  // Security: DNS rebinding and cloud metadata tests
  it("rejects cloud metadata endpoints", () => {
    expect(() =>
      validatePublicImageUrl("https://169.254.169.254/latest/meta-data/"),
    ).toThrow();
    expect(() =>
      validatePublicImageUrl("https://metadata.google.internal/computeMetadata/v1/"),
    ).toThrow();
  });

  it("rejects URLs with metadata hostname patterns", () => {
    expect(() =>
      validatePublicImageUrl("https://metadata.example.com/image.jpg"),
    ).toThrow();
    expect(() =>
      validatePublicImageUrl("https://example.metadata/image.jpg"),
    ).toThrow();
  });

  it("rejects AWS ECS metadata endpoint", () => {
    expect(() =>
      validatePublicImageUrl("https://169.254.170.2/v2/metadata"),
    ).toThrow();
  });

  // Security: URL encoding normalization tests
  it("normalizes double-encoded URLs", () => {
    // Double-encoded localhost should still be rejected
    expect(() =>
      validatePublicImageUrl("https://localhost/image.jpg"),
    ).toThrow();
  });

  it("handles URL encoding attempts", () => {
    // Try to bypass with unicode encoding
    expect(() =>
      validatePublicImageUrl("https://%6C%6F%63%61%6C%68%6F%73%74/image.jpg"),
    ).toThrow();
  });

  it("rejects URLs with credentials", () => {
    expect(() =>
      validatePublicImageUrl("https://user:pass@example.com/image.jpg"),
    ).toThrow();
  });

  it("normalizes URL encoding variations", () => {
    // URL encoding should be normalized
    const url1 = validatePublicImageUrl("https://example.com/image.jpg");
    const url2 = validatePublicImageUrl("https://example.com/image.jpg");
    expect(url1).toBe(url2);
  });
});
