# Deployment Guide

Complete guide for deploying ImageSearchReverse to Cloudflare Pages with all required bindings and configurations.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Cloudflare Setup](#cloudflare-setup)
- [Environment Variables](#environment-variables)
- [Deployment Methods](#deployment-methods)
- [CI/CD Pipeline](#cicd-pipeline)
- [Post-Deployment](#post-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts

1. **Cloudflare Account** with:
   - Pages enabled
   - R2 storage enabled
   - Workers KV enabled

2. **DataForSEO Account** for reverse image search API

### Required Tools

```bash
# Node.js 20+
node --version  # v20.x.x

# npm 9+
npm --version   # 9.x.x

# Wrangler CLI
npm install -g wrangler
wrangler --version  # 3.x.x

# Authenticate with Cloudflare
wrangler login
```

## Cloudflare Setup

### 1. Create KV Namespace

```bash
# Create production KV namespace
wrangler kv:namespace create "KV_RATE_LIMIT"
# Output: { binding = "KV_RATE_LIMIT", id = "xxx" }

# Create preview KV namespace (for staging)
wrangler kv:namespace create "KV_RATE_LIMIT" --preview
# Output: { binding = "KV_RATE_LIMIT", preview_id = "yyy" }
```

Update `wrangler.toml` with the IDs:

```toml
[[kv_namespaces]]
binding = "KV_RATE_LIMIT"
id = "xxx"           # Production ID
preview_id = "yyy"   # Preview/staging ID
```

### 2. Create R2 Bucket

```bash
# Create R2 bucket
wrangler r2 bucket create img-search-temp

# Verify bucket exists
wrangler r2 bucket list
```

Update `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "img-search-temp"
```

### 3. Configure R2 Public Access

1. Go to Cloudflare Dashboard > R2
2. Select your bucket
3. Click "Settings" > "Public Access"
4. Enable public access and note the public URL
5. Set `NEXT_PUBLIC_R2_DOMAIN` to this URL

### 4. Create Pages Project

```bash
# Create Pages project (first deployment)
wrangler pages project create imagesearchreverse

# For staging environment
wrangler pages project create imagesearchreverse-staging
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DFS_LOGIN` | DataForSEO login | `your_login` |
| `DFS_PASSWORD` | DataForSEO password | `your_password` |
| `DFS_ENDPOINT_POST` | Task creation endpoint | `https://api.dataforseo.com/v3/serp/google/search_by_image/task_post` |
| `DFS_ENDPOINT_GET` | Task retrieval endpoint | `https://api.dataforseo.com/v3/serp/google/search_by_image/task_get/advanced` |
| `NEXT_PUBLIC_R2_DOMAIN` | Public R2 bucket URL | `https://pub-xxx.r2.dev` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret | - |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key | - |
| `NEXT_PUBLIC_SITE_URL` | Site base URL | - |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console token | - |

### Setting Secrets via CLI

```bash
# Set secrets for production
wrangler pages secret put DFS_LOGIN --project-name=imagesearchreverse
wrangler pages secret put DFS_PASSWORD --project-name=imagesearchreverse
wrangler pages secret put TURNSTILE_SECRET_KEY --project-name=imagesearchreverse

# Set secrets for staging
wrangler pages secret put DFS_LOGIN --project-name=imagesearchreverse-staging
```

### Setting Variables via Dashboard

1. Go to Cloudflare Dashboard > Pages
2. Select your project
3. Go to Settings > Environment Variables
4. Add variables for Production and Preview environments

## Deployment Methods

### Method 1: Automated Script (Recommended)

```bash
# Deploy to production
./deploy.sh production

# Deploy to staging
./deploy.sh staging

# Validate build without deploying
./deploy.sh validate

# Check health after deployment
./deploy.sh health
```

The script performs:
1. Environment variable validation
2. Type checking (`npm run typecheck`)
3. Linting (`npm run lint`)
4. Tests (`npm run test`)
5. Build (`npm run pages:build`)
6. Deployment via Wrangler
7. Post-deployment health check

### Method 2: npm Scripts

```bash
# Full deployment
npm run deploy

# Rollback
npm run deploy:rollback
```

### Method 3: Manual Wrangler

```bash
# Build for Cloudflare Pages
npm run pages:build

# Deploy
wrangler pages deploy .vercel/output/static --project-name=imagesearchreverse
```

### Method 4: GitHub Actions (CI/CD)

Push to `main` branch triggers automatic deployment. See [CI/CD Pipeline](#cicd-pipeline).

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline (`.github/workflows/ci.yml`) runs on:
- Push to `main` branch
- Pull requests

### Pipeline Stages

```
1. Checkout Code
       │
       v
2. Setup Node.js 20
       │
       v
3. Install Dependencies
       │
       v
4. Lint Check ──────────────┐
       │                    │
       v                    │ Parallel
5. Type Check ──────────────┤
       │                    │
       v                    │
6. Run Tests ───────────────┘
       │
       v
7. Build Application
       │
       v
8. Deploy (main branch only)
       │
       v
9. Health Check
```

### Required GitHub Secrets

Set these in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Creating Cloudflare API Token

1. Go to Cloudflare Dashboard > My Profile > API Tokens
2. Create Token > Custom Token
3. Permissions:
   - Account > Cloudflare Pages > Edit
   - Account > Workers KV Storage > Edit
   - Account > Workers R2 Storage > Edit
4. Copy token and add to GitHub secrets

## Post-Deployment

### Health Check

```bash
# Check production health
curl https://imagesearchreverse.com/api/health

# Check staging health
curl https://staging.imagesearchreverse.com/api/health

# Using deploy script
./deploy.sh health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "kv": { "healthy": true, "latency": 5 },
    "r2": { "healthy": true, "latency": 10 },
    "dataforseo": { "healthy": true, "latency": 150 }
  }
}
```

### Verify Deployment

1. **Check Pages Dashboard**: Cloudflare Dashboard > Pages > Your Project
2. **Test Search**: Upload an image and verify results
3. **Check Logs**: Cloudflare Dashboard > Pages > Functions > Logs
4. **Run Lighthouse**: Chrome DevTools > Lighthouse > Analyze

### DNS Configuration

If using custom domain:

1. Go to Cloudflare Dashboard > Pages > Your Project > Custom Domains
2. Add your domain
3. Configure DNS:
   ```
   Type: CNAME
   Name: @ (or subdomain)
   Target: imagesearchreverse.pages.dev
   ```

## Rollback Procedures

### Quick Rollback

```bash
# Using deploy script
./deploy.sh rollback

# Using npm
npm run deploy:rollback
```

### Manual Rollback

```bash
# List recent deployments
wrangler pages deployment list --project-name=imagesearchreverse

# Output:
# Deployment ID                          Created              Branch
# abc123-def456-...                      2024-01-15 10:30     main
# xyz789-uvw012-...                      2024-01-14 15:45     main

# Rollback to specific deployment
wrangler pages deployment rollback --project-name=imagesearchreverse --deployment-id=xyz789-uvw012-...
```

### Rollback via Dashboard

1. Go to Cloudflare Dashboard > Pages > Your Project
2. Click "Deployments"
3. Find the deployment to restore
4. Click "..." > "Rollback to this deployment"

### Emergency Procedures

If the site is completely down:

1. **Check Cloudflare Status**: https://www.cloudflarestatus.com/
2. **Check Pages Logs**: Dashboard > Pages > Functions > Logs
3. **Rollback Immediately**: Use the quickest method available
4. **Disable Problematic Features**: Use environment variables to disable features
5. **Contact Support**: Cloudflare support for infrastructure issues

## Troubleshooting

### Build Failures

**Error: Peer dependency conflicts**
```bash
# Solution: Use legacy peer deps
npm install --legacy-peer-deps
```

**Error: TypeScript errors**
```bash
# Check types locally first
npm run typecheck
```

**Error: ESLint errors**
```bash
# Fix automatically
npm run lint:fix
```

### Deployment Failures

**Error: Missing environment variables**
```bash
# Verify all required vars are set
wrangler pages secret list --project-name=imagesearchreverse
```

**Error: KV binding not found**
```bash
# Verify KV namespace exists
wrangler kv:namespace list

# Check wrangler.toml has correct IDs
```

**Error: R2 bucket not found**
```bash
# Verify bucket exists
wrangler r2 bucket list

# Check wrangler.toml has correct bucket name
```

### Runtime Errors

**Error: Rate limit not working**
- Check KV namespace is bound correctly
- Verify KV_RATE_LIMIT binding in Pages settings

**Error: Image upload fails**
- Check R2 bucket permissions
- Verify R2_BUCKET binding in Pages settings
- Check NEXT_PUBLIC_R2_DOMAIN is correct

**Error: Search returns no results**
- Verify DataForSEO credentials
- Check DFS_* environment variables
- Test API credentials directly

### Health Check Failures

**KV unhealthy**
```bash
# Test KV directly
wrangler kv:key put --namespace-id=xxx test-key "test-value"
wrangler kv:key get --namespace-id=xxx test-key
```

**R2 unhealthy**
```bash
# Test R2 directly
echo "test" > test.txt
wrangler r2 object put img-search-temp/test.txt --file=test.txt
wrangler r2 object get img-search-temp/test.txt
```

**DataForSEO unhealthy**
```bash
# Test API directly
curl -u "login:password" https://api.dataforseo.com/v3/serp/google/search_by_image/live
```

## Monitoring

### Cloudflare Analytics

1. Go to Cloudflare Dashboard > Pages > Your Project
2. View "Analytics" tab for:
   - Request counts
   - Bandwidth usage
   - Error rates
   - Geographic distribution

### Real User Monitoring

Enable Cloudflare Web Analytics:
1. Dashboard > Analytics > Web Analytics
2. Add your site
3. Copy the beacon script (already included in CSP)

### Alerting

Set up alerts in Cloudflare:
1. Dashboard > Notifications
2. Create notification for:
   - Pages deployment failures
   - High error rates
   - Unusual traffic patterns

## Security Checklist

Before deploying to production:

- [ ] All secrets are set via `wrangler pages secret` (not in code)
- [ ] TURNSTILE_SECRET_KEY is set for bot protection
- [ ] R2 bucket has appropriate access controls
- [ ] CSP headers are configured correctly
- [ ] Rate limiting is enabled and tested
- [ ] Health endpoint is accessible
- [ ] Rollback procedure is tested

## Support

- **Cloudflare Status**: https://www.cloudflarestatus.com/
- **Cloudflare Docs**: https://developers.cloudflare.com/pages/
- **DataForSEO Docs**: https://docs.dataforseo.com/
- **Project Issues**: Contact hello@imagesearchreverse.com
