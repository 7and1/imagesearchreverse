import type { AppEnv } from "@/lib/cf-env";

type TurnstileVerifyResult = {
  success: boolean;
  "error-codes"?: string[];
};

export const verifyTurnstileToken = async (
  env: AppEnv,
  token: string | null,
  remoteIp?: string,
  options?: { required?: boolean },
) => {
  const required = options?.required ?? true;
  if (!env.TURNSTILE_SECRET_KEY) {
    return { ok: true, skipped: true };
  }

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

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: payload,
    },
  );

  if (!response.ok) {
    return { ok: false, error: "Turnstile verification failed." };
  }

  const data = (await response.json()) as TurnstileVerifyResult;
  if (!data.success) {
    return {
      ok: false,
      error: "Turnstile verification failed.",
      details: data["error-codes"],
    };
  }

  return { ok: true, skipped: false };
};
