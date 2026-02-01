# ImageSearchReverse Runbook

Operational runbook for ImageSearchReverse application. This document provides guidance for common operational tasks, incident response, and debugging.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Health Checks](#health-checks)
- [Incident Response](#incident-response)
- [Common Issues](#common-issues)
- [Debugging Guide](#debugging-guide)
- [Escalation Paths](#escalation-paths)

---

## Quick Reference

### Key URLs

| Environment | URL |
|-------------|-----|
| Production | `https://imagesearchreverse.com` |
| Health Check | `https://imagesearchreverse.com/api/health` |
| Detailed Health | `https://imagesearchreverse.com/api/health?detailed=true` |
| Metrics | `https://imagesearchreverse.com/api/metrics` |

### Key Dashboards

- Grafana: `[Your Grafana URL]/d/imagesearchreverse`
- Cloudflare Analytics: `https://dash.cloudflare.com/[account]/pages/view/imagesearchreverse`

### Critical Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | [PagerDuty/OpsGenie rotation] |
| Platform Team | #platform-support |
| DataForSEO Support | support@dataforseo.com |

---

## Health Checks

### Interpreting Health Status

```bash
# Basic health check
curl -s https://imagesearchreverse.com/api/health | jq .

# Detailed health check with service latencies
curl -s "https://imagesearchreverse.com/api/health?detailed=true" | jq .
```

**Status Values:**
- `healthy` - All services operational
- `degraded` - Some services failing, partial functionality
- `unhealthy` - All services failing
- `error` - Health check itself failed

### Service Dependencies

| Service | Purpose | Impact if Down |
|---------|---------|----------------|
| KV (Cloudflare KV) | Rate limiting, caching | Rate limits not enforced, no caching |
| R2 (Cloudflare R2) | Image storage | Cannot upload images |
| DataForSEO | Reverse image search API | Search functionality unavailable |

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| SEV1 | Complete outage | 15 minutes | All services down, circuit breaker open |
| SEV2 | Major degradation | 30 minutes | High error rate (>20%), critical latency |
| SEV3 | Minor degradation | 2 hours | Single service degraded, elevated errors |
| SEV4 | Informational | Next business day | Low cache hit rate, rate limit hits |

### Initial Response Checklist

1. **Acknowledge the alert** in your alerting system
2. **Check health endpoint**: `curl -s "https://imagesearchreverse.com/api/health?detailed=true" | jq .`
3. **Check metrics**: `curl -s "https://imagesearchreverse.com/api/metrics"`
4. **Review recent deployments** in Cloudflare Pages dashboard
5. **Check Cloudflare status**: https://www.cloudflarestatus.com/
6. **Check DataForSEO status**: https://status.dataforseo.com/

### Communication Template

```
[INCIDENT] ImageSearchReverse - [Brief Description]

Status: Investigating / Identified / Monitoring / Resolved
Impact: [User-facing impact]
Start Time: [UTC timestamp]

Current Actions:
- [What is being done]

Updates will be posted every [15/30] minutes.
```

---

## Common Issues

### Service Down

**Symptoms:** Health check returns 503, `up` metric is 0

**Diagnosis:**
```bash
# Check if the service is responding at all
curl -I https://imagesearchreverse.com/api/health

# Check Cloudflare Pages deployment status
# Via Cloudflare Dashboard or wrangler CLI
```

**Resolution:**
1. Check Cloudflare Pages dashboard for deployment errors
2. Review recent commits for breaking changes
3. If deployment issue, rollback: `npm run deploy:rollback`
4. If Cloudflare outage, wait for resolution and monitor status page

---

### Health Check Failing

**Symptoms:** `health_check_status{service="X"} == 0`

**Diagnosis:**
```bash
# Get detailed health info
curl -s "https://imagesearchreverse.com/api/health?detailed=true" | jq '.checks'
```

**Resolution by Service:**

#### KV Failing
1. Check Cloudflare KV status
2. Verify KV namespace binding in Pages settings
3. Check for KV quota limits

#### R2 Failing
1. Check Cloudflare R2 status
2. Verify R2 bucket binding in Pages settings
3. Check bucket permissions

#### DataForSEO Failing
1. Check DataForSEO status page
2. Verify API credentials are valid
3. Check account balance/quota
4. Review circuit breaker state

---

### High Latency

**Symptoms:** `http_request_duration_ms` p95 > 5000ms

**Diagnosis:**
```bash
# Check metrics for latency breakdown
curl -s "https://imagesearchreverse.com/api/metrics" | grep duration

# Check DataForSEO latency specifically
curl -s "https://imagesearchreverse.com/api/metrics" | grep dataforseo_duration
```

**Resolution:**
1. If DataForSEO is slow:
   - Check their status page
   - Consider increasing timeout thresholds temporarily
   - Monitor circuit breaker state

2. If KV/R2 is slow:
   - Check Cloudflare status
   - Review recent traffic patterns for unusual spikes

3. If application code is slow:
   - Review recent deployments
   - Check for memory/CPU issues in Cloudflare analytics

---

### Critical Latency

**Symptoms:** `http_request_duration_ms` p95 > 10000ms

**Immediate Actions:**
1. Check if circuit breaker has tripped
2. Consider enabling maintenance mode if user experience is severely impacted
3. Escalate to SEV1 if not already

---

### High Error Rate

**Symptoms:** 5xx error rate > 5%

**Diagnosis:**
```bash
# Check error breakdown
curl -s "https://imagesearchreverse.com/api/metrics" | grep 'status="5'

# Check application logs in Cloudflare
# Via Cloudflare Dashboard > Pages > Functions > Logs
```

**Resolution:**
1. Identify the failing endpoint from metrics
2. Check logs for error details
3. If DataForSEO errors, check circuit breaker state
4. If validation errors, check for malformed requests
5. If infrastructure errors, check Cloudflare status

---

### Critical Error Rate

**Symptoms:** 5xx error rate > 20%

**Immediate Actions:**
1. Declare SEV1 incident
2. Check if rollback is needed
3. Enable maintenance mode if necessary
4. Engage on-call team

---

### Circuit Breaker Open

**Symptoms:** `circuit_breaker_state{service="dataforseo"} == 2`

**Impact:** Search functionality is completely unavailable

**Diagnosis:**
```bash
# Check circuit breaker metrics
curl -s "https://imagesearchreverse.com/api/health?detailed=true" | jq '.circuitBreaker'
```

**Resolution:**
1. Check DataForSEO status and health
2. Wait for automatic recovery (30 seconds default)
3. If DataForSEO is healthy but circuit remains open:
   - May need to restart workers (redeploy)
4. If DataForSEO is down:
   - Wait for their recovery
   - Consider displaying maintenance message to users

---

### Circuit Breaker Half-Open

**Symptoms:** `circuit_breaker_state{service="dataforseo"} == 1`

**Impact:** Limited search functionality, testing recovery

**Resolution:**
1. Monitor closely - system is testing if DataForSEO has recovered
2. If requests succeed, circuit will close automatically
3. If requests fail, circuit will open again
4. No action needed unless state persists > 5 minutes

---

### Rate Limit Hits

**Symptoms:** Elevated `rate_limit_hits_total`

**Diagnosis:**
```bash
# Check rate limit metrics
curl -s "https://imagesearchreverse.com/api/metrics" | grep rate_limit
```

**Resolution:**
1. Review if hits are from legitimate users or potential abuse
2. If legitimate traffic spike:
   - Consider temporarily increasing limits
   - Add capacity if sustained
3. If abuse:
   - Identify source IPs (check Cloudflare analytics)
   - Consider adding WAF rules

---

### Low Cache Hit Rate

**Symptoms:** Cache hit rate < 30%

**Diagnosis:**
```bash
# Check cache metrics
curl -s "https://imagesearchreverse.com/api/metrics" | grep cache
```

**Resolution:**
1. Check if this correlates with new traffic patterns
2. Verify KV is healthy
3. Review cache TTL settings
4. Check if cache keys are being generated correctly

---

### Search Success Low

**Symptoms:** Search success rate < 80%

**Diagnosis:**
```bash
# Check search metrics by status
curl -s "https://imagesearchreverse.com/api/metrics" | grep search_requests
```

**Resolution:**
1. Identify which status is elevated (error, rate_limited, etc.)
2. If errors: Check DataForSEO health and logs
3. If rate_limited: Review rate limit configuration
4. If cached but failing: Check cache data integrity

---

### No Traffic

**Symptoms:** No search requests for extended period

**Diagnosis:**
1. Check if this is expected (maintenance window, off-hours)
2. Verify DNS is resolving correctly
3. Check Cloudflare for any blocks or challenges

**Resolution:**
1. If unexpected, check:
   - DNS propagation
   - Cloudflare WAF rules
   - Recent deployments that might have broken routing

---

## Debugging Guide

### Viewing Logs

**Cloudflare Pages Logs:**
1. Go to Cloudflare Dashboard
2. Navigate to Pages > imagesearchreverse
3. Click on "Functions" tab
4. View real-time logs or filter by time range

**Log Format:**
```json
{
  "level": "info|warn|error|debug",
  "context": "api:search",
  "message": "Search completed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "uuid",
  "traceId": "32-char-hex",
  "spanId": "16-char-hex",
  "durationMs": 1234
}
```

### Tracing Requests

Use the `x-request-id` header to trace requests:

```bash
# Make a request with custom request ID
curl -H "x-request-id: debug-$(date +%s)" \
  "https://imagesearchreverse.com/api/health"

# Search logs for that request ID
```

### Testing Locally

```bash
# Run local development server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health

# Test metrics endpoint
curl http://localhost:3000/api/metrics
```

---

## Escalation Paths

### Level 1: On-Call Engineer
- First responder for all alerts
- Can perform standard runbook procedures
- Escalates if issue persists > 30 minutes or is SEV1

### Level 2: Platform Team
- Engaged for infrastructure issues
- Cloudflare configuration problems
- Performance optimization

### Level 3: External Vendors
- **DataForSEO**: API issues, account problems
- **Cloudflare**: Platform outages, edge issues

### Escalation Triggers

| Condition | Escalate To |
|-----------|-------------|
| Issue persists > 30 min | Level 2 |
| SEV1 incident | Level 2 immediately |
| Cloudflare platform issue | Cloudflare support |
| DataForSEO API down | DataForSEO support |
| Security incident | Security team |

---

## Maintenance Procedures

### Deploying Updates

```bash
# Standard deployment
npm run deploy

# Rollback to previous version
npm run deploy:rollback
```

### Updating Environment Variables

1. Go to Cloudflare Dashboard > Pages > imagesearchreverse
2. Navigate to Settings > Environment variables
3. Update the variable
4. Redeploy for changes to take effect

### Rotating API Keys

1. Generate new key in DataForSEO dashboard
2. Update `DFS_LOGIN` and `DFS_PASSWORD` in Cloudflare Pages
3. Redeploy
4. Verify health check passes
5. Revoke old key in DataForSEO dashboard

---

## Appendix

### Metric Reference

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, path, status |
| `http_request_duration_ms` | Histogram | Request latency distribution |
| `search_requests_total` | Counter | Search requests by status |
| `search_duration_ms` | Histogram | Search latency distribution |
| `cache_hits_total` | Counter | Cache hit count |
| `cache_misses_total` | Counter | Cache miss count |
| `rate_limit_hits_total` | Counter | Rate limit enforcement count |
| `dataforseo_requests_total` | Counter | DataForSEO API calls |
| `dataforseo_duration_ms` | Histogram | DataForSEO API latency |
| `dataforseo_errors_total` | Counter | DataForSEO API errors |
| `circuit_breaker_state` | Gauge | Circuit breaker state (0=closed, 1=half-open, 2=open) |
| `health_check_status` | Gauge | Service health (0=unhealthy, 1=healthy) |
| `health_check_duration_ms` | Histogram | Health check latency |
| `app_uptime_seconds` | Gauge | Application uptime |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DFS_LOGIN` | Yes | DataForSEO API login |
| `DFS_PASSWORD` | Yes | DataForSEO API password |
| `DFS_ENDPOINT_POST` | Yes | DataForSEO POST endpoint |
| `DFS_ENDPOINT_GET` | Yes | DataForSEO GET endpoint |
| `NEXT_PUBLIC_R2_DOMAIN` | Yes | R2 bucket public domain |
| `TURNSTILE_SECRET_KEY` | No | Cloudflare Turnstile secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile site key |
| `NEXT_PUBLIC_SITE_URL` | No | Site base URL |
| `NEXT_PUBLIC_APP_VERSION` | No | Application version |
