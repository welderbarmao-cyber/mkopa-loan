#!/bin/bash
echo "=== Clearing ALL build caches ==="
rm -rf .next
rm -rf .vercel
rm -rf node_modules/.cache
echo "=== Building fresh ==="
npx next build
