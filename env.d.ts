/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DFS_LOGIN?: string;
      DFS_PASSWORD?: string;
      DFS_ENDPOINT_POST?: string;
      DFS_ENDPOINT_GET?: string;
      NEXT_PUBLIC_R2_DOMAIN?: string;
      NEXT_PUBLIC_SITE_URL?: string;
      TURNSTILE_SECRET_KEY?: string;
      NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
    }
  }
}

export {};
