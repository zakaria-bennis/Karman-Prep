#!/usr/bin/env bash
# Applies a worktree's supabase/migrations to the LOCAL database only, in
# order, skipping versions already applied. Stops at the first failure.
# Usage: scripts/overnight/apply-migrations-local.sh <worktree>
set -euo pipefail

WORKTREE="${1:?usage: apply-migrations-local.sh <worktree>}"
DIR="$WORKTREE/supabase/migrations"
DB_CONTAINER="supabase_db_karman-local"
[ -d "$DIR" ] || { echo "✗ No migrations folder at $DIR" >&2; exit 1; }
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || {
  echo "✗ $DB_CONTAINER is not running. Start the stack first (docs/overnight/local-db.md)." >&2
  exit 1
}

psql_local() {
  docker exec -i -e PGPASSWORD=postgres "$DB_CONTAINER" \
    psql -X -q -v ON_ERROR_STOP=1 -U postgres -h 127.0.0.1 -d postgres "$@"
}

psql_local <<'SQL' >/dev/null
set client_min_messages = warning;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

applied=$(psql_local -At -c "select version from supabase_migrations.schema_migrations")
count=0
for file in $(ls "$DIR"/*.sql | sort); do
  base=$(basename "$file" .sql)
  version="${base%%_*}"
  name="${base#*_}"
  if grep -qx "$version" <<<"$applied"; then continue; fi
  echo "→ $base"
  if ! psql_local --single-transaction -f - <"$file" >/dev/null 2>"/tmp/karman-migrate-$$.err"; then
    grep -v "^NOTICE\|^psql:<stdin>:[0-9]*: NOTICE" "/tmp/karman-migrate-$$.err" | head -20 >&2
    rm -f "/tmp/karman-migrate-$$.err"
    echo "✗ Migration failed: $base (nothing from this file was applied)" >&2
    exit 1
  fi
  rm -f "/tmp/karman-migrate-$$.err"
  psql_local -c "insert into supabase_migrations.schema_migrations(version, name) values ('$version', '$name')" >/dev/null
  count=$((count + 1))
done
# PostgREST caches the schema; ask it to reload.
psql_local -c "notify pgrst, 'reload schema'" >/dev/null
echo "✓ Applied $count new migration(s) from $DIR"
