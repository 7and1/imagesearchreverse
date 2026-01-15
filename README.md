# ImageSearchReverse

Production-ready reverse image search built for a full Cloudflare stack (Pages + Workers + R2 + KV). This app uploads images to R2, calls DataForSEO Search-by-Image, and returns verified visual matches with rate limiting.

## Stack

- **Next.js (App Router)** on Cloudflare Pages
- **Workers / Edge Runtime** for API routes
- **R2** for image storage
- **KV** for rate limiting
- **DataForSEO** for reverse image search

## Requirements

- Node.js 20+
- Cloudflare account with Pages, R2, and KV enabled
- DataForSEO API credentials

## Setup

1. Install dependencies (note the peer-range mismatch between Next and next-on-pages):

```bash
npm install --legacy-peer-deps
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

Fill in:

- `DFS_LOGIN`
- `DFS_PASSWORD`
- `DFS_ENDPOINT_POST` (e.g. `https://api.dataforseo.com/v3/serp/google/search_by_image/task_post`)
- `DFS_ENDPOINT_GET` (e.g. `https://api.dataforseo.com/v3/serp/google/search_by_image/task_get/advanced`)
- `NEXT_PUBLIC_R2_DOMAIN` (your public R2 domain)
- `NEXT_PUBLIC_SITE_URL`
- `TURNSTILE_SECRET_KEY` (optional, to enforce Turnstile verification)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (optional, to render Turnstile on the client)

3. Configure Cloudflare bindings in `wrangler.toml`:

- Create a KV namespace named `RATE_LIMIT` and add the IDs.
- Create an R2 bucket (default `img-search-temp`).

4. Optional local bindings via `.dev.vars` (for `next dev`):

```bash
DFS_LOGIN=...
DFS_PASSWORD=...
DFS_ENDPOINT_POST=...
DFS_ENDPOINT_GET=...
NEXT_PUBLIC_R2_DOMAIN=...
```

## Local development

```bash
npm run dev
```

The `next.config.ts` file uses `setupDevPlatform()` to simulate Cloudflare bindings in local dev.

## Tests

```bash
npm run test
npm run lint
npm run build
```

## Deploy (Cloudflare Pages)

```bash
npm run deploy
```

Then add the KV + R2 bindings and environment variables in the Cloudflare Pages dashboard.

## Notes

- This project uses Next.js `15.5.9` (patched for December 2025 security updates). The Cloudflare `next-on-pages` adapter is deprecated but still used here to keep Edge runtime compatibility. For future upgrades, consider the OpenNext adapter.
- Cloudflare KV is used for daily rate limiting and short-lived search result caching (with key prefixes to keep entries separate).
- Uploads are stored under `uploads/YYYY-MM-DD/` in R2 to support lifecycle cleanup rules.
