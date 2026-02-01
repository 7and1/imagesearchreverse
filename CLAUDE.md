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
- Use `./deploy.sh` for manual deployments with pre-flight checks

## Testing Strategy

### Test Organization
- Tests are co-located with source files (`*.test.ts` next to `*.ts`)
- Test setup in `src/test/setup.ts`
- Use Vitest with `vi.mock()` for mocking Cloudflare bindings

### Running Tests
```bash
npm run test              # Run all tests
npm run test -- --watch   # Watch mode
npm run test -- --coverage # With coverage
```

### Mocking Cloudflare Bindings
```typescript
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
vi.mock("@/lib/cf-env", () => ({
  getEnv: () => ({ KV_RATE_LIMIT: mockKV }),
}));
```

## Code Patterns

### Error Handling
- Use `AppError` class from `lib/errors.ts` for typed errors
- Always include `requestId` in error responses
- Never expose internal error details to clients

### API Route Pattern
```typescript
export const runtime = "edge";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    // Validate input with Zod
    // Check rate limit
    // Process request
    // Return response with requestId header
  } catch (error) {
    // Handle and log error
  }
}
```

### Circuit Breaker Usage
```typescript
import { dataForSEOCircuitBreaker } from "@/lib/circuit-breaker";

const result = await dataForSEOCircuitBreaker.execute(
  () => fetchFromDataForSEO(url),
  "DataForSEO search"
);
```

## Troubleshooting

### Common Development Issues

**KV/R2 bindings undefined in dev**
- Ensure `.dev.vars` exists with required variables
- Check `setupDevPlatform()` is called in `next.config.ts`
- Restart dev server after changing `.dev.vars`

**Type errors with Cloudflare types**
- Use `@cloudflare/workers-types` for KV/R2 types
- Import types from `@/lib/cf-env` for `AppEnv`

**Tests failing with "fetch is not defined"**
- Vitest runs in Node, not edge runtime
- Mock fetch in test setup or use `vi.stubGlobal`

**Build fails with "Dynamic server usage"**
- Ensure all API routes have `export const runtime = "edge"`
- Check for accidental use of Node.js APIs

### Debugging Tips
- Use `createLogger()` from `lib/logger.ts` for structured logs
- Check Cloudflare Pages logs in dashboard for production issues
- Use `/api/health` endpoint to verify bindings are working
