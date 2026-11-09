#!/usr/bin/env bash
# Copies quiz_questions, answer_choices, answer_key_entries and source_assets
# READ-ONLY from production into the LOCAL database, and rewrites the local
# dump that reset-local-db.sh uses. Touches nothing else, here or there.
# Only the local-db session (or the orchestrator) runs this: it is the one
# thing tonight that reads production.
#
# Usage: scripts/overnight/refresh-questions.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
docker ps --format '{{.Names}}' | grep -qx supabase_db_karman-local || {
  echo "✗ The local stack is not running. See docs/overnight/local-db.md." >&2
  exit 1
}
node "$HERE/refresh-questions.mjs"
