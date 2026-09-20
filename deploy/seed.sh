#!/usr/bin/env sh
set -eu

# Deterministic staging seed: runs after `prisma migrate deploy`, before the
# applications start. Uses the same environment-provided DATABASE_URL; no
# credentials are stored in the repository or image layers.

echo "[seed] applying deterministic Orders seed"
docker run --rm --network host --name staging-seed \
  -e DATABASE_URL="$DATABASE_URL" \
  --entrypoint sh admin-panel-migrate:staging \
  -c 'cd /repo/apps/api && node_modules/.bin/tsx prisma/seed.ts'
