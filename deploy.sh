#!/bin/bash
set -e

# Production deployment script for ImageSearchReverse
# Usage: ./deploy.sh [environment]

ENVIRONMENT=${1:-production}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Deploying ImageSearchReverse to $ENVIRONMENT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required environment variables
check_env_vars() {
  echo "🔍 Checking environment variables..."

  local required_vars=("CLOUDFLARE_API_TOKEN" "CLOUDFLARE_ACCOUNT_ID")
  local missing_vars=()

  for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
      missing_vars+=("$var")
    fi
  done

  if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo -e "${RED}✗ Missing required environment variables:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    echo ""
    echo "Please set these variables in your .env file or CI/CD secrets."
    exit 1
  fi

  echo -e "${GREEN}✓ All required environment variables are set${NC}"
}

# Build the project
build_project() {
  echo ""
  echo "🔨 Building project..."
  
  cd "$PROJECT_ROOT"
  
  # Clean previous build
  rm -rf .vercel/output
  
  # Install dependencies if needed
  if [[ ! -d "node_modules" ]]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
  fi

  # Run type check
  echo "Running type check..."
  npm run typecheck

  # Run linter
  echo "Running linter..."
  npm run lint

  # Build for Cloudflare Pages
  echo "Building for Cloudflare Pages..."
  npm run pages:build

  echo -e "${GREEN}✓ Build completed${NC}"
}

# Deploy to Cloudflare Pages
deploy_pages() {
  echo ""
  echo "📦 Deploying to Cloudflare Pages..."

  # Check if wrangler is installed
  if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}✗ Wrangler CLI not found${NC}"
    echo "Install it with: npm install -g wrangler"
    exit 1
  fi

  # Set auth for wrangler
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
  export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}"

  # Deploy
  wrangler pages deploy .vercel/output/static --project-name=imagesearchreverse

  echo -e "${GREEN}✓ Deployment completed${NC}"
}

# Rollback deployment (keeps last 3 versions)
rollback() {
  echo ""
  echo "⏪ Rolling back to previous deployment..."

  if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}✗ Wrangler CLI not found${NC}"
    exit 1
  fi

  # Set auth for wrangler
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
  export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}"

  # List recent deployments
  echo "Recent deployments:"
  wrangler pages deployment list --project-name=imagesearchreverse | head -n 5

  echo ""
  read -p "Enter deployment ID to rollback to: " deployment_id

  if [[ -n "$deployment_id" ]]; then
    wrangler pages deployment rollback --project-name=imagesearchreverse --deployment-id="$deployment_id"
    echo -e "${GREEN}✓ Rollback completed${NC}"
  else
    echo -e "${YELLOW}✗ No deployment ID provided${NC}"
    exit 1
  fi
}

# Main deployment flow
main() {
  if [[ "$ENVIRONMENT" == "rollback" ]]; then
    rollback
    return
  fi

  check_env_vars
  build_project
  deploy_pages

  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}✓ Deployment successful!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo "🌐 Your site should be live at:"
  echo "   https://imagesearchreverse.com"
  echo ""
  echo "📊 Check deployment status:"
  echo "   wrangler pages deployment list --project-name=imagesearchreverse"
}

# Run main function
main
