#!/bin/bash
# Agent Foreman macOS App Builder
# Run this on a Mac to build the .app bundle

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$SCRIPT_DIR/dist"

echo "==> Installing dependencies..."
pip3 install rumps pyinstaller --quiet

echo "==> Copying server files into macos_app..."
cp "$REPO_DIR/monitor_server.py" "$SCRIPT_DIR/"
cp "$REPO_DIR/config.example.json" "$SCRIPT_DIR/"

echo "==> Building .app..."
cd "$SCRIPT_DIR"
pyinstaller \
    --name "Agent Foreman" \
    --windowed \
    --onedir \
    --add-data "monitor_server.py:."\
    --add-data "config.example.json:."\
    --hidden-import rumps \
    --hidden-import monitor_server \
    foreman_menubar.py

echo "==> Build complete!"
echo "    App: $SCRIPT_DIR/dist/Agent Foreman.app"
echo ""
echo "==> Creating zip for GitHub Releases..."
cd "$DIST_DIR"
zip -r "AgentForeman-mac.zip" "Agent Foreman.app"
echo "    Zip: $DIST_DIR/AgentForeman-mac.zip"
echo ""
echo "Done! Upload AgentForeman-mac.zip to GitHub Releases."
