import { selectAll } from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/scripts/bank/db.mjs";
const rows = await selectAll("quiz_questions", "id,subject,passage_intro,passage,question_text", {
  filter: (q) =>
    q
      .eq("origin", "original")
      .eq("is_live", true)
      .eq("subject", "reading")
      .in("publish_status", ["publish_ready", "publish_ready_with_verified_repair"])
      .is("archived_at", null),
});
const show = (tag, r) =>
  console.log(
    tag,
    r.id,
    JSON.stringify(
      (r.passage_intro ?? "") +
        " || " +
        (r.passage ?? "").slice(0, 120) +
        " || " +
        r.question_text.slice(0, 200)
    )
  );
let n = {};
for (const r of rows) {
  const all = [r.passage_intro, r.passage, r.question_text].filter(Boolean).join("\n\n");
  const tags = [];
  if (/Amos\nBarton/.test(all)) tags.push("eliot-break");
  if (/\bpoem\b/i.test(all) && (all.match(/\n[A-Z][^\n]{5,55}\n[A-Z]/g) || []).length >= 1)
    tags.push("poem-lines");
  if (/^Which choice[^\n]*\?\n\n/.test(r.question_text)) tags.push("prompt-first");
  if (/[a-z,]\n[a-z]/.test(all)) tags.push("midbreak");
  for (const t of tags) if ((n[t] = (n[t] || 0) + 1) <= 3) show(t, r);
}
console.log(n);
