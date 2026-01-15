import { z } from "zod";
import type { AppEnv } from "@/lib/cf-env";
import { validatePublicImageUrl } from "@/lib/url-validation";

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildAuthHeader = (env: AppEnv) => {
  const login = env.DFS_LOGIN;
  const password = env.DFS_PASSWORD;
  if (!login || !password) {
    throw new Error("Missing DataForSEO credentials");
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
  const payload = await request.json();
  const parsed = ImageSearchSchema.parse(payload);
  return {
    ...parsed,
    imageUrl: validatePublicImageUrl(parsed.imageUrl),
    imageHash: parsed.imageHash?.toLowerCase(),
  };
};

export const postSearchByImageTask = async (env: AppEnv, imageUrl: string) => {
  const endpoint = env.DFS_ENDPOINT_POST;
  if (!endpoint) {
    throw new Error("Missing DFS_ENDPOINT_POST");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(env),
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        image_url: imageUrl,
        location_code: DEFAULT_LOCATION_CODE,
        language_code: DEFAULT_LANGUAGE_CODE,
      },
    ]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DataForSEO task_post failed: ${errorText}`);
  }

  return (await response.json()) as DataForSeoResponse;
};

export const getSearchByImageTask = async (env: AppEnv, taskId: string) => {
  const base = env.DFS_ENDPOINT_GET;
  if (!base) {
    throw new Error("Missing DFS_ENDPOINT_GET");
  }

  const response = await fetch(`${base}/${taskId}`, {
    method: "GET",
    headers: {
      Authorization: buildAuthHeader(env),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DataForSEO task_get failed: ${errorText}`);
  }

  return (await response.json()) as DataForSeoResponse;
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
