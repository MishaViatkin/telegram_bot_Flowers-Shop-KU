#!/usr/bin/env bash
set -euo pipefail

# Ruflo setup for Cursor (MCP integration).
# Docs:
# - https://github.com/ruvnet/ruflo
# - https://github.com/ruvnet/ruflo/wiki/Installation-Guide

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "[setup] project: $PROJECT_DIR"
echo "[setup] node: $(node -v)"
echo "[setup] npm: $(npm -v)"

echo "[setup] Installing Ruflo globally (minimal profile)..."
npm install -g ruflo@latest --omit=optional

echo "[setup] Verifying Ruflo CLI..."
ruflo --version

if [[ ! -f ".cursor/mcp.json" ]]; then
  echo "[setup] .cursor/mcp.json not found; creating default MCP config..."
  mkdir -p .cursor
  cat > .cursor/mcp.json <<'JSON'
{
  "mcpServers": {
    "ruflo": {
      "command": "npx",
      "args": ["-y", "ruflo@latest", "mcp", "start"]
    }
  }
}
JSON
fi

echo "[setup] Writing project-level .mcp.json (same Ruflo server)..."
cat > .mcp.json <<'JSON'
{
  "mcpServers": {
    "ruflo": {
      "command": "npx",
      "args": ["-y", "ruflo@latest", "mcp", "start"],
      "env": {
        "npm_config_update_notifier": "false",
        "RUFLO_MODE": "v3",
        "RUFLO_HOOKS_ENABLED": "true",
        "RUFLO_TOPOLOGY": "mesh",
        "RUFLO_MAX_AGENTS": "5",
        "RUFLO_MEMORY_BACKEND": "memory"
      },
      "autoStart": false
    }
  }
}
JSON

echo "[setup] Cursor MCP config is ready at .cursor/mcp.json"
echo "[setup] Project MCP config is ready at .mcp.json"
echo "[setup] Next:"
echo "  1) Restart Cursor window"
echo "  2) Open this project in Cursor"
echo "  3) Switch to Agent mode"
echo "  4) Verify MCP server 'ruflo' is connected in MCP panel"

