#!/bin/bash
set -euo pipefail

# Production deployment script for ImageSearchReverse
# Usage: ./deploy.sh [environment|command]
# Examples:
#   ./deploy.sh                    # Deploy to production (with confirmation)
#   ./deploy.sh staging            # Deploy to staging
#   ./deploy.sh rollback           # Rollback to previous version
#   ./deploy.sh health             # Check health endpoint
#   ./deploy.sh validate           # Validate without deploying
#   ./deploy.sh status             # Show deployment status
#   ./deploy.sh logs               # Show recent logs
#   ./deploy.sh --yes production   # Deploy without confirmation

ENVIRONMENT=${1:-production}
SKIP_CONFIRMATION=false
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_START_TIME=$(date +%s)
LOG_FILE="${PROJECT_ROOT}/.deploy.log"

# Handle --yes flag for CI/CD
if [[ "$ENVIRONMENT" == "--yes" ]]; then
  SKIP_CONFIRMATION=true
  ENVIRONMENT=${2:-production}
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }
log_step() { echo -e "${CYAN}[STEP]${NC} ${BOLD}$1${NC}" | tee -a "$LOG_FILE"; }

# Initialize log file
init_log() {
  echo "=== Deployment started at $(date) ===" >> "$LOG_FILE"
  echo "Environment: $ENVIRONMENT" >> "$LOG_FILE"
  echo "Git branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')" >> "$LOG_FILE"
  echo "Git commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" >> "$LOG_FILE"
}

# Check required environment variables
check_env_vars() {
  log_step "Checking environment variables..."

  local required_vars=("CLOUDFLARE_API_TOKEN" "CLOUDFLARE_ACCOUNT_ID")
  local missing_vars=()

  for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      missing_vars+=("$var")
    fi
  done

  if [[ ${#missing_vars[@]} -gt 0 ]]; then
    log_error "Missing required environment variables:"
    printf '  - %s\n' "${missing_vars[@]}"
    echo ""
    echo "Please set these variables in your environment or CI/CD secrets."
    echo "Example:"
    echo "  export CLOUDFLARE_API_TOKEN=your_token"
    echo "  export CLOUDFLARE_ACCOUNT_ID=your_account_id"
    exit 1
  fi

  log_success "All required environment variables are set"
}

# Check git status
check_git_status() {
  log_step "Checking git status..."

  if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    log_warning "Not a git repository, skipping git checks"
    return 0
  fi

  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)

  if [[ "$ENVIRONMENT" == "production" && "$branch" != "main" ]]; then
    log_warning "Deploying to production from branch '$branch' (not main)"
    if [[ "$SKIP_CONFIRMATION" != "true" ]]; then
      read -rp "Continue anyway? [y/N] " confirm
      if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
      fi
    fi
  fi

  # Check for uncommitted changes
  if [[ -n "$(git status --porcelain)" ]]; then
    log_warning "You have uncommitted changes:"
    git status --short
    if [[ "$SKIP_CONFIRMATION" != "true" ]]; then
      read -rp "Continue with uncommitted changes? [y/N] " confirm
      if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
      fi
    fi
  fi

  log_success "Git status checked (branch: $branch)"
}

# Confirm deployment
confirm_deployment() {
  if [[ "$SKIP_CONFIRMATION" == "true" ]]; then
    return 0
  fi

  echo ""
  echo -e "${BOLD}Deployment Summary${NC}"
  echo "  Environment: $ENVIRONMENT"
  echo "  Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
  echo "  Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
  echo ""

  read -rp "Proceed with deployment? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log_info "Deployment cancelled"
    exit 0
  fi
}

# Run tests
run_tests() {
  log_step "Running tests..."
  cd "$PROJECT_ROOT"

  if npm test 2>&1 | tee -a "$LOG_FILE"; then
    log_success "All tests passed"
  else
    log_error "Tests failed"
    exit 1
  fi
}

# Run linter
run_lint() {
  log_step "Running linter..."
  cd "$PROJECT_ROOT"

  if npm run lint 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Linting passed"
  else
    log_error "Linting failed"
    exit 1
  fi
}

# Run type check
run_typecheck() {
  log_step "Running type check..."
  cd "$PROJECT_ROOT"

  if npm run typecheck 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Type check passed"
  else
    log_error "Type check failed"
    exit 1
  fi
}

# Build the project
build_project() {
  log_step "Building project..."

  cd "$PROJECT_ROOT"

  # Clean previous build
  rm -rf .vercel/output

  # Install dependencies if needed
  if [[ ! -d "node_modules" ]]; then
    log_info "Installing dependencies..."
    npm install --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"
  fi

  # Run quality checks in parallel where possible
  log_info "Running pre-build checks..."
  run_typecheck
  run_lint
  run_tests

  # Build for Cloudflare Pages
  log_info "Building for Cloudflare Pages..."
  if npm run pages:build 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Build completed"
  else
    log_error "Build failed"
    exit 1
  fi

  # Show build size
  if [[ -d ".vercel/output/static" ]]; then
    local size
    size=$(du -sh .vercel/output/static | cut -f1)
    log_info "Build size: $size"
  fi
}

# Validate build without deploying
validate_build() {
  log_step "Validating build..."
  init_log
  build_project
  log_success "Validation completed successfully"
  echo ""
  echo "Build output: .vercel/output/static"
  echo "Ready for deployment"
}

# Deploy to Cloudflare Pages
deploy_pages() {
  log_step "Deploying to Cloudflare Pages ($ENVIRONMENT)..."

  # Check if wrangler is installed
  if ! command -v wrangler &> /dev/null; then
    log_error "Wrangler CLI not found"
    echo "Install it with: npm install -g wrangler"
    exit 1
  fi

  # Set auth for wrangler
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
  export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}"

  local project_name="imagesearchreverse"
  local deploy_args=()

  # Deploy with environment
  if [[ "$ENVIRONMENT" == "staging" ]]; then
    project_name="imagesearchreverse-staging"
    deploy_args+=(--branch=staging)
  fi

  log_info "Deploying to project: $project_name"

  if wrangler pages deploy .vercel/output/static \
    --project-name="$project_name" \
    "${deploy_args[@]}" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Deployment completed"
  else
    log_error "Deployment failed"
    exit 1
  fi
}

# Show deployment status
show_status() {
  log_step "Checking deployment status..."

  if ! command -v wrangler &> /dev/null; then
    log_error "Wrangler CLI not found"
    exit 1
  fi

  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
  export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"

  local project_name="imagesearchreverse"
  if [[ "$ENVIRONMENT" == "staging" ]]; then
    project_name="imagesearchreverse-staging"
  fi

  echo ""
  echo "Recent deployments for $project_name:"
  wrangler pages deployment list --project-name="$project_name" 2>/dev/null | head -n 15 || \
    log_warning "Could not fetch deployment list. Check your credentials."
}

# Show recent logs
show_logs() {
  log_step "Fetching recent logs..."

  if [[ -f "$LOG_FILE" ]]; then
    echo ""
    echo "=== Recent deployment logs ==="
    tail -n 50 "$LOG_FILE"
  else
    log_info "No deployment logs found"
  fi
}

# Check health endpoint
check_health() {
  log_step "Checking health endpoint..."

  local health_url
  if [[ "$ENVIRONMENT" == "staging" ]]; then
    health_url="https://staging.imagesearchreverse.com/api/health"
  else
    health_url="https://imagesearchreverse.com/api/health"
  fi

  log_info "Health URL: $health_url"

  local response
  local status
  local max_retries=3
  local retry=0

  while [[ $retry -lt $max_retries ]]; do
    response=$(curl -s -w "\n%{http_code}" "$health_url" --max-time 10 2>/dev/null || echo -e "\n000")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [[ "$status" == "200" ]]; then
      log_success "Health check passed"
      echo "$body" | jq . 2>/dev/null || echo "$body"
      return 0
    elif [[ "$status" == "503" ]]; then
      log_warning "Health check returned degraded status"
      echo "$body" | jq . 2>/dev/null || echo "$body"
      return 1
    elif [[ "$status" == "000" ]]; then
      retry=$((retry + 1))
      if [[ $retry -lt $max_retries ]]; then
        log_warning "Connection failed, retrying ($retry/$max_retries)..."
        sleep 2
      fi
    else
      log_error "Health check failed with status $status"
      echo "$body"
      return 1
    fi
  done

  log_error "Could not connect to health endpoint after $max_retries attempts"
  return 1
}

# Rollback deployment
rollback() {
  log_step "Rolling back deployment..."

  if ! command -v wrangler &> /dev/null; then
    log_error "Wrangler CLI not found"
    exit 1
  fi

  # Set auth for wrangler
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
  export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"

  local project_name="imagesearchreverse"
  if [[ "$ENVIRONMENT" == "staging" ]]; then
    project_name="imagesearchreverse-staging"
  fi

  # List recent deployments
  echo ""
  echo "Recent deployments for $project_name:"
  wrangler pages deployment list --project-name="$project_name" 2>/dev/null | head -n 10 || {
    log_error "Could not fetch deployment list"
    exit 1
  }

  echo ""
  read -rp "Enter deployment ID to rollback to (or 'cancel'): " deployment_id

  if [[ "$deployment_id" == "cancel" || -z "$deployment_id" ]]; then
    log_info "Rollback cancelled"
    exit 0
  fi

  log_info "Rolling back to deployment: $deployment_id"

  if wrangler pages deployment rollback --project-name="$project_name" --deployment-id="$deployment_id" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Rollback completed"

    # Health check after rollback
    echo ""
    log_info "Running post-rollback health check..."
    sleep 5
    check_health || log_warning "Health check failed after rollback"
  else
    log_error "Rollback failed"
    exit 1
  fi
}

# Show usage
show_usage() {
  echo "Usage: $0 [options] [command|environment]"
  echo ""
  echo "Commands:"
  echo "  production       Deploy to production environment (default)"
  echo "  staging          Deploy to staging environment"
  echo "  rollback         Rollback to a previous deployment"
  echo "  health           Check health endpoint"
  echo "  validate         Validate build without deploying"
  echo "  status           Show recent deployment status"
  echo "  logs             Show recent deployment logs"
  echo "  help             Show this help message"
  echo ""
  echo "Options:"
  echo "  --yes            Skip confirmation prompts (for CI/CD)"
  echo ""
  echo "Examples:"
  echo "  $0                        # Deploy to production (with confirmation)"
  echo "  $0 staging                # Deploy to staging"
  echo "  $0 --yes production       # Deploy to production without confirmation"
  echo "  $0 rollback               # Rollback production"
  echo "  $0 health staging         # Check staging health"
  echo "  $0 validate               # Validate build only"
  echo ""
  echo "Environment Variables:"
  echo "  CLOUDFLARE_API_TOKEN      Cloudflare API token (required)"
  echo "  CLOUDFLARE_ACCOUNT_ID     Cloudflare account ID (required)"
}

# Calculate deployment duration
show_duration() {
  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - DEPLOYMENT_START_TIME))
  local minutes=$((duration / 60))
  local seconds=$((duration % 60))

  if [[ $minutes -gt 0 ]]; then
    echo "Deployment completed in ${minutes}m ${seconds}s"
  else
    echo "Deployment completed in ${seconds}s"
  fi
}

# Main deployment flow
main() {
  case "$ENVIRONMENT" in
    help|--help|-h)
      show_usage
      exit 0
      ;;
    rollback)
      rollback
      exit 0
      ;;
    health)
      # Allow checking health for specific environment
      if [[ -n "${2:-}" ]]; then
        ENVIRONMENT="$2"
      fi
      check_health
      exit 0
      ;;
    validate)
      validate_build
      exit 0
      ;;
    status)
      show_status
      exit 0
      ;;
    logs)
      show_logs
      exit 0
      ;;
    production|staging)
      # Continue to deployment
      ;;
    *)
      log_error "Unknown command or environment: $ENVIRONMENT"
      echo ""
      show_usage
      exit 1
      ;;
  esac

  echo ""
  echo -e "${BOLD}========================================${NC}"
  echo -e "${BOLD}  ImageSearchReverse Deployment${NC}"
  echo -e "${BOLD}========================================${NC}"
  echo ""

  init_log
  check_git_status
  check_env_vars
  confirm_deployment
  build_project
  deploy_pages

  # Health check after deployment
  echo ""
  log_info "Running post-deployment health check..."
  sleep 5  # Wait for deployment to propagate

  if check_health; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
  else
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  Deployment Complete (Health Warning)${NC}"
    echo -e "${YELLOW}========================================${NC}"
    log_warning "Health check failed. Consider rolling back if issues persist."
  fi

  echo ""
  echo "Site URL:"
  if [[ "$ENVIRONMENT" == "staging" ]]; then
    echo "  https://staging.imagesearchreverse.com"
  else
    echo "  https://imagesearchreverse.com"
  fi
  echo ""
  echo "Useful commands:"
  echo "  ./deploy.sh health    # Check health"
  echo "  ./deploy.sh status    # View deployments"
  echo "  ./deploy.sh rollback  # Rollback if needed"
  echo ""
  show_duration
  echo "=== Deployment finished at $(date) ===" >> "$LOG_FILE"
}

# Trap errors
trap 'log_error "Deployment failed at line $LINENO"; exit 1' ERR

# Run main function
main "$@"
