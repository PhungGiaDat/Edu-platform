#!/usr/bin/env bash
# Install the humanizer skill into your Claude Code user skills directory.
set -euo pipefail

DEST="${1:-$HOME/.claude/skills/humanizer}"
SRC="$(cd "$(dirname "$0")" && pwd)"

echo "Installing humanizer skill -> $DEST"
mkdir -p "$DEST"
cp "$SRC/SKILL.md" "$DEST/"
rm -rf "$DEST/scripts" "$DEST/references"
cp -R "$SRC/scripts" "$DEST/"
cp -R "$SRC/references" "$DEST/"
find "$DEST" -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true

echo "Done. In a Claude Code session, try:  humanize this: <your text>"
