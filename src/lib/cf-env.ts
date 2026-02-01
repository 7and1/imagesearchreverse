/**
 * Cloudflare environment bindings and configuration
 *
 * Provides type-safe access to Cloudflare Workers bindings (KV, R2)
 * and environment variables in both edge runtime and local development.
 */

import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * Cloudflare-specific bindings available in the edge runtime
 */
type CloudflareEnv = {
  /** KV namespace for rate limiting and caching */
  KV_RATE_LIMIT?: KVNamespace;
  /** R2 bucket for image storage */
  R2_BUCKET?: R2Bucket;
};

/**
 * Common environment variables used across the application
 */
type BaseEnv = {
  /** Node environment (development, production, test) */
  NODE_ENV?: string;
  /** Timezone setting */
  TZ?: string;

  // DataForSEO API credentials
  /** DataForSEO login/username */
  DFS_LOGIN?: string;
  /** DataForSEO password */
  DFS_PASSWORD?: string;
  /** DataForSEO endpoint for creating tasks */
  DFS_ENDPOINT_POST?: string;
  /** DataForSEO endpoint for retrieving results */
  DFS_ENDPOINT_GET?: string;

  // R2 Storage
  /** Public domain for R2 bucket access */
  NEXT_PUBLIC_R2_DOMAIN?: string;

  // Site configuration
  /** Base URL of the site */
  NEXT_PUBLIC_SITE_URL?: string;

  // Turnstile CAPTCHA
  /** Server-side secret key for Turnstile verification */
  TURNSTILE_SECRET_KEY?: string;
  /** Client-side site key for Turnstile widget */
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
};

/**
 * Combined application environment type
 */
export type AppEnv = CloudflareEnv & BaseEnv;

/**
 * Retrieves the current environment configuration.
 *
 * In the Cloudflare edge runtime, this returns bindings from the request context.
 * In local development or Node.js, it falls back to process.env.
 *
 * @returns The application environment with all bindings and variables
 *
 * @example
 * ```ts
 * const env = getEnv();
 * const kv = env.KV_RATE_LIMIT;
 * const apiLogin = env.DFS_LOGIN;
 * ```
 */
export const getEnv = (): AppEnv => {
  try {
    const context = getRequestContext();
    return context.env as AppEnv;
  } catch {
    // Fallback for local development or non-edge environments
    return process.env as AppEnv;
  }
};
