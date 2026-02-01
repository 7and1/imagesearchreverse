# Architecture Guide

Comprehensive technical architecture documentation for ImageSearchReverse.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Component Details](#component-details)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Design Decisions](#design-decisions)
- [Scalability](#scalability)
- [Security Architecture](#security-architecture)

## System Overview

ImageSearchReverse is a reverse image search application built on a serverless edge architecture using Cloudflare's infrastructure. The system is designed for:

- **Low Latency**: Edge deployment ensures sub-100ms response times globally
- **High Availability**: Cloudflare's global network provides 99.99% uptime
- **Cost Efficiency**: Pay-per-request model with no idle costs
- **Security**: Multiple layers of protection against abuse

## Architecture Diagram

```
                                    INTERNET
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUDFLARE EDGE NETWORK                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Cloudflare Pages                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │   Static    │  │  /api/      │  │  /api/      │  │  /api/     │  │   │
│  │  │   Assets    │  │  search     │  │  upload     │  │  health    │  │   │
│  │  │  (Next.js)  │  │  (Edge)     │  │  (Edge)     │  │  (Edge)    │  │   │
│  │  └─────────────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │   │
│  └──────────────────────────┼───────────────┼────────────────┼─────────┘   │
│                             │               │                │             │
│  ┌──────────────────────────┼───────────────┼────────────────┼─────────┐   │
│  │                          ▼               ▼                ▼         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Cloudflare Bindings                       │   │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │   │
│  │  │  │     KV      │  │     R2      │  │     Turnstile       │  │   │   │
│  │  │  │  Namespace  │  │   Bucket    │  │      CAPTCHA        │  │   │   │
│  │  │  │             │  │             │  │                     │  │   │   │
│  │  │  │ • Rate Limit│  │ • Image     │  │ • Bot Protection    │  │   │   │
│  │  │  │ • Cache     │  │   Storage   │  │ • Token Verify      │  │   │   │
│  │  │  │ • Task Map  │  │ • Temp Files│  │                     │  │   │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                    ┌───────────────────────────────────────┐
                    │           EXTERNAL SERVICES           │
                    │  ┌─────────────────────────────────┐  │
                    │  │         DataForSEO API          │  │
                    │  │                                 │  │
                    │  │  • Task Creation (POST)         │  │
                    │  │  • Result Retrieval (GET)       │  │
                    │  │  • Image Analysis               │  │
                    │  └─────────────────────────────────┘  │
                    └───────────────────────────────────────┘
```

## Component Details

### Frontend (Next.js 15 App Router)

```
src/app/
├── layout.tsx          # Root layout with metadata, fonts, PWA
├── page.tsx            # Home page with search interface
├── manifest.ts         # PWA manifest generation
├── robots.ts           # SEO robots.txt
├── sitemap.ts          # SEO sitemap
├── help/               # Help documentation
├── privacy/            # Privacy policy
├── terms/              # Terms of service
└── api/                # Edge API routes
    ├── search/         # Main search endpoint
    ├── upload/         # Image upload handler
    └── health/         # Health check endpoint
```

**Key Features:**
- Server-side rendering for SEO
- Edge runtime for API routes
- Progressive Web App support
- Tailwind CSS v4 for styling

### API Layer (Edge Workers)

#### `/api/search` - Search Endpoint

```typescript
// Request flow
POST /api/search
├── Validate Turnstile token (optional)
├── Check rate limit (KV)
├── Check cache (KV)
│   └── Return cached if exists
├── Create DataForSEO task
├── Poll for results
├── Cache results (KV)
└── Return results

GET /api/search?taskId=xxx
├── Lookup task mapping (KV)
├── Check cache (KV)
├── Poll DataForSEO if pending
└── Return results or status
```

#### `/api/upload` - Upload Endpoint

```typescript
// Request flow
POST /api/upload (multipart/form-data)
├── Validate file type and size
├── Generate unique filename
├── Upload to R2 bucket
└── Return public URL
```

#### `/api/health` - Health Check

```typescript
// Checks performed
GET /api/health
├── KV connectivity test
├── R2 connectivity test
├── DataForSEO API test
└── Return aggregated status
```

### Library Layer

```
src/lib/
├── cf-env.ts              # Cloudflare bindings access
├── circuit-breaker.ts     # Fault tolerance pattern
├── crypto.ts              # SHA-256 hashing
├── dataforseo.ts          # DataForSEO API client
├── errors.ts              # Error handling utilities
├── image.ts               # Image validation
├── image-compression.ts   # Client-side compression
├── logger.ts              # Structured logging
├── rate-limit.ts          # KV-based rate limiting
├── request-deduplication.ts # Prevent duplicate requests
├── request-id.ts          # Request tracking
├── search-cache.ts        # Result caching
├── turnstile.ts           # CAPTCHA verification
└── url-validation.ts      # URL security validation
```

### Storage Layer

#### KV Namespace (KV_RATE_LIMIT)

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `limit:{ip}:{date}` | Daily rate limit counter | 24h |
| `cache:img:hash:{hash}` | Search result cache | 48h |
| `cache:img:url:{hash}` | URL-based cache | 48h |
| `task:img:{taskId}` | Task to cache key mapping | 48h |

#### R2 Bucket (R2_BUCKET)

```
img-search-temp/
└── uploads/
    └── YYYY-MM-DD/
        └── {uuid}.{ext}
```

- **Retention**: Temporary storage (consider lifecycle rules)
- **Access**: Public read via R2 public URL
- **Organization**: Date-based folders for easy cleanup

## Data Flow

### Search by URL Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Search  │────▶│   Cache  │────▶│  Return  │
│          │     │   API    │     │   Check  │     │  Cached  │
└──────────┘     └────┬─────┘     └────┬─────┘     └──────────┘
                      │                │ Miss
                      │                ▼
                      │          ┌──────────┐
                      │          │   Rate   │
                      │          │  Limit   │
                      │          └────┬─────┘
                      │               │ OK
                      │               ▼
                      │          ┌──────────┐     ┌──────────┐
                      │          │DataForSEO│────▶│  Cache   │
                      │          │   API    │     │  Store   │
                      │          └────┬─────┘     └──────────┘
                      │               │
                      ▼               ▼
                 ┌──────────────────────────┐
                 │      Return Results      │
                 └──────────────────────────┘
```

### Search by Upload Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Upload  │────▶│    R2    │────▶│  Public  │
│  Image   │     │   API    │     │  Bucket  │     │   URL    │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
                      ┌─────────────────────────────────┘
                      ▼
                 ┌──────────┐
                 │  Search  │ (Same as URL flow)
                 │   API    │
                 └──────────┘
```

### Async Task Polling Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Search  │────▶│DataForSEO│
│  POST    │     │   API    │     │Task POST │
└──────────┘     └────┬─────┘     └────┬─────┘
                      │                │
                      │ taskId         │ Task Created
                      ▼                │
                 ┌──────────┐          │
                 │  Return  │◀─────────┘
                 │ Pending  │
                 └────┬─────┘
                      │
        ┌─────────────┴─────────────┐
        │     Client Polling        │
        ▼                           │
   ┌──────────┐     ┌──────────┐    │
   │  Search  │────▶│DataForSEO│    │
   │ GET ?id  │     │ Task GET │    │
   └────┬─────┘     └────┬─────┘    │
        │                │          │
        │ Still Pending  │          │
        └────────────────┼──────────┘
                         │
                         │ Complete
                         ▼
                    ┌──────────┐
                    │  Return  │
                    │ Results  │
                    └──────────┘
```

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.5.x | React framework with App Router |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |

### Cloudflare Services

| Service | Purpose |
|---------|---------|
| Pages | Static hosting + Edge Functions |
| Workers KV | Key-value storage |
| R2 | Object storage |
| Turnstile | Bot protection |

### External APIs

| Service | Purpose |
|---------|---------|
| DataForSEO | Reverse image search |

### Development Tools

| Tool | Purpose |
|------|---------|
| Vitest | Unit testing |
| ESLint | Code linting |
| Wrangler | Cloudflare CLI |

## Design Decisions

### Why Cloudflare Pages over Vercel?

| Factor | Cloudflare | Vercel |
|--------|------------|--------|
| Edge Runtime | Native Workers | Edge Functions |
| Storage | R2 + KV integrated | External services |
| Pricing | Generous free tier | Usage-based |
| Global Network | 300+ PoPs | 100+ PoPs |

**Decision**: Cloudflare provides tighter integration between compute and storage, with better pricing for our use case.

### Why KV for Rate Limiting?

| Option | Pros | Cons |
|--------|------|------|
| KV | Fast, global, atomic | Eventually consistent |
| Durable Objects | Strongly consistent | Higher latency, cost |
| D1 | SQL queries | Overkill for counters |

**Decision**: KV's eventual consistency is acceptable for rate limiting. The atomic increment pattern with retry logic handles race conditions adequately.

### Why Async Task Polling?

DataForSEO's image search can take 5-30 seconds. Options considered:

| Option | Pros | Cons |
|--------|------|------|
| Sync wait | Simple | Timeout risk, poor UX |
| Webhooks | Real-time | Requires public endpoint |
| Polling | Reliable | More requests |

**Decision**: Polling provides the best balance of reliability and simplicity. The client polls every 2 seconds with exponential backoff.

### Why Circuit Breaker Pattern?

External API failures can cascade. The circuit breaker:

1. **Closed**: Normal operation, requests pass through
2. **Open**: After 5 failures, reject requests immediately
3. **Half-Open**: After 30s, allow limited requests to test recovery

```typescript
// Configuration
failureThreshold: 5      // Open after 5 failures
resetTimeoutMs: 30000    // Try again after 30s
halfOpenMaxCalls: 3      // Allow 3 test requests
```

### Why Optional Turnstile?

| Scenario | Turnstile |
|----------|-----------|
| Development | Disabled |
| Low-traffic production | Optional |
| High-traffic production | Required |

**Decision**: Make Turnstile optional via environment variable. This allows flexibility during development and gradual rollout.

## Scalability

### Current Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| KV reads | 100,000/day (free) | Scales with plan |
| KV writes | 1,000/day (free) | Scales with plan |
| R2 storage | 10GB (free) | Scales with plan |
| R2 operations | 1M/month (free) | Scales with plan |
| Workers requests | 100,000/day (free) | Scales with plan |

### Scaling Strategies

#### Horizontal Scaling (Automatic)

Cloudflare Pages automatically scales across their global network. No configuration needed.

#### Caching Strategy

```
Request → Cache Check → Hit? → Return Cached
                ↓ Miss
         Rate Limit → DataForSEO → Cache Store → Return
```

- **Cache TTL**: 48 hours for search results
- **Cache Key**: SHA-256 hash of image URL or content hash
- **Hit Rate Target**: >60% for repeated searches

#### Rate Limiting

```
Daily Limit: 10 searches per IP
Reset: Midnight UTC
Storage: KV with 24h TTL
```

### Future Scaling Considerations

1. **Durable Objects**: For real-time collaboration features
2. **Queues**: For background processing
3. **D1**: For complex queries and analytics
4. **Workers Analytics Engine**: For usage metrics

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Cloudflare Edge                                    │
│ • DDoS protection                                           │
│ • WAF rules                                                 │
│ • Bot management                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Application                                        │
│ • Turnstile CAPTCHA                                         │
│ • Rate limiting                                             │
│ • Input validation (Zod)                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: API Security                                       │
│ • SSRF protection                                           │
│ • URL validation                                            │
│ • Request ID tracking                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Data Security                                      │
│ • Secrets in environment variables                          │
│ • No credential logging                                     │
│ • Temporary file storage                                    │
└─────────────────────────────────────────────────────────────┘
```

### Security Headers

```typescript
// Configured in next.config.ts
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### SSRF Protection

```typescript
// URL validation checks
- Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
- Block localhost and loopback
- Block cloud metadata endpoints (169.254.169.254)
- Block internal hostnames
- Validate URL scheme (https only in production)
```

### Rate Limiting Implementation

```typescript
// Atomic counter with retry
async checkRateLimit(kv, ip, limit = 10) {
  const key = `limit:${ip}:${date}`;
  const count = await kv.get(key);
  if (count >= limit) return { allowed: false };
  await kv.put(key, count + 1, { expirationTtl: 86400 });
  return { allowed: true, remaining: limit - count - 1 };
}
```

## Monitoring and Observability

### Logging Strategy

```typescript
// Structured logging with context
logger.info("Search completed", {
  requestId: "xxx",
  duration: 1234,
  cached: false,
  resultCount: 10
});
```

### Health Checks

```typescript
// /api/health response
{
  "status": "healthy",
  "checks": {
    "kv": { "healthy": true, "latency": 5 },
    "r2": { "healthy": true, "latency": 10 },
    "dataforseo": { "healthy": true, "latency": 150 }
  }
}
```

### Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Error rate | Cloudflare Analytics | >1% |
| P95 latency | Cloudflare Analytics | >3s |
| Cache hit rate | Custom logging | <50% |
| Rate limit hits | KV queries | Unusual spikes |

## Future Architecture Considerations

### Potential Enhancements

1. **Service Worker**: Offline support and advanced caching
2. **WebSocket**: Real-time search progress updates
3. **Multi-region R2**: Faster uploads globally
4. **Search History**: User accounts with D1 storage
5. **API Keys**: Developer API with usage tracking

### Migration Path to OpenNext

The current `@cloudflare/next-on-pages` adapter is deprecated. Future migration:

```
Current: Next.js → @cloudflare/next-on-pages → Cloudflare Pages
Future:  Next.js → OpenNext → Cloudflare Pages
```

OpenNext provides better compatibility with Next.js features and is actively maintained.
