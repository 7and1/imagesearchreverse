import { describe, expect, it, beforeEach, vi } from "vitest";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createMockEnv, mockFetch, restoreFetch } from "@/test/setup";
import type { AppEnv } from "@/lib/cf-env";

describe("verifyTurnstileToken", () => {
  let env: AppEnv;

  beforeEach(() => {
    env = createMockEnv();
    restoreFetch();
  });

  describe("when TURNSTILE_SECRET_KEY is not set", () => {
    it("returns ok: true and skipped: true", async () => {
      const envNoSecret = { ...env, TURNSTILE_SECRET_KEY: undefined };
      const result = await verifyTurnstileToken(envNoSecret, null);
      expect(result).toEqual({ ok: true, skipped: true });
    });

    it("returns ok: true and skipped: true even with token", async () => {
      const envNoSecret = { ...env, TURNSTILE_SECRET_KEY: undefined };
      const result = await verifyTurnstileToken(
        envNoSecret,
        "some-token",
        "192.168.1.1",
      );
      expect(result).toEqual({ ok: true, skipped: true });
    });

    it("returns ok: true when token is null and required is false", async () => {
      const envNoSecret = { ...env, TURNSTILE_SECRET_KEY: undefined };
      const result = await verifyTurnstileToken(envNoSecret, null, undefined, {
        required: false,
      });
      expect(result).toEqual({ ok: true, skipped: true });
    });
  });

  describe("when token is missing", () => {
    it("returns error when required is true (default)", async () => {
      const result = await verifyTurnstileToken(env, null);
      expect(result).toEqual({
        ok: false,
        error: "Turnstile token is missing.",
      });
    });

    it("returns ok: true when required is false", async () => {
      const result = await verifyTurnstileToken(env, null, undefined, {
        required: false,
      });
      expect(result).toEqual({ ok: true, skipped: true });
    });

    it("returns ok: true when token is empty string and required is false", async () => {
      const result = await verifyTurnstileToken(env, "", undefined, {
        required: false,
      });
      expect(result).toEqual({ ok: true, skipped: true });
    });
  });

  describe("successful verification", () => {
    it("verifies token successfully", async () => {
      mockFetch({ success: true });

      const result = await verifyTurnstileToken(
        env,
        "valid-token",
        "192.168.1.1",
      );

      expect(result).toEqual({ ok: true, skipped: false });
    });

    it("verifies token without remote IP", async () => {
      mockFetch({ success: true });

      const result = await verifyTurnstileToken(env, "valid-token");

      expect(result).toEqual({ ok: true, skipped: false });
    });
  });

  describe("failed verification", () => {
    it("returns error when verification fails", async () => {
      mockFetch({ success: false, "error-codes": ["invalid-input-response"] });

      const result = await verifyTurnstileToken(env, "invalid-token");

      expect(result).toEqual({
        ok: false,
        error: "Turnstile verification failed.",
        details: ["invalid-input-response"],
      });
    });

    it("returns error when success is false without error codes", async () => {
      mockFetch({ success: false });

      const result = await verifyTurnstileToken(env, "invalid-token");

      expect(result).toEqual({
        ok: false,
        error: "Turnstile verification failed.",
        details: [],
      });
    });
  });

  describe("network errors", () => {
    it("returns error when fetch times out", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const result = await verifyTurnstileToken(env, "valid-token");

      expect(result).toEqual({
        ok: false,
        error: "Security verification timed out. Please try again.",
      });
    });

    it("throws error when fetch fails with non-abort error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(verifyTurnstileToken(env, "valid-token")).rejects.toThrow(
        "Network error",
      );
    });

    it("returns error when response is not ok", async () => {
      mockFetch("Service unavailable", { status: 503, ok: false });

      const result = await verifyTurnstileToken(env, "valid-token");

      expect(result).toEqual({
        ok: false,
        error: "Turnstile verification failed.",
      });
    });
  });

  describe("malformed responses", () => {
    it("throws error on invalid JSON response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Invalid JSON");
        },
      });

      await expect(verifyTurnstileToken(env, "valid-token")).rejects.toThrow(
        "Invalid JSON",
      );
    });

    it("handles non-object response", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => "not an object",
      });

      const result = await verifyTurnstileToken(env, "valid-token");

      expect(result.ok).toBe(false);
    });
  });

  describe("payload construction", () => {
    it("includes secret and response in payload", async () => {
      const fetchSpy = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchSpy;

      await verifyTurnstileToken(env, "test-token", "192.168.1.1");

      const callArgs = fetchSpy.mock.calls[0];
      const url = callArgs[0];
      const options = callArgs[1];

      expect(url).toBe(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      );
      expect(options?.method).toBe("POST");

      const body = options?.body as URLSearchParams;
      expect(body.get("secret")).toBe("test_secret_key");
      expect(body.get("response")).toBe("test-token");
      expect(body.get("remoteip")).toBe("192.168.1.1");
    });

    it("does not include remoteip when not provided", async () => {
      const fetchSpy = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchSpy;

      await verifyTurnstileToken(env, "test-token");

      const callArgs = fetchSpy.mock.calls[0];
      const options = callArgs[1];
      const body = options?.body as URLSearchParams;

      expect(body.get("remoteip")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles token with special characters", async () => {
      mockFetch({ success: true });

      const result = await verifyTurnstileToken(
        env,
        "token-with-special-chars-!@#$%",
      );

      expect(result).toEqual({ ok: true, skipped: false });
    });

    it("handles very long tokens", async () => {
      const longToken = "a".repeat(10000);
      mockFetch({ success: true });

      const result = await verifyTurnstileToken(env, longToken);

      expect(result).toEqual({ ok: true, skipped: false });
    });

    it("handles IPv6 in remoteIp", async () => {
      mockFetch({ success: true });

      const result = await verifyTurnstileToken(
        env,
        "valid-token",
        "2001:0db8:85a3::8a2e:0370:7334",
      );

      expect(result).toEqual({ ok: true, skipped: false });
    });

    it("handles empty error codes array", async () => {
      mockFetch({ success: false, "error-codes": [] });

      const result = await verifyTurnstileToken(env, "invalid-token");

      expect(result).toEqual({
        ok: false,
        error: "Turnstile verification failed.",
        details: [],
      });
    });
  });
});
