#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-/opt/flowers-tg/current}"

cd "$PROJECT_DIR"

echo "[deploy] cwd=$(pwd)"

if [[ ! -f ".env.api" ]]; then
  echo "[deploy] ERROR: .env.api is missing in $PROJECT_DIR" >&2
  exit 1
fi
if [[ ! -f ".env.bot" ]]; then
  echo "[deploy] ERROR: .env.bot is missing in $PROJECT_DIR" >&2
  exit 1
fi

echo "[deploy] compose up"
docker compose -f docker-compose.prod.yml up -d --build

echo "[deploy] db push (best-effort)"
# The production runtime image does not include pnpm; run the compiled push script directly.
docker compose -f docker-compose.prod.yml exec -T api node dist/infra/db/push.js || true

echo "[deploy] ps"
docker compose -f docker-compose.prod.yml ps

echo "[deploy] local health checks"
curl -fsS http://127.0.0.1:3000/health >/dev/null
curl -fsS http://127.0.0.1:3001/health >/dev/null

echo "[deploy] done"

