#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "==> Building Next.js export..."
cd "$PROJECT_ROOT"
npm run export

echo "==> Copying to mobile/www..."
rm -rf "$SCRIPT_DIR/www"
cp -r "$PROJECT_ROOT/out" "$SCRIPT_DIR/www"

# Replace index.html with redirect to /clients
echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><meta http-equiv="refresh" content="0;url=/clients.html"><title>Jorge Minnesota</title></head><body></body></html>' > "$SCRIPT_DIR/www/index.html"

echo "==> Syncing Capacitor..."
cd "$SCRIPT_DIR"
npx cap sync

echo "==> Done! Run 'npx cap open android' or 'npx cap open ios'"
