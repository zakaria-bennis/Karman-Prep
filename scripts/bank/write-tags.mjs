// Bank stream (2026-11-22): write the 72-skill tags decided by scripts/bank/decide.ts into
// question_skills72 (a table only the bank work writes; an upsert per question is safe). Rows go
// in chunks, and the count is read back at the end.
// Usage: node scripts/bank/write-tags.mjs <work-dir> <run> [--dry]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "./db.mjs";

const [work, run] = process.argv.slice(2);
const dry = process.argv.includes("--dry");
if (!work || !run) throw new Error("usage: write-tags.mjs <work-dir> <run> [--dry]");
const decided = readFileSync(join(work, "decisions", "skills.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));
const rows = decided.map((d) => ({
  question_id: d.id,
  skill_id: d.skill,
  confidence: Math.max(0, Math.min(1, d.confidence)),
  decided_by: d.decided_by,
  classifier_a: d.a,
  classifier_b: d.b,
  judge: d.judge,
  poor_fit: d.poor_fit,
  reason: d.reason ? String(d.reason).slice(0, 300) : null,
  run,
  tagged_at: new Date().toISOString(),
}));
console.log(`${rows.length} tags to write${dry ? " (dry run)" : ""}`);
if (!dry) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from("question_skills72")
      .upsert(rows.slice(i, i + 500), { onConflict: "question_id" });
    if (error) throw new Error(`chunk ${i}: ${error.message}`);
  }
  const { count, error } = await db
    .from("question_skills72")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  console.log(`question_skills72 now holds ${count} rows`);
}
