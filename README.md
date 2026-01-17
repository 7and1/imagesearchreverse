# ImageSearchReverse

Production-ready reverse image search built for a full Cloudflare stack (Pages + Workers + R2 + KV). Upload images or paste URLs to find original sources and visually similar matches with enterprise-grade security and UX.

## Features

- **Reverse Image Search**: Upload images or paste URLs to find visual matches
- **Enterprise Security**: SSRF protection, rate limiting, input sanitization
- **PWA Ready**: Installable as desktop/mobile app
- **Accessibility First**: WCAG 2.1 AA compliant, full keyboard navigation
- **Privacy Focused**: Temporary storage, rate limiting, no data selling
- **Developer API**: RESTful API for programmatic access

## Stack

- **Next.js 15** (App Router) on Cloudflare Pages
- **Workers / Edge Runtime** for API routes
- **R2** for image storage
- **KV** for rate limiting and caching
- **DataForSEO** for reverse image search
- **TypeScript** for type safety
- **Vitest** for testing (162 tests)

## Requirements

- Node.js 20+
- Cloudflare account with Pages, R2, and KV enabled
- DataForSEO API credentials

## Quick Start

```bash
# Install dependencies (required due to peer dependency range mismatch)
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env.local

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

# Google Search Console (optional)
GOOGLE_SITE_VERIFICATION=your_token
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

## Testing

```bash
# Run tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build
```

## Documentation

- **`QUICK_START.md`** - Quick start guide
- **`PERFORMANCE.md`** - Performance optimization details
- **`PWA_INSTALLATION.md`** - User installation guide
- **`ICON_REQUIREMENTS.md`** - Icon creation guidelines
- **`IMPLEMENTATION_SUMMARY.md`** - Technical implementation details

## API Reference

### POST /api/search

Search by uploaded image.

```bash
curl -X POST https://imagesearchreverse.com/api/search \
  -F "image=@photo.jpg" \
  -F "turnstile=token"
```

### POST /api/search

Search by image URL.

```bash
curl -X POST https://imagesearchreverse.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

### GET /api/search

Check search status by task ID.

```bash
curl https://imagesearchreverse.com/api/search?taskId=abc123
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Main search interface |
| `/help` | Help documentation and FAQ |
| `/settings` | User preferences |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/manifest.webmanifest` | PWA manifest |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+U` | Open upload dialog |
| `Ctrl+V` | Focus URL input |
| `Ctrl+Enter` | Submit search |
| `Esc` | Close modals |
| `Ctrl+Shift+?` | Toggle shortcuts help |

## Security Features

- **SSRF Protection**: Cloud metadata endpoint blocking, DNS rebinding protection
- **Rate Limiting**: Atomic operations prevent race conditions
- **Input Sanitization**: Path traversal prevention, hash collision detection
- **IP Validation**: Spoofing protection, trusted proxy validation
- **CSP Headers**: Strict content security policy
- **Credential Safety**: No credential leakage in errors

## Performance

- **Bundle Size**: 102 KB (47% reduction from baseline)
- **First Load JS**: 114 KB for main page
- **Lighthouse Score**: ~92
- **Edge Rendering**: Sub-second TTI

## License

MIT

## Support

For issues or questions, contact hello@imagesearchreverse.com
