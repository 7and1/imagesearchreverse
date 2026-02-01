/**
 * Cloudflare Turnstile verification module
 *
 * Provides server-side verification of Turnstile CAPTCHA tokens
 * to protect against bots and automated abuse.
 */

import type { AppEnv } from "@/lib/cf-env";

/** Cloudflare Turnstile verification endpoint */
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Timeout for Turnstile verification requests in milliseconds */
const VERIFICATION_TIMEOUT_MS = 5000;

/**
 * Response from Cloudflare Turnstile verification API
 */
type TurnstileVerifyResult = {
  /** Whether the token was valid */
  success: boolean;
  /** Error codes if verification failed */
  "error-codes"?: string[];
};

/**
 * Result of Turnstile verification
 */
export type TurnstileResult =
  | { ok: true; skipped: boolean }
  | { ok: false; error: string; details?: string[] };

/**
 * Options for Turnstile verification
 */
export type TurnstileOptions = {
  /** Whether Turnstile verification is required (default: true) */
  required?: boolean;
};

/**
 * Maps Turnstile error codes to user-friendly messages.
 */
const ERROR_MESSAGES: Record<string, string> = {
  "invalid-input-secret": "Server configuration error. Please contact support.",
  "timeout-or-duplicate": "Security check expired. Please try again.",
  "bad-request": "Invalid request. Please refresh and try again.",
} as const;

/**
 * Verifies a Cloudflare Turnstile token.
 *
 * If TURNSTILE_SECRET_KEY is not configured, verification is skipped.
 * This allows optional Turnstile protection based on environment.
 *
 * @param env - The application environment containing the secret key
 * @param token - The Turnstile token from the client (can be null)
 * @param remoteIp - Optional client IP for additional verification
 * @param options - Verification options
 * @returns Verification result with success status or error details
 *
 * @example
 * ```ts
 * const result = await verifyTurnstileToken(env, token, clientIp);
 * if (!result.ok) {
 *   return new Response(result.error, { status: 400 });
 * }
 * ```
 */
export const verifyTurnstileToken = async (
  env: AppEnv,
  token: string | null,
  remoteIp?: string,
  options?: TurnstileOptions,
): Promise<TurnstileResult> => {
  const required = options?.required ?? true;

  // Skip verification if secret key is not configured
  if (!env.TURNSTILE_SECRET_KEY) {
    return { ok: true, skipped: true };
  }

  // Handle missing token
  if (!token) {
    return required
      ? { ok: false, error: "Turnstile token is missing." }
      : { ok: true, skipped: true };
  }

  const payload = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  });

  if (remoteIp) {
    payload.set("remoteip", remoteIp);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VERIFICATION_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: payload,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    // Handle timeout as verification failure
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[Turnstile] Verification timed out");
      return { ok: false, error: "Security verification timed out. Please try again." };
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    return { ok: false, error: "Turnstile verification failed." };
  }

  const data = (await response.json()) as TurnstileVerifyResult;
  if (!data.success) {
    const errorCodes = data["error-codes"] ?? [];
    console.error("[Turnstile] Verification failed:", errorCodes);

    // Map error codes to user-friendly messages
    const errorMessage =
      errorCodes.map((code) => ERROR_MESSAGES[code]).find(Boolean) ??
      "Turnstile verification failed.";

    return {
      ok: false,
      error: errorMessage,
      details: errorCodes,
    };
  }

  return { ok: true, skipped: false };
};
