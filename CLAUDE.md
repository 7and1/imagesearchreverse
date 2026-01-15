# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ImageSearchReverse - A reverse image search application built on Next.js with a full Cloudflare stack (Pages + Workers + R2 + KV). Users upload images or paste URLs to find original sources and visually similar matches via the DataForSEO API.

## Commands

```bash
# Install (required due to peer dependency range mismatch)
npm install --legacy-peer-deps

# Development
npm run dev          # Start dev server with simulated Cloudflare bindings

# Quality
npm run test         # Run Vitest tests
npm run lint         # ESLint checks
npm run typecheck    # TypeScript type checking

# Build
npm run build        # Local Next.js build
npm run pages:build  # Build for Cloudflare Pages using @cloudflare/next-on-pages

# Deployment
npm run deploy       # Build and deploy to Cloudflare Pages via wrangler
```

## Architecture

### Cloudflare Bindings

The app uses Cloudflare Pages with edge runtime. Bindings are configured:

- **KV_RATE_LIMIT**: KV namespace for rate limiting (10 searches/day) and search result caching (48hr TTL)
- **R2_BUCKET**: R2 bucket for uploaded image storage (organized as `uploads/YYYY-MM-DD/`)

Local development simulates these bindings via `setupDevPlatform()` in `next.config.ts` and `.dev.vars` file.

### Request Flow

1. **Client** (`search-panel.tsx`) → User uploads image or pastes URL
2. **Upload** (`/api/upload`) → Image stored in R2, returns public URL
3. **Search** (`/api/search`) → Validates Turnstile (optional), checks rate limit, checks cache
4. **DataForSEO** (`lib/dataforseo.ts`) → Creates task, polls for results
5. **Response** → Returns `{ status, taskId, results, checkUrl }` or pending status for polling

### Key Libraries

- `lib/cf-env.ts` - Runtime environment/Cloudflare bindings access
- `lib/dataforseo.ts` - DataForSEO API integration (task creation, polling, result extraction)
- `lib/rate-limit.ts` - KV-based daily rate limiting with IP keys
- `lib/search-cache.ts` - KV caching with key prefixes (`cache:`, `task:`)
- `lib/turnstile.ts` - Cloudflare Turnstile verification
- `lib/image.ts` - Image validation and processing utilities

### API Routes

All routes use `export const runtime = "edge"`:

- `/api/search` (POST/GET) - Main search endpoint with async task polling
- `/api/upload` (POST) - R2 image upload handler

### Security

- CSP headers configured in `next.config.ts` (strict, allows Turnstile iframe)
- Turnstile CAPTCHA (optional, set `TURNSTILE_SECRET_KEY` to enforce)
- Zod schema validation on all API inputs
- Request ID tracking via `x-request-id` header

## Environment Variables

Required (DataForSEO credentials):

- `DFS_LOGIN`, `DFS_PASSWORD`
- `DFS_ENDPOINT_POST`, `DFS_ENDPOINT_GET`

Required (R2):

- `NEXT_PUBLIC_R2_DOMAIN` - Public R2 bucket domain

Optional:

- `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Turnstile CAPTCHA
- `NEXT_PUBLIC_SITE_URL` - Site base URL

## Deployment Notes

- Uses deprecated `@cloudflare/next-on-pages` adapter (consider OpenNext for future upgrades)
- Bindings must be configured in Cloudflare Pages dashboard (KV + R2)
- Build output goes to `.vercel/output/static`
- CI/CD via `.github/workflows/`
