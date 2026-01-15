import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/crypto";

describe("sha256Hex", () => {
  it("hashes a simple string correctly", async () => {
    const result = await sha256Hex("hello");
    expect(result).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("hashes an empty string", async () => {
    const result = await sha256Hex("");
    expect(result).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await sha256Hex("test1");
    const hash2 = await sha256Hex("test2");
    expect(hash1).not.toBe(hash2);
  });

  it("produces consistent hashes for the same input", async () => {
    const input = "consistent";
    const hash1 = await sha256Hex(input);
    const hash2 = await sha256Hex(input);
    expect(hash1).toBe(hash2);
  });

  it("hashes an ArrayBuffer correctly", async () => {
    const buffer = new TextEncoder().encode("arraybuffer");
    const result = await sha256Hex(buffer.buffer);
    expect(result).toBe(
      "6c4a7c09daeccebe5674c7212eb53f5f7998a456ab4cdca3ca1e657e0bb6628d",
    );
  });

  it("hashes a Uint8Array correctly", async () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const result = await sha256Hex(bytes.buffer);
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns a 64-character hex string", async () => {
    const result = await sha256Hex("any input");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles special characters", async () => {
    const result = await sha256Hex("hello 🌍 world! \n\t\r");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles unicode characters", async () => {
    const result = await sha256Hex("日本語テスト");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles very long strings", async () => {
    const longString = "a".repeat(10000);
    const result = await sha256Hex(longString);
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is case insensitive for hex output (lowercase)", async () => {
    const result = await sha256Hex("test");
    expect(result).toBe(result.toLowerCase());
  });
});
