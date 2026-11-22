// Bank stream (2026-11-22): rebuild each question's final explanation and hint from explanation
// workflow journals. A question passes when the independent checker passed the first version, or
// passed the version the writer fixed after the checker's notes. Everything else is "failed" and
// keeps its old explanation. Output: <work>/results/explain-final.jsonl (latest run wins).
// Usage: node scripts/bank/collect-explain.mjs <work-dir> <journal.jsonl>...
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const [work, ...journals] = process.argv.slice(2);
const outFile = join(work, "results", "explain-final.jsonl");
const merged = new Map();
if (existsSync(outFile))
  for (const l of readFileSync(outFile, "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(l);
    merged.set(r.id, r);
  }
const tally = { passed_first: 0, passed_after_fix: 0, failed: 0, unchecked: 0 };
for (const j of journals) {
  const run = basename(dirname(j));
  const labels = new Map();
  const stage = {}; // batch -> {write, check, fix, recheck}
  for (const line of readFileSync(j, "utf8").split("\n").filter(Boolean)) {
    const e = JSON.parse(line);
    if (e.type === "started") labels.set(e.agentId, e.label);
    if (e.type !== "result") continue;
    const label = labels.get(e.agentId) ?? "";
    const [kind, batch] = label.split(":");
    if (!batch) continue;
    stage[batch] = stage[batch] ?? {};
    stage[batch][kind] = Array.isArray(e.result?.results) ? e.result.results : [];
  }
  for (const [batch, s] of Object.entries(stage)) {
    const written = new Map((s.write ?? []).map((r) => [r.id, r]));
    const fixed = new Map((s.fix ?? []).map((r) => [r.id, r]));
    const first = new Map((s.check ?? []).map((r) => [r.id, r]));
    const second = new Map((s.recheck ?? []).map((r) => [r.id, r]));
    for (const [id, w] of written) {
      const c1 = first.get(id);
      const c2 = second.get(id);
      let rec;
      if (c1?.verdict === "pass") rec = { ...w, status: "passed_first", problems: [] };
      else if (c2?.verdict === "pass" && fixed.has(id))
        rec = { ...fixed.get(id), status: "passed_after_fix", problems: c1?.problems ?? [] };
      else if (!c1) rec = { ...w, status: "unchecked", problems: [] };
      else
        rec = {
          ...(fixed.get(id) ?? w),
          status: "failed",
          problems: c2?.problems ?? c1?.problems ?? [],
        };
      merged.set(id, {
        id,
        explanation: rec.explanation,
        hint: rec.hint,
        status: rec.status,
        problems: rec.problems,
        batch,
        run,
      });
      tally[rec.status]++;
    }
  }
}
writeFileSync(outFile, [...merged.values()].map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(JSON.stringify({ ...tally, total_records: merged.size }));
