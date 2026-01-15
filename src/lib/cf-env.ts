import { getRequestContext } from "@cloudflare/next-on-pages";

type CloudflareEnv = {
  KV_RATE_LIMIT?: KVNamespace;
  R2_BUCKET?: R2Bucket;
};

// Common environment variables
type BaseEnv = {
  NODE_ENV?: string;
  TZ?: string;

  // DataForSEO
  DFS_LOGIN?: string;
  DFS_PASSWORD?: string;
  DFS_ENDPOINT_POST?: string;
  DFS_ENDPOINT_GET?: string;

  // R2
  NEXT_PUBLIC_R2_DOMAIN?: string;

  // Site
  NEXT_PUBLIC_SITE_URL?: string;

  // Turnstile
  TURNSTILE_SECRET_KEY?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
};

export type AppEnv = CloudflareEnv & BaseEnv;

export const getEnv = (): AppEnv => {
  try {
    const context = getRequestContext();
    return context.env as AppEnv;
  } catch {
    return process.env as AppEnv;
  }
};
