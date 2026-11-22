// Bank stream (2026-11-22): hide the questions the key check held, through the admin's own flag
// path (import_status = needs_review makes is_live false; the admin's accept action restores it),
// never deleting a row or changing a key; and record every key check in question_bank_checks
// (short verdicts only: the database is on a 500 MB plan).
// Usage: node scripts/bank/hold-and-record.mjs <backup-dir> <work-dir> <run> [--dry]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "./db.mjs";

const [backup, work, run] = process.argv.slice(2);
const dry = process.argv.includes("--dry");
const jsonl = (f) =>
  readFileSync(f, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
const rows = new Map(jsonl(join(backup, "quiz_questions.jsonl")).map((r) => [r.id, r]));
const keys = jsonl(join(work, "decisions", "keys.jsonl"));

const held = keys.filter((k) => k.verdict.startsWith("held"));
let hidden = 0;
let alreadyHidden = 0;
for (const k of held) {
  const ruling = k.rulings[k.rulings.length - 1];
  const { data: live, error } = await db
    .from("quiz_questions")
    .select("id, is_live, import_status")
    .eq("id", k.id)
    .single();
  if (error) throw new Error(error.message);
  if (!live.is_live) {
    alreadyHidden++;
    continue;
  }
  const reason = `bank 2026-11-22: ${k.verdict.slice(6)}. ${ruling.reason}`.slice(0, 480);
  if (dry) {
    hidden++;
    continue;
  }
  const { data: upd, error: e2 } = await db
    .from("quiz_questions")
    .update({
      import_status: "needs_review",
      import_flag_type: "partial_emit",
      import_flag_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", k.id)
    .eq("is_live", true)
    .select("id, is_live");
  if (e2) throw new Error(e2.message);
  if (upd?.length === 1 && upd[0].is_live === false) hidden++;
}
console.log(`held ${held.length}: hidden now ${hidden}, already hidden ${alreadyHidden}`);

// one short evidence row per checked question
const records = keys.map((k) => {
  const r = k.rulings?.[k.rulings.length - 1];
  return {
    question_id: k.id,
    kind: k.verdict.startsWith("held") ? "hold" : "key",
    verdict: k.verdict.slice(0, 100),
    detail: r
      ? { a: k.a, b: k.b, ruling: r.ruling, answer: r.answer, why: r.reason.slice(0, 300) }
      : { a: k.a, b: k.b },
    run,
  };
});
if (!dry) {
  const { count: before } = await db
    .from("question_bank_checks")
    .select("*", { count: "exact", head: true })
    .eq("run", run);
  if (before) console.log(`run ${run} already has ${before} check rows; not adding again`);
  else
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await db.from("question_bank_checks").insert(records.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }
}
console.log(`${records.length} check rows${dry ? " (dry)" : ""}`);
void rows;
