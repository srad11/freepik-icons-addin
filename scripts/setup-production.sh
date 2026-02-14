#!/bin/bash
# FreePik Icons - Production Setup Script
# This script configures the add-in for GitHub Pages + Cloudflare Worker deployment.
#
# Usage: bash scripts/setup-production.sh <github-pages-url> <cloudflare-worker-url>
# Example: bash scripts/setup-production.sh https://myuser.github.io/freepik-icons-addin https://freepik-icons-proxy.myuser.workers.dev

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GITHUB_PAGES_URL="${1}"
CF_WORKER_URL="${2}"

if [ -z "$GITHUB_PAGES_URL" ] || [ -z "$CF_WORKER_URL" ]; then
    echo "Usage: bash scripts/setup-production.sh <github-pages-url> <cloudflare-worker-url>"
    echo ""
    echo "Example:"
    echo "  bash scripts/setup-production.sh \\"
    echo "    https://myuser.github.io/freepik-icons-addin \\"
    echo "    https://freepik-icons-proxy.myuser.workers.dev"
    exit 1
fi

# Remove trailing slashes
GITHUB_PAGES_URL="${GITHUB_PAGES_URL%/}"
CF_WORKER_URL="${CF_WORKER_URL%/}"

echo "=== FreePik Icons - Production Setup ==="
echo ""
echo "GitHub Pages URL: $GITHUB_PAGES_URL"
echo "Cloudflare Worker URL: $CF_WORKER_URL"
echo ""

# 1. Update production manifest with actual URLs
echo "Updating production manifest..."
sed "s|GITHUB_PAGES_URL|${GITHUB_PAGES_URL}|g" \
    "$PROJECT_DIR/manifest-production.xml" > "$PROJECT_DIR/dist/manifest-production.xml"
echo "  Created dist/manifest-production.xml"

# 2. Build with the Cloudflare Worker URL
echo "Building for production..."
cd "$PROJECT_DIR"
CF_WORKER_URL="${CF_WORKER_URL}/v1" npm run build
echo "  Build complete"

# 3. Copy the production manifest to dist
cp "$PROJECT_DIR/dist/manifest-production.xml" "$PROJECT_DIR/dist/manifest.xml"

echo ""
echo "=== Production Build Ready ==="
echo ""
echo "Next steps:"
echo "1. Push to GitHub to trigger deployment:"
echo "   git add . && git commit -m 'Production deployment' && git push"
echo ""
echo "2. Install the production manifest in PowerPoint:"
echo "   bash scripts/install.sh --production"
echo ""
echo "=== Done ==="
