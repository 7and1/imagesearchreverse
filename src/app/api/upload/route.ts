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

// Per-IP upload quotas to prevent abuse
const MAX_UPLOADS_PER_IP_PER_DAY = 50;

/**
 * Sanitize filename to prevent path traversal and injection attacks
 */
const sanitizeFilename = (filename: string): string => {
  if (!filename) return "unnamed";

  // Remove any directory separators
  let sanitized = filename.replace(/[\/\\]/g, "");

  // Remove any null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Limit length to prevent DOS
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, "");

  return sanitized || "unnamed";
};

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
      // Check per-IP upload quota (separate from general rate limit)
      const uploadQuota = await checkRateLimit(
        env.KV_RATE_LIMIT,
        ip,
        MAX_UPLOADS_PER_IP_PER_DAY,
        "upload_quota",
      );

      if (!uploadQuota.allowed) {
        const response = NextResponse.json(
          {
            error: "Daily upload quota exceeded. Please try again tomorrow.",
            resetAt: uploadQuota.resetAt,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(uploadQuota.limit),
              "X-RateLimit-Remaining": String(uploadQuota.remaining),
              "X-RateLimit-Reset": uploadQuota.resetAt,
            },
          },
        );
        response.headers.set("X-Request-Id", requestId);
        timing.end({ requestId, status: 429, reason: "upload_quota_exceeded" });
        return response;
      }

      // Check general rate limit
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

    // Validate file size before reading buffer (prevent DOS)
    if (file.size > MAX_FILE_SIZE) {
      const response = NextResponse.json(
        { error: "File exceeds 8MB limit." },
        { status: 413 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 413, reason: "file_too_large" });
      return response;
    }

    // Validate file size is not suspiciously small (empty files)
    if (file.size === 0) {
      const response = NextResponse.json(
        { error: "File is empty." },
        { status: 400 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 400, reason: "empty_file" });
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

    // Double-check buffer size matches declared file size
    if (buffer.byteLength !== file.size) {
      logger.warn("Buffer size mismatch", {
        requestId,
        declaredSize: file.size,
        actualSize: buffer.byteLength,
      });
      const response = NextResponse.json(
        { error: "File size verification failed." },
        { status: 400 },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({ requestId, status: 400, reason: "size_mismatch" });
      return response;
    }

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

    // Check for hash collision (same hash already exists)
    const existing = await env.R2_BUCKET.head(key);
    if (existing) {
      logger.debug("File already exists (deduplication)", {
        requestId,
        key,
        existingSize: existing.size,
      });

      // File already exists, return existing URL
      const publicDomain = env.NEXT_PUBLIC_R2_DOMAIN;
      const url = buildPublicUrl(publicDomain ?? "", key);

      const response = NextResponse.json(
        { key, url, hash, cached: true },
        { headers },
      );
      response.headers.set("X-Request-Id", requestId);
      timing.end({
        requestId,
        status: 200,
        fileSize: file.size,
        fileType: detectedType,
        cached: true,
      });
      return response;
    }

    // Sanitize metadata before storage
    const sanitizedOriginalName = sanitizeFilename(file.name);

    await env.R2_BUCKET.put(key, buffer, {
      httpMetadata: {
        contentType: detectedType,
        cacheControl: CACHE_CONTROL,
      },
      customMetadata: {
        sha256: hash,
        originalName: sanitizedOriginalName,
        uploadedAt: new Date().toISOString(),
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
