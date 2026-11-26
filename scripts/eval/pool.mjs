// Reads the pool of real, live, student-ready questions with level and 72-skill tag. Run from the repo root.
import { writeFileSync } from "node:fs";
import {
  selectAll,
  db,
} from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/scripts/bank/db.mjs";
const qs = await selectAll(
  "quiz_questions",
  "id,subject,domain,difficulty_level,answer_format,correct_answer,origin,is_live,publish_status,archived_at",
  {
    filter: (q) =>
      q
        .eq("origin", "original")
        .eq("is_live", true)
        .in("publish_status", ["publish_ready", "publish_ready_with_verified_repair"])
        .is("archived_at", null),
  }
);
const tags = [];
for (let last = null; ; ) {
  let q = db
    .from("question_skills72")
    .select("id:question_id,skill_id,poor_fit")
    .order("question_id")
    .limit(1000);
  if (last) q = q.gt("question_id", last);
  const { data, error } = await q;
  if (error) throw error;
  tags.push(...data);
  if (data.length < 1000) break;
  last = data[data.length - 1].id;
}
const tag = new Map(tags.map((t) => [t.id, t]));
const rows = qs.map((q) => ({
  ...q,
  skill: tag.get(q.id)?.skill_id ?? null,
  poor_fit: tag.get(q.id)?.poor_fit ?? null,
}));
writeFileSync(process.argv[2], JSON.stringify(rows));
const by = (k) => rows.reduce((m, r) => ((m[r[k]] = (m[r[k]] || 0) + 1), m), {});
console.log("total", rows.length, "untagged", rows.filter((r) => !r.skill).length);
console.log(by("subject"), by("difficulty_level"), by("answer_format"));
console.log("skills", new Set(rows.map((r) => r.skill)).size);
