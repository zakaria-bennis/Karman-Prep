// Bank stream (overnight build, 2026-11-22): back up every table the bank work writes, before any
// write. Full rows as JSON Lines, a row count and a sha256 per file. Read-only.
// Usage: node scripts/bank/backup.mjs <out-dir>
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { selectAll } from "./db.mjs";

const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/bank/backup.mjs <out-dir>");
mkdirSync(out, { recursive: true });

const TABLES = [
  ["quiz_questions", "*"],
  ["answer_choices", "*"],
  ["answer_key_entries", "*"],
];
const manifest = { taken_at: new Date().toISOString(), tables: {} };
for (const [table, columns] of TABLES) {
  const rows = await selectAll(table, columns, {
    pageSize: table === "quiz_questions" ? 150 : 1000,
  });
  const body = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  const file = join(out, `${table}.jsonl`);
  writeFileSync(file, body);
  manifest.tables[table] = {
    file: `${table}.jsonl`,
    rows: rows.length,
    sha256: createHash("sha256").update(body).digest("hex"),
  };
  console.log(table, rows.length);
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest written");
