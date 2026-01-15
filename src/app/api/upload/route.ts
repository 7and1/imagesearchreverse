import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/cf-env";
import { sha256Hex } from "@/lib/crypto";
import { detectImageType, extensionForType } from "@/lib/image";
import { getClientIp } from "@/lib/request";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const runtime = "edge";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const buildPublicUrl = (domain: string, key: string) => {
  if (!domain) return key;
  return domain.endsWith("/") ? `${domain}${key}` : `${domain}/${key}`;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const env = getEnv();
    if (!env.R2_BUCKET) {
      const response = NextResponse.json(
        { error: "R2 bucket binding is missing." },
        { status: 500 },
      );
      response.headers.set("X-Request-Id", requestId);
      return response;
    }

    const headers = new Headers();
    const ip = getClientIp(request);

    if (env.KV_RATE_LIMIT) {
      const rate = await checkRateLimit(env.KV_RATE_LIMIT, ip, 20, "upload");
      if (!rate.allowed) {
        const response = NextResponse.json(
          {
            error: "Upload limit reached. Please try again tomorrow.",
            resetAt: rate.resetAt,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(rate.limit),
              "X-RateLimit-Remaining": String(rate.remaining),
              "X-RateLimit-Reset": rate.resetAt,
            },
          },
        );
        response.headers.set("X-Request-Id", requestId);
        return response;
      }

      headers.set("X-RateLimit-Limit", String(rate.limit));
      headers.set("X-RateLimit-Remaining", String(rate.remaining));
      headers.set("X-RateLimit-Reset", rate.resetAt);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const token = formData.get("turnstileToken");

    const turnstile = await verifyTurnstileToken(
      env,
      typeof token === "string" ? token : null,
      ip,
      { required: false },
    );

    if (!turnstile.ok) {
      const response = NextResponse.json(
        { error: turnstile.error ?? "Turnstile verification failed." },
        { status: 403 },
      );
      response.headers.set("X-Request-Id", requestId);
      return response;
    }

    if (!(file instanceof File)) {
      const response = NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 },
      );
      response.headers.set("X-Request-Id", requestId);
      return response;
    }

    if (file.size > MAX_FILE_SIZE) {
      const response = NextResponse.json(
        { error: "File exceeds 8MB limit." },
        { status: 413 },
      );
      response.headers.set("X-Request-Id", requestId);
      return response;
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const detectedType = detectImageType(bytes);

    if (!detectedType || !ALLOWED_TYPES.has(detectedType)) {
      const response = NextResponse.json(
        { error: "Unsupported file type." },
        { status: 415 },
      );
      response.headers.set("X-Request-Id", requestId);
      return response;
    }

    if (file.type && file.type !== detectedType) {
      const response = NextResponse.json(
        { error: "File type mismatch." },
        { status: 415 },
      );
      response.headers.set("X-Request-Id", requestId);
      return response;
    }

    const hash = await sha256Hex(buffer);
    const extension = extensionForType(detectedType);
    const datePrefix = new Date().toISOString().split("T")[0];
    const key = `uploads/${datePrefix}/${hash}.${extension}`;

    await env.R2_BUCKET.put(key, buffer, {
      httpMetadata: {
        contentType: detectedType,
        cacheControl: CACHE_CONTROL,
      },
      customMetadata: {
        sha256: hash,
        originalName: file.name,
      },
    });

    const publicDomain = env.NEXT_PUBLIC_R2_DOMAIN;
    const url = buildPublicUrl(publicDomain ?? "", key);

    const response = NextResponse.json({ key, url, hash }, { headers });
    response.headers.set("X-Request-Id", requestId);
    console.info("upload:success", {
      requestId,
      size: file.size,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    console.error("upload:failed", { requestId, error });
    const response = NextResponse.json(
      { error: "Upload failed." },
      { status: 500 },
    );
    response.headers.set("X-Request-Id", requestId);
    return response;
  }
}
