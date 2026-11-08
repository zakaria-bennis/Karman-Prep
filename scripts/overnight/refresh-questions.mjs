#!/usr/bin/env node
// Refreshes the LOCAL question bank from production, READ-ONLY, and rewrites
// the local dump that scripts/overnight/reset-local-db.sh restores from.
//
// - Production is only ever read, with GET requests to its REST API.
// - Only quiz_questions, answer_choices, answer_key_entries and source_assets
//   change locally. Users, progress and every other table are left alone.
// - Everything is fetched first; the local swap is one transaction, so nobody
//   using the local stack sees a half-empty bank.
//
// Usage: scripts/overnight/refresh-questions.sh (this file does the work)
// Needs: the local stack running and the main checkout's .env.local, which is
// read for the production URL and key and never printed.
import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROD_ENV = process.env.KARMAN_PROD_ENV ?? "/Users/zakariabennis/Karman-Prep/.env.local";
const DUMP =
  process.env.QUESTION_BANK_DUMP ?? "/Users/zakariabennis/Karman-Prep-wt/question-bank.dump";
const DB_CONTAINER = "supabase_db_karman-local";
const PAGE = 250;

// The serving tables. `nullColumns` point at tables that are not copied.
const TABLES = [
  { name: "quiz_questions", key: "id" },
  { name: "answer_choices", key: "id" },
  { name: "answer_key_entries", key: "id" },
  { name: "source_assets", key: "id", nullColumns: ["pdf_job_id"] },
];

// ── production: read-only ────────────────────────────────
const env = {};
for (const line of readFileSync(PROD_ENV, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const PROD_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PROD_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!PROD_URL?.includes(".supabase.co") || !PROD_KEY) {
  console.error("✗ Could not read the production Supabase URL and key from", PROD_ENV);
  process.exit(1);
}

/** The only way this script talks to production: a GET request. */
async function prodGet(path) {
  const res = await fetch(`${PROD_URL}/rest/v1/${path}`, {
    method: "GET",
    headers: { apikey: PROD_KEY, Authorization: `Bearer ${PROD_KEY}`, Accept: "application/json" },
  });
  if (!res.ok)
    throw new Error(
      `GET ${path.split("?")[0]} → ${res.status}: ${(await res.text()).slice(0, 200)}`
    );
  return res.json();
}

// ── local database ───────────────────────────────────────
function psql(sql) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "-e",
      "PGPASSWORD=postgres",
      DB_CONTAINER,
      "psql",
      "-X",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-h",
      "127.0.0.1",
      "-d",
      "postgres",
      "-c",
      sql,
    ],
    { encoding: "utf8" }
  ).trim();
}
const lines = (out) => (out ? out.split("\n") : []);
const localColumns = (table) =>
  lines(
    psql(
      `select column_name from information_schema.columns where table_schema='public' and table_name='${table}' and is_generated='NEVER' order by ordinal_position`
    )
  );
/** Columns the local schema requires (NOT NULL, no default). */
const requiredColumns = (table) =>
  lines(
    psql(
      `select column_name from information_schema.columns where table_schema='public' and table_name='${table}' and is_nullable='NO' and column_default is null and is_generated='NEVER'`
    )
  );

const work = mkdtempSync(join(tmpdir(), "karman-bank-"));
const ident = (c) => `"${c.replace(/"/g, '""')}"`;

/** Fetches one table into an NDJSON file with small key-ordered pages. */
async function fetchTable({ name, key }) {
  const file = join(work, `${name}.ndjson`);
  writeFileSync(file, "");
  let total = 0;
  let prodCols = [];
  let page = PAGE;
  let last = null;
  for (;;) {
    const after = last === null ? "" : `&${key}=gt.${encodeURIComponent(last)}`;
    let rows;
    try {
      rows = await prodGet(`${name}?select=*&order=${key}.asc&limit=${page}${after}`);
    } catch (err) {
      // Large question rows can hit production's statement timeout: halve the page.
      if (page > 25 && /\b500\b|timeout/.test(err.message)) {
        page = Math.floor(page / 2);
        continue;
      }
      throw err;
    }
    if (rows.length === 0) break;
    if (prodCols.length === 0) prodCols = Object.keys(rows[0]);
    appendFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    total += rows.length;
    last = rows[rows.length - 1][key];
    if (rows.length < page) break;
  }
  return { file, total, prodCols };
}

async function main() {
  console.log("Fetching the question bank from production (GET only) …");
  const fetched = {};
  for (const table of TABLES) {
    fetched[table.name] = await fetchTable(table);
    console.log(`  · ${table.name}: ${fetched[table.name].total} rows`);
  }
  if (fetched.quiz_questions.total === 0)
    throw new Error("production returned no questions; the local bank was left as it was");

  // One transaction: load every table into a temp table, then swap the rows.
  // Replica mode skips triggers and foreign-key checks for the load, so test
  // accounts and their history keep pointing at the same question ids.
  const stream = join(work, "swap.sql");
  writeFileSync(stream, "begin;\nset local session_replication_role = replica;\n");
  const swaps = [];
  const notes = {};
  for (const { name, nullColumns = [] } of TABLES) {
    const { file, prodCols } = fetched[name];
    const local = localColumns(name);
    const cols = local.filter((c) => prodCols.includes(c));
    const prodOnly = prodCols.filter((c) => !local.includes(c));
    if (prodOnly.length) notes[name] = `production-only columns skipped: ${prodOnly.join(", ")}`;
    // Production has drifted in places (a NOT NULL dropped there). Rows the
    // local schema would reject are skipped and counted, never invented.
    const required = requiredColumns(name).filter(
      (c) => cols.includes(c) && !nullColumns.includes(c)
    );
    const where = required.length
      ? ` where ${required.map((c) => `r.${ident(c)} is not null`).join(" and ")}`
      : "";
    const select = cols.map((c) => (nullColumns.includes(c) ? "null" : `r.${ident(c)}`)).join(", ");
    const temp = ident(`_load_${name}`);
    appendFileSync(stream, `create temp table ${temp}(doc jsonb) on commit drop;\n`);
    appendFileSync(
      stream,
      `copy ${temp} from stdin with (format csv, quote e'\\x01', delimiter e'\\x02');\n`
    );
    appendFileSync(stream, readFileSync(file));
    appendFileSync(stream, "\\.\n");
    swaps.push(
      `delete from public.${ident(name)};`,
      `insert into public.${ident(name)} (${cols.map(ident).join(", ")}) select ${select} from ${temp}, jsonb_populate_record(null::public.${ident(name)}, ${temp}.doc) r${where};`
    );
  }
  appendFileSync(stream, `${swaps.join("\n")}\ncommit;\nnotify pgrst, 'reload schema';\n`);
  const load = spawnSync(
    "bash",
    [
      "-c",
      `docker exec -i -e PGPASSWORD=postgres ${DB_CONTAINER} psql -X -q -v ON_ERROR_STOP=1 -U postgres -h 127.0.0.1 -d postgres -f - < "$1"`,
      "swap",
      stream,
    ],
    { encoding: "utf8" }
  );
  if (load.status !== 0)
    throw new Error(`local swap failed, nothing changed: ${(load.stderr || "").slice(0, 400)}`);

  console.log("Local question bank swapped in one transaction:");
  for (const { name } of TABLES) {
    const count = Number(psql(`select count(*) from public.${ident(name)}`));
    const skipped = fetched[name].total - count;
    const why = skipped > 0 ? ` (${skipped} skipped: a required value is blank in production)` : "";
    console.log(`  ✓ ${name}: ${count} rows${why}${notes[name] ? ` (${notes[name]})` : ""}`);
  }

  const tmpDump = `${DUMP}.partial`;
  const dump = spawnSync(
    "bash",
    [
      "-c",
      `docker exec -e PGPASSWORD=postgres ${DB_CONTAINER} pg_dump -U postgres -h 127.0.0.1 -d postgres --data-only --format=custom ${TABLES.map((t) => `-t public.${t.name}`).join(" ")} > "$1"`,
      "dump",
      tmpDump,
    ],
    { encoding: "utf8" }
  );
  if (dump.status !== 0) throw new Error(`pg_dump failed, the old dump is kept: ${dump.stderr}`);
  renameSync(tmpDump, DUMP);
  console.log(`✓ Local dump rewritten: ${DUMP} (${(statSync(DUMP).size / 1e6).toFixed(1)} MB)`);
}

main()
  .catch((err) => {
    console.error("✗", err.message);
    process.exitCode = 1;
  })
  .finally(() => rmSync(work, { recursive: true, force: true }));
