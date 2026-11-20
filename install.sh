#!/usr/bin/env bash
set -euo pipefail

echo "Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Please install Node.js 20+ from https://nodejs.org/"
  exit 1
fi
NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20+ required (found $NODE_MAJOR)"
  exit 1
fi

HOME_DIR="${CURSE_SPIKE_HOME:-$HOME/.curse-spike}"
mkdir -p "$HOME_DIR/skills" "$HOME_DIR/logs" "$HOME_DIR/briefings"
echo "Created $HOME_DIR"

cat <<'JSON'
MCP client config (add to your client):
{
  "mcpServers": {
    "the-curse-spike": {
      "command": "npx",
      "args": ["-y", "the-curse-spike"]
    }
  }
}
JSON
echo "Done."