import { getRequestContext } from "@cloudflare/next-on-pages";

type CloudflareEnv = {
  KV_RATE_LIMIT?: KVNamespace;
  R2_BUCKET?: R2Bucket;
};

export type AppEnv = CloudflareEnv & NodeJS.ProcessEnv;

export const getEnv = (): AppEnv => {
  try {
    const context = getRequestContext();
    return context.env as AppEnv;
  } catch {
    return process.env as AppEnv;
  }
};
