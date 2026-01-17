import { z } from "zod";
import type { AppEnv } from "@/lib/cf-env";
import { validatePublicImageUrl } from "@/lib/url-validation";
import {
  DataForSEOError,
  NetworkError,
  ValidationError,
  isAppError,
} from "@/lib/errors";

export type SearchResult = {
  title: string;
  pageUrl: string;
  imageUrl?: string;
  domain?: string;
};

const ImageSearchSchema = z.object({
  imageUrl: z.string().url().max(2048),
  imageHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
  turnstileToken: z.string().min(1).optional(),
});

export type ImageSearchInput = z.infer<typeof ImageSearchSchema>;

const DEFAULT_LANGUAGE_CODE = "en";
const DEFAULT_LOCATION_CODE = 2840;

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000; // Start with 1 second

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff with jitter for retries
 * Calculates delay with base * 2^attempt + random jitter
 */
const calculateRetryDelay = (attempt: number): number => {
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  return exponentialDelay + jitter;
};

/**
 * Sanitize error context to remove sensitive credentials
 */
const sanitizeErrorContext = (context: Record<string, unknown>): Record<string, unknown> => {
  const sanitized = { ...context };

  // Remove credential fields if present
  const sensitiveKeys = ["login", "password", "auth", "token", "secret", "apiKey", "dfs_login", "dfs_password"];

  for (const key of sensitiveKeys) {
    delete sanitized[key];
    delete sanitized[key.toUpperCase()];
    delete sanitized[key.toLowerCase()];
  }

  return sanitized;
};

const buildAuthHeader = (env: AppEnv) => {
  const login = env.DFS_LOGIN;
  const password = env.DFS_PASSWORD;
  if (!login || !password) {
    throw new DataForSEOError(
      "Missing DataForSEO credentials",
      "missing_credentials",
      401,
    );
  }
  return `Basic ${btoa(`${login}:${password}`)}`;
};

type DataForSeoTask = {
  id?: string;
  status_code?: number;
  status_message?: string;
  result?: Array<{
    check_url?: string;
    items?: unknown[];
  }>;
};

type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: DataForSeoTask[];
};

const extractRawItems = (data: DataForSeoResponse): unknown[] => {
  const task = data.tasks?.[0];
  const result = task?.result?.[0];
  const items = result?.items ?? [];

  if (!Array.isArray(items)) {
    return [];
  }

  const nested = items
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        Array.isArray((item as { items?: unknown[] }).items),
    )
    .flatMap((item) => (item as { items?: unknown[] }).items ?? []);

  if (nested.length > 0) {
    return nested;
  }

  return items;
};

const safeHostname = (url: string | undefined) => {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
};

const normalizeResult = (
  item: Record<string, unknown>,
): SearchResult | null => {
  const pageUrl =
    (typeof item.url === "string" && item.url) ||
    (typeof item.page_url === "string" && item.page_url) ||
    (typeof item.source_url === "string" && item.source_url) ||
    (typeof item.link === "string" && item.link) ||
    "";

  if (!pageUrl) return null;

  const title =
    (typeof item.title === "string" && item.title) ||
    (typeof item.source_title === "string" && item.source_title) ||
    (typeof item.alt === "string" && item.alt) ||
    safeHostname(pageUrl) ||
    "Source";

  const imageUrl =
    (typeof item.image_url === "string" && item.image_url) ||
    (typeof item.thumbnail_url === "string" && item.thumbnail_url) ||
    (typeof item.thumbnail === "string" && item.thumbnail) ||
    undefined;

  return {
    title,
    pageUrl,
    imageUrl,
    domain: safeHostname(pageUrl),
  };
};

export const extractSearchResults = (
  data: DataForSeoResponse,
): SearchResult[] => {
  const rawItems = extractRawItems(data);
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const normalized = normalizeResult(raw as Record<string, unknown>);
    if (!normalized) continue;
    if (seen.has(normalized.pageUrl)) continue;
    seen.add(normalized.pageUrl);
    results.push(normalized);
  }

  return results;
};

export const extractCheckUrl = (data: DataForSeoResponse) => {
  return data.tasks?.[0]?.result?.[0]?.check_url;
};

export const parseImageSearchInput = async (
  request: Request,
): Promise<ImageSearchInput> => {
  try {
    const payload = await request.json();
    const parsed = ImageSearchSchema.parse(payload);
    const validatedUrl = validatePublicImageUrl(parsed.imageUrl);

    return {
      ...parsed,
      imageUrl: validatedUrl,
      imageHash: parsed.imageHash?.toLowerCase(),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path[0] as string | undefined;
      throw new ValidationError(
        `Invalid input: ${error.errors[0]?.message ?? "validation failed"}`,
        field,
        undefined,
        { zodErrors: error.errors },
      );
    }
    if (isAppError(error)) {
      throw error;
    }
    throw new ValidationError(
      "Failed to parse search input",
      undefined,
      undefined,
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
};

/**
 * Enhanced fetch with timeout and retry logic
 * Wraps fetch with AbortController for timeout handling
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new NetworkError(`Request timeout after ${timeoutMs}ms`, true, {
        url,
        timeoutMs,
      });
    }
    throw error;
  }
};

/**
 * POST request to create a new search task with retry logic
 * Retries on transient failures with exponential backoff
 */
export const postSearchByImageTask = async (
  env: AppEnv,
  imageUrl: string,
): Promise<DataForSeoResponse> => {
  const endpoint = env.DFS_ENDPOINT_POST;
  if (!endpoint) {
    throw new DataForSEOError("Missing DFS_ENDPOINT_POST", "missing_endpoint");
  }

  const requestBody = [
    {
      image_url: imageUrl,
      location_code: DEFAULT_LOCATION_CODE,
      language_code: DEFAULT_LANGUAGE_CODE,
    },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            Authorization: buildAuthHeader(env),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
        REQUEST_TIMEOUT_MS,
      );

      if (!response.ok) {
        const errorText = await response.text();
        const statusCode = response.status;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          throw new DataForSEOError(
            `DataForSEO task_post failed: ${errorText}`,
            "http_error",
            statusCode,
            sanitizeErrorContext({ imageUrl, attempt }),
          );
        }

        // Retry on server errors (5xx) and rate limit (429)
        lastError = new DataForSEOError(
          `DataForSEO task_post failed: ${errorText}`,
          "http_error",
          statusCode,
          sanitizeErrorContext({ imageUrl, attempt }),
        );

        if (attempt < MAX_RETRIES - 1) {
          const retryDelay = calculateRetryDelay(attempt);
          await delay(retryDelay);
          continue;
        }

        throw lastError;
      }

      return (await response.json()) as DataForSeoResponse;
    } catch (error) {
      if (isAppError(error)) {
        // Don't retry validation errors or auth errors
        if (
          error instanceof ValidationError ||
          DataForSEOError.isAuthError(error)
        ) {
          throw error;
        }
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Retry on network errors or timeouts
      if (attempt < MAX_RETRIES - 1) {
        const retryDelay = calculateRetryDelay(attempt);
        await delay(retryDelay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new DataForSEOError("Max retries exceeded", "max_retries");
};

/**
 * GET request to retrieve search task results with retry logic
 * Retries on transient failures with exponential backoff
 */
export const getSearchByImageTask = async (
  env: AppEnv,
  taskId: string,
): Promise<DataForSeoResponse> => {
  const base = env.DFS_ENDPOINT_GET;
  if (!base) {
    throw new DataForSEOError("Missing DFS_ENDPOINT_GET", "missing_endpoint");
  }

  const url = `${base}/${taskId}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: {
            Authorization: buildAuthHeader(env),
            "Content-Type": "application/json",
          },
        },
        REQUEST_TIMEOUT_MS,
      );

      if (!response.ok) {
        const errorText = await response.text();
        const statusCode = response.status;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          throw new DataForSEOError(
            `DataForSEO task_get failed: ${errorText}`,
            "http_error",
            statusCode,
            sanitizeErrorContext({ taskId, attempt }),
          );
        }

        // Retry on server errors (5xx) and rate limit (429)
        lastError = new DataForSEOError(
          `DataForSEO task_get failed: ${errorText}`,
          "http_error",
          statusCode,
          sanitizeErrorContext({ taskId, attempt }),
        );

        if (attempt < MAX_RETRIES - 1) {
          const retryDelay = calculateRetryDelay(attempt);
          await delay(retryDelay);
          continue;
        }

        throw lastError;
      }

      return (await response.json()) as DataForSeoResponse;
    } catch (error) {
      if (isAppError(error)) {
        // Don't retry validation errors or auth errors
        if (
          error instanceof ValidationError ||
          DataForSEOError.isAuthError(error)
        ) {
          throw error;
        }
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Retry on network errors or timeouts
      if (attempt < MAX_RETRIES - 1) {
        const retryDelay = calculateRetryDelay(attempt);
        await delay(retryDelay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new DataForSEOError("Max retries exceeded", "max_retries");
};

export const pollSearchResults = async (
  env: AppEnv,
  taskId: string,
  attempts = 3,
  delayMs = 1500,
) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await delay(delayMs);
    const data = await getSearchByImageTask(env, taskId);
    const results = extractSearchResults(data);
    if (results.length > 0) {
      return { data, results };
    }
  }
  return { data: null, results: [] };
};

export const resolveSearchResults = async (env: AppEnv, imageUrl: string) => {
  const postData = await postSearchByImageTask(env, imageUrl);
  const taskId = postData.tasks?.[0]?.id;

  if (!taskId) {
    throw new Error(
      postData.tasks?.[0]?.status_message || "No task id returned",
    );
  }

  const { data: pollData, results } = await pollSearchResults(env, taskId);

  return {
    taskId,
    results,
    checkUrl: extractCheckUrl(pollData ?? postData),
    status: results.length > 0 ? "ready" : "pending",
  };
};
