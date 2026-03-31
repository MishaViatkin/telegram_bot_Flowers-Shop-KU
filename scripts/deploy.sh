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
wait_for_health() {
  local name="$1"
  local url="$2"
  local tries="${3:-60}"

  for i in $(seq 1 "$tries"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[deploy] $name health ok"
      return 0
    fi
    sleep 1
  done

  echo "[deploy] ERROR: $name health did not become ready: $url" >&2
  return 1
}

if ! wait_for_health "api" "http://127.0.0.1:3000/health" 60; then
  docker compose -f docker-compose.prod.yml ps || true
  docker compose -f docker-compose.prod.yml logs --tail=200 api || true
  exit 1
fi

if ! wait_for_health "bot" "http://127.0.0.1:3001/health" 60; then
  docker compose -f docker-compose.prod.yml ps || true
  docker compose -f docker-compose.prod.yml logs --tail=200 bot || true
  exit 1
fi

echo "[deploy] done"

