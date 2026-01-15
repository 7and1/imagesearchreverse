import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/cf-env";
import { sha256Hex } from "@/lib/crypto";
import { detectImageType, extensionForType } from "@/lib/image";
import { getClientIp } from "@/lib/request";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createLogger } from "@/lib/logger";
import { isAppError, errorToResponse } from "@/lib/errors";

export const runtime = "edge";

const logger = createLogger("api:upload");

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
  const timing = logger.startTiming("POST /api/upload");

  try {
    const env = getEnv();
    if (!env.R2_BUCKET) {
      const response = NextResponse.json(
        { error: "R2 bucket binding is missing." },
        { status: 500 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 500, reason: "missing_r2" });
      return response;
    }

    const headers = new Headers();
    const ip = getClientIp(request);

    const rateLimitStart = Date.now();
    if (env.KV_RATE_LIMIT) {
      const rate = await checkRateLimit(env.KV_RATE_LIMIT, ip, 20, "upload");
      timing.addMetric("rateLimit", rateLimitStart);

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
        timing.end({ requestId, status: 429, reason: "rate_limited" });
        return response;
      }

      headers.set("X-RateLimit-Limit", String(rate.limit));
      headers.set("X-RateLimit-Remaining", String(rate.remaining));
      headers.set("X-RateLimit-Reset", rate.resetAt);
    } else {
      timing.addMetric("rateLimit", rateLimitStart);
    }

    const parseStart = Date.now();
    const formData = await request.formData();
    const file = formData.get("file");
    const token = formData.get("turnstileToken");
    timing.addMetric("parseForm", parseStart);

    const turnstileStart = Date.now();
    const turnstile = await verifyTurnstileToken(
      env,
      typeof token === "string" ? token : null,
      ip,
      { required: false },
    );
    timing.addMetric("turnstile", turnstileStart);

    if (!turnstile.ok) {
      const response = NextResponse.json(
        { error: turnstile.error ?? "Turnstile verification failed." },
        { status: 403 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 403, reason: "turnstile_failed" });
      return response;
    }

    if (!(file instanceof File)) {
      const response = NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 400, reason: "no_file" });
      return response;
    }

    if (file.size > MAX_FILE_SIZE) {
      const response = NextResponse.json(
        { error: "File exceeds 8MB limit." },
        { status: 413 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 413, reason: "file_too_large" });
      return response;
    }

    logger.debug("Processing file", {
      requestId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const bufferStart = Date.now();
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const detectedType = detectImageType(bytes);
    timing.addMetric("readBuffer", bufferStart);

    if (!detectedType || !ALLOWED_TYPES.has(detectedType)) {
      const response = NextResponse.json(
        { error: "Unsupported file type." },
        { status: 415 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 415, reason: "unsupported_type" });
      return response;
    }

    if (file.type && file.type !== detectedType) {
      logger.warn("File type mismatch", {
        requestId,
        declaredType: file.type,
        detectedType,
      });
      const response = NextResponse.json(
        { error: "File type mismatch." },
        { status: 415 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 415, reason: "type_mismatch" });
      return response;
    }

    const hashStart = Date.now();
    const hash = await sha256Hex(buffer);
    timing.addMetric("hash", hashStart);

    const extension = extensionForType(detectedType);
    const datePrefix = new Date().toISOString().split("T")[0];
    const key = `uploads/${datePrefix}/${hash}.${extension}`;

    logger.debug("Uploading to R2", {
      requestId,
      key,
      detectedType,
    });

    const uploadStart = Date.now();
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
    timing.addMetric("r2Upload", uploadStart);

    const publicDomain = env.NEXT_PUBLIC_R2_DOMAIN;
    const url = buildPublicUrl(publicDomain ?? "", key);

    const response = NextResponse.json({ key, url, hash }, { headers });
    response.headers.set("X-Request-Id", requestId);
    timing.end({
      requestId,
      status: 200,
      fileSize: file.size,
      fileType: detectedType,
    });
    return response;
  } catch (error) {
    timing.endWithError(error, { requestId });
    logger.error("Upload failed", error, { requestId });

    const statusCode = isAppError(error) ? error.statusCode : 500;
    const errorResponse = errorToResponse(error);

    const response = NextResponse.json(errorResponse, { status: statusCode });
    response.headers.set("X-Request-Id", requestId);
    return response;
  }
}
