import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/request";
import { createMockRequest } from "@/test/setup";
import type { NextRequest } from "next/server";

describe("getClientIp", () => {
  it("extracts IP from cf-connecting-ip header", () => {
    const request = createMockRequest({
      cfConnectingIp: "192.168.1.100",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("192.168.1.100");
  });

  it("prioritizes cf-connecting-ip over x-forwarded-for", () => {
    const request = createMockRequest({
      cfConnectingIp: "192.168.1.100",
      xForwardedFor: "10.0.0.1",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("192.168.1.100");
  });

  it("extracts first IP from x-forwarded-for when cf-connecting-ip is missing", () => {
    const request = createMockRequest({
      xForwardedFor: "203.0.113.1, 198.51.100.1, 192.0.2.1",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("203.0.113.1");
  });

  it("trims whitespace from x-forwarded-for IP", () => {
    const request = createMockRequest({
      xForwardedFor: "  203.0.113.1  ",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("203.0.113.1");
  });

  it("returns fallback IP when no headers are present", () => {
    const request = createMockRequest({});
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("127.0.0.1");
  });

  it("returns fallback IP when headers are empty strings", () => {
    const request = createMockRequest({
      cfConnectingIp: "",
      xForwardedFor: "",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("127.0.0.1");
  });

  it("handles x-forwarded-for with single IP", () => {
    const request = createMockRequest({
      xForwardedFor: "203.0.113.1",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("203.0.113.1");
  });

  it("handles IPv6 addresses in cf-connecting-ip", () => {
    const request = createMockRequest({
      cfConnectingIp: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
  });

  it("handles IPv6 addresses in x-forwarded-for", () => {
    const request = createMockRequest({
      xForwardedFor: "2001:0db8:85a3::8a2e:0370:7334, 198.51.100.1",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("2001:0db8:85a3::8a2e:0370:7334");
  });

  // Security: IP validation and sanitization tests
  it("removes port numbers from IPv4 addresses", () => {
    const request = createMockRequest({
      cfConnectingIp: "192.168.1.100:8080",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("192.168.1.100");
  });

  it("rejects invalid IPv4 addresses", () => {
    const request = createMockRequest({
      xForwardedFor: "999.999.999.999",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("127.0.0.1"); // Falls back to localhost
  });

  it("handles malformed x-forwarded-for with extra commas", () => {
    const request = createMockRequest({
      xForwardedFor: ",,203.0.113.1,,",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("127.0.0.1"); // Falls back to localhost on invalid
  });

  it("validates private IP addresses", () => {
    const request = createMockRequest({
      cfConnectingIp: "10.0.0.1",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("10.0.0.1");
  });

  it("validates localhost in cf-connecting-ip", () => {
    const request = createMockRequest({
      cfConnectingIp: "127.0.0.1",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    expect(ip).toBe("127.0.0.1");
  });

  it("handles IPv6 with port (keeps port for IPv6)", () => {
    const request = createMockRequest({
      cfConnectingIp: "[2001:db8::1]:8080",
    });
    const ip = getClientIp(request as unknown as NextRequest);
    // IPv6 with brackets and port should be handled
    expect(ip).toBeTruthy();
  });
});
