#!/usr/bin/env bash
# Rebuilds the LOCAL database from a worktree's migrations, restores the
# question bank from the local dump (never from production), and re-seeds the
# test accounts. Everyone using the local stack loses their test data and
# sees errors for about a minute, so say so in the shared notes first.
#
# Usage: scripts/overnight/reset-local-db.sh <worktree>
# Guide: docs/overnight/local-db.md
set -euo pipefail

WORKTREE="$(cd "${1:?usage: reset-local-db.sh <worktree>}" && pwd)"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK="${KARMAN_LOCAL_STACK:-/Users/zakariabennis/Karman-Prep-wt/local-supabase}"
DUMP="${QUESTION_BANK_DUMP:-/Users/zakariabennis/Karman-Prep-wt/question-bank.dump}"
DB_CONTAINER="supabase_db_karman-local"

[ -f "$STACK/supabase/config.toml" ] || { echo "✗ No stack config at $STACK/supabase/config.toml" >&2; exit 1; }
[ -f "$DUMP" ] || { echo "✗ No question bank dump at $DUMP" >&2; exit 1; }
[ -d "$WORKTREE/supabase/migrations" ] || { echo "✗ No migrations in $WORKTREE" >&2; exit 1; }

psql_local() {
  docker exec -i -e PGPASSWORD=postgres "$DB_CONTAINER" \
    psql -X -q -v ON_ERROR_STOP=1 -U postgres -h 127.0.0.1 -d postgres "$@"
}

started=$(date +%s)
echo "→ 1/5 Fresh local database (project karman-local)"
if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  supabase start --workdir "$STACK" >/dev/null
fi
# The stack folder has no migrations of its own, so this only recreates an
# empty Supabase database. The worktree's migrations are applied next.
mkdir -p "$STACK/supabase/migrations"
find "$STACK/supabase/migrations" -name '*.sql' -delete
supabase db reset --local --workdir "$STACK" >/dev/null 2>&1 || {
  echo "✗ supabase db reset failed. Run it by hand to see why:" >&2
  echo "  supabase db reset --local --workdir $STACK" >&2
  exit 1
}

echo "→ 2/5 Migrations from $WORKTREE"
"$HERE/apply-migrations-local.sh" "$WORKTREE"

echo "→ 3/5 Question bank from the local dump"
# Some migrations insert catalog rows (the 15 concepts), so empty the dumped
# tables first. Replica mode skips triggers and foreign-key checks for the load.
tables=$(docker exec -i "$DB_CONTAINER" pg_restore -l <"$DUMP" | awk '/TABLE DATA public/ {print $(NF-1)}')
restore_err=$(mktemp)
if ! {
  echo "set session_replication_role = replica;"
  for t in $tables; do echo "delete from public.$t;"; done
  docker exec -i "$DB_CONTAINER" pg_restore --data-only --no-owner -f - <"$DUMP"
} | psql_local >/dev/null 2>"$restore_err"; then
  grep -v "NOTICE" "$restore_err" | head -10 >&2
  rm -f "$restore_err"
  echo "✗ Restoring the question bank failed" >&2
  exit 1
fi
rm -f "$restore_err"
for t in $tables; do
  echo "  ✓ $t: $(psql_local -At -c "select count(*) from public.$t") rows"
done

echo "→ 4/5 Test accounts"
KARMAN_LOCAL_STACK="$STACK" node "$HERE/seed-personas.mjs" | grep -v "env.local not found"

echo "→ 5/5 Extra seed files from $WORKTREE/supabase/seeds/overnight/"
shopt -s nullglob
for file in "$WORKTREE"/supabase/seeds/overnight/*.sql; do
  echo "  · $(basename "$file")"
  psql_local -f - <"$file" >/dev/null
done
psql_local -c "notify pgrst, 'reload schema'" >/dev/null

echo "✓ Local database rebuilt in $(($(date +%s) - started))s"
