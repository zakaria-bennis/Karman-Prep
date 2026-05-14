#!/usr/bin/env bash
# ============================================================
# install-pdf-watch.sh — sets up the PDF-queue watcher as a
# launchd LaunchAgent so it runs whenever you're logged in.
#
# Run once from the repo root:
#   bash scripts/launchd/install-pdf-watch.sh
#
# It will:
#   1. Detect your `node` binary (via `command -v node`).
#   2. Write a plist to ~/Library/LaunchAgents/com.karmanprep.pdf-watch.plist
#      with the right paths filled in.
#   3. Load the LaunchAgent so it starts immediately AND every login.
#
# To stop / uninstall, run:
#   bash scripts/launchd/install-pdf-watch.sh --uninstall
# ============================================================

set -euo pipefail

LABEL="com.karmanprep.pdf-watch"
PLIST_DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
TEMPLATE="scripts/launchd/com.karmanprep.pdf-watch.plist.template"

cd "$(dirname "$0")/../.."  # repo root regardless of where script was invoked
REPO_DIR="$(pwd)"

if [ "${1:-}" = "--uninstall" ]; then
  if [ -f "$PLIST_DEST" ]; then
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    rm "$PLIST_DEST"
    echo "Uninstalled $LABEL."
  else
    echo "Nothing to uninstall — $PLIST_DEST not found."
  fi
  exit 0
fi

# 1. Detect node.
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  echo "ERROR: 'node' not found in PATH." >&2
  echo "Install Node.js (e.g. via Homebrew: 'brew install node') and re-run." >&2
  exit 1
fi
NODE_VERSION="$("$NODE_BIN" --version 2>/dev/null || echo unknown)"
echo "Using node at $NODE_BIN ($NODE_VERSION)"

# 1b. Detect claude (Claude Code CLI). Required for Hybrid Full
# auto-processing. Without it the watcher falls back to download-only
# (manual Claude Code) which still works but defeats the point.
CLAUDE_BIN="$(command -v claude || true)"
if [ -z "$CLAUDE_BIN" ]; then
  echo "WARNING: 'claude' not found in PATH." >&2
  echo "  Hybrid Full auto-processing won't work — install Claude Code first" >&2
  echo "  (https://claude.com/download) and re-run this script." >&2
  echo "  Continuing with a placeholder; the watcher will mark jobs failed" >&2
  echo "  with a clear error until you re-install."
  CLAUDE_BIN="/usr/local/bin/claude"  # plausible default
else
  CLAUDE_VERSION="$("$CLAUDE_BIN" --version 2>/dev/null | head -1 || echo unknown)"
  echo "Using claude at $CLAUDE_BIN ($CLAUDE_VERSION)"
fi

# 1c. Build a launchd-friendly PATH that includes /opt/homebrew/bin
# (Apple Silicon Homebrew), /usr/local/bin (Intel), the dirs of the
# detected node + claude binaries, and the standard system dirs.
NODE_DIR="$(dirname "$NODE_BIN")"
CLAUDE_DIR="$(dirname "$CLAUDE_BIN")"
PATH_FOR_LAUNCHD="$NODE_DIR:$CLAUDE_DIR:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# 2. Sanity: are we in the strata repo?
if [ ! -f "package.json" ] || [ ! -f "scripts/pdf-pipeline/pull-pdf-job.mjs" ]; then
  echo "ERROR: doesn't look like the strata repo. Aborting." >&2
  echo "  Run from /Users/zakariabennis/strata or wherever the repo is checked out." >&2
  exit 1
fi
echo "Repo root: $REPO_DIR"

# 3. .env.local must exist with the runner's required vars.
if [ ! -f ".env.local" ]; then
  echo "ERROR: .env.local missing. The watcher reads Supabase + R2 creds from it." >&2
  exit 1
fi

# 4. Render the plist.
mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "question-imports"  # log file lives here
sed \
  -e "s|{{NODE_BIN}}|$NODE_BIN|g" \
  -e "s|{{CLAUDE_BIN}}|$CLAUDE_BIN|g" \
  -e "s|{{PATH_FOR_LAUNCHD}}|$PATH_FOR_LAUNCHD|g" \
  -e "s|{{REPO_DIR}}|$REPO_DIR|g" \
  "$TEMPLATE" > "$PLIST_DEST"
echo "Wrote $PLIST_DEST"

# 5. Reload the LaunchAgent (unload first so changes take effect on re-runs).
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"
echo "Loaded $LABEL — it's running now and will start at every login."
echo ""
echo "Tail logs with:"
echo "  tail -f $REPO_DIR/question-imports/.pdf-watch.log"
echo ""
echo "Check status with:"
echo "  launchctl list | grep $LABEL"
echo ""
echo "Stop / uninstall with:"
echo "  bash scripts/launchd/install-pdf-watch.sh --uninstall"
