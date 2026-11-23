// Bank stream (2026-11-22): pull results out of workflow journals into one JSON Lines file per
// kind in <work>/results/: pass-A, pass-B and judge keep the latest result per question;
// adjudicate keeps one ruling per question per run (a second round adds a second ruling).
// Usage: node scripts/bank/collect-results.mjs <work-dir> <pass-A|pass-B|judge|adjudicate|explain> <journal.jsonl>...
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const [work, kind, ...journals] = process.argv.slice(2);
const index = JSON.parse(readFileSync(join(work, "batches", "main", "index.json"), "utf8"));
const known = new Set(index.flatMap((b) => b.ids));
mkdirSync(join(work, "results"), { recursive: true });
const outFile = join(work, "results", `${kind}.jsonl`);
const perRun = kind === "adjudicate";
const keyOf = (r) => (perRun ? `${r.id}|${r.run}` : r.id);
const merged = new Map();
if (existsSync(outFile))
  for (const l of readFileSync(outFile, "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(l);
    merged.set(keyOf(r), r);
  }
let added = 0;
let unknown = 0;
for (const j of journals) {
  const run = basename(dirname(j));
  const labels = new Map();
  for (const line of readFileSync(j, "utf8").split("\n").filter(Boolean)) {
    const e = JSON.parse(line);
    if (e.type === "started") labels.set(e.agentId, e.label);
    if (e.type !== "result") continue;
    const list = e.result?.results;
    if (!Array.isArray(list)) continue;
    for (const r of list) {
      if (!known.has(r.id)) {
        unknown++;
        continue;
      }
      const rec = { ...r, run, label: labels.get(e.agentId) ?? null };
      merged.set(keyOf(rec), rec);
      added++;
    }
  }
}
writeFileSync(outFile, [...merged.values()].map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(
  `${kind}: ${added} results read, ${unknown} with unknown ids, ${merged.size} records now`
);
