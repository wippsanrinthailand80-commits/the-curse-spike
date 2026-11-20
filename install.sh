#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/wippsanrinthailand80-commits/the-curse-spike.git"
INSTALL_DIR="${CURSE_SPIKE_INSTALL_DIR:-$HOME/.curse-spike-src}"

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

if ! command -v git >/dev/null 2>&1; then
  echo "git not found. Please install git."
  exit 1
fi

if [ ! -d "$INSTALL_DIR/.git" ]; then
  echo "Cloning the-curse-spike into $INSTALL_DIR..."
  git clone "$REPO" "$INSTALL_DIR"
else
  echo "Updating $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
fi

cd "$INSTALL_DIR"
echo "Installing dependencies..."
npm install
echo "Building..."
npm run build

HOME_DIR="${CURSE_SPIKE_HOME:-$HOME/.curse-spike}"
mkdir -p "$HOME_DIR/skills" "$HOME_DIR/logs" "$HOME_DIR/briefings"
echo "Created $HOME_DIR"

cat <<JSON
MCP client config (add to your client):
{
  "mcpServers": {
    "the-curse-spike": {
      "command": "node",
      "args": ["$INSTALL_DIR/dist/index.js"]
    }
  }
}
JSON
echo "Done."