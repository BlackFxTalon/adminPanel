#!/usr/bin/env sh
set -eu

# Staging release: build API image, apply Prisma migrations, then start the
# stack. Any migration or health-check failure aborts the release with a
# non-zero exit code; the previous containers keep running.

echo "[release] building images"
docker compose build api web

echo "[release] applying Prisma migrations"
docker run --rm --network host --name staging-migrate \
  -e DATABASE_URL="$DATABASE_URL" \
  admin-panel-migrate:staging

echo "[release] starting application containers"
docker compose up -d --no-deps web api proxy

echo "[release] waiting for API health check"
i=0
while [ "$i" -lt 30 ]; do
  if curl -fsS http://127.0.0.1:3001/api/v1/health >/dev/null 2>&1; then
    echo "[release] API is healthy"
    exit 0
  fi
  i=$((i + 1))
  sleep 2
done

echo "[release] API health check failed after 60s; stopping released containers"
docker compose stop api web
exit 1
