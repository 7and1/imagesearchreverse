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
});
