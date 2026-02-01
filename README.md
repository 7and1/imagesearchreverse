# ImageSearchReverse

Production-ready reverse image search built for a full Cloudflare stack (Pages + Workers + R2 + KV). Upload images or paste URLs to find original sources and visually similar matches with enterprise-grade security and UX.

## Features

- **Reverse Image Search**: Upload images or paste URLs to find visual matches
- **Enterprise Security**: SSRF protection, rate limiting, input sanitization
- **PWA Ready**: Installable as desktop/mobile app
- **Accessibility First**: WCAG 2.1 AA compliant, full keyboard navigation
- **Privacy Focused**: Temporary storage, rate limiting, no data selling
- **Developer API**: RESTful API for programmatic access
- **Circuit Breaker**: Fault tolerance for external API failures
- **Health Monitoring**: Comprehensive health check endpoint

## Architecture

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|  Browser/Client  +---->+  Cloudflare Edge  +---->+  DataForSEO API  |
|                  |     |  (Pages/Workers)  |     |                  |
+------------------+     +--------+----------+     +------------------+
                                  |
                    +-------------+-------------+
                    |             |             |
              +-----v----+  +----v-----+  +----v-----+
              |    R2    |  |    KV    |  | Turnstile|
              |  Bucket  |  | Storage  |  |  CAPTCHA |
              +----------+  +----------+  +----------+
```

## Stack

- **Next.js 15** (App Router) on Cloudflare Pages
- **Workers / Edge Runtime** for API routes
- **R2** for image storage
- **KV** for rate limiting and caching
- **DataForSEO** for reverse image search
- **TypeScript** for type safety
- **Vitest** for testing

## Requirements

- Node.js 20+
- Cloudflare account with Pages, R2, and KV enabled
- DataForSEO API credentials

## Quick Start

```bash
# Install dependencies (required due to peer dependency range mismatch)
npm install --legacy-peer-deps

# Copy environment variables
cp .dev.vars.example .dev.vars

# Start development server
npm run dev
```

## Environment Variables

```bash
# DataForSEO credentials (required)
DFS_LOGIN=your_login
DFS_PASSWORD=your_password
DFS_ENDPOINT_POST=https://api.dataforseo.com/v3/serp/google/search_by_image/task_post
DFS_ENDPOINT_GET=https://api.dataforseo.com/v3/serp/google/search_by_image/task_get/advanced

# R2 bucket domain (required)
NEXT_PUBLIC_R2_DOMAIN=https://your-bucket.r2.dev

# Site URL (required for SEO)
NEXT_PUBLIC_SITE_URL=https://imagesearchreverse.com

# Turnstile CAPTCHA (optional, enables anti-abuse)
TURNSTILE_SECRET_KEY=0x4AAA...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...
```

## Commands

```bash
# Development
npm run dev              # Start dev server

# Quality
npm run lint             # ESLint checks
npm run typecheck        # TypeScript validation
npm run test             # Run tests

# Build
npm run build            # Local Next.js build
npm run pages:build      # Build for Cloudflare Pages

# Deployment
npm run deploy           # Deploy to production
npm run deploy:rollback  # Rollback to previous version
./deploy.sh staging      # Deploy to staging
./deploy.sh validate     # Validate build only
./deploy.sh health       # Check health endpoint
```

## Deployment

```bash
# Build and deploy to Cloudflare Pages
npm run deploy

# Rollback if needed
npm run deploy:rollback
```

### Cloudflare Bindings

Configure these in Cloudflare Pages dashboard or `wrangler.toml`:

1. **KV Namespace** (`KV_RATE_LIMIT`): For rate limiting and caching
2. **R2 Bucket** (`R2_BUCKET`): For image uploads
3. **Environment Variables**: All non-public env vars
4. **Secrets**: `TURNSTILE_SECRET_KEY`, `DFS_*` credentials

## API Reference

### POST /api/search

Search by image URL.

```bash
curl -X POST https://imagesearchreverse.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

### POST /api/upload

Upload an image for searching.

```bash
curl -X POST https://imagesearchreverse.com/api/upload \
  -F "file=@photo.jpg"
```

### GET /api/search?taskId={id}

Check search status by task ID.

```bash
curl https://imagesearchreverse.com/api/search?taskId=abc123
```

### GET /api/health

Health check endpoint.

```bash
curl https://imagesearchreverse.com/api/health
```

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and design decisions |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guide and Cloudflare setup |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [CLAUDE.md](./CLAUDE.md) | AI assistant guidance |
| [QUICK_START.md](./QUICK_START.md) | Quick start guide |
| [PERFORMANCE.md](./PERFORMANCE.md) | Performance optimization details |
| [PWA_INSTALLATION.md](./PWA_INSTALLATION.md) | User installation guide |

## Security Features

- **SSRF Protection**: Cloud metadata endpoint blocking, DNS rebinding protection
- **Rate Limiting**: Atomic operations prevent race conditions
- **Input Sanitization**: Path traversal prevention, hash collision detection
- **IP Validation**: Spoofing protection, trusted proxy validation
- **CSP Headers**: Strict content security policy
- **Credential Safety**: No credential leakage in errors
- **Circuit Breaker**: Prevents cascading failures

## Performance

- **Bundle Size**: ~100 KB (47% reduction from baseline)
- **First Load JS**: ~115 KB for main page
- **Lighthouse Score**: ~92
- **Edge Rendering**: Sub-second TTI

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+U` | Open upload dialog |
| `Ctrl+V` | Focus URL input |
| `Ctrl+Enter` | Submit search |
| `Esc` | Close modals |
| `Ctrl+Shift+?` | Toggle shortcuts help |

## License

MIT

## Support

For issues or questions, contact hello@imagesearchreverse.com
