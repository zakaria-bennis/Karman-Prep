// Reads the solver's final answer from each output (the last \boxed{...}), turns a choice's text into
// its letter, compares with the bank answer, and lists mismatches in review_list.md.
// Usage (from the repo root): node grade.mjs <questions.json>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { db } from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/scripts/bank/db.mjs";
const E = "/Users/zakariabennis/Documents/Karman-SAT-eval";
const list = JSON.parse(readFileSync(process.argv[2], "utf8"));
const norm = (s) =>
  String(s ?? "")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/[\s$\\{}]/g, "")
    .replace(/^\(?([A-D])\)?$/, "$1")
    .toLowerCase();
const num = (s) => {
  const t = norm(s).replace(/−/g, "-");
  if (/^-?\d+\/\d+$/.test(t)) {
    const [a, b] = t.split("/");
    return Number(a) / Number(b);
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const rows = [],
  miss = [];
for (const q of list) {
  const f = `${E}/solver_outputs/${q.qid}.json`;
  if (!existsSync(f)) {
    rows.push({ qid: q.qid, status: "no output" });
    continue;
  }
  const out = JSON.parse(readFileSync(f, "utf8"));
  const boxed =
    [...out.explanation.matchAll(/\\boxed\{((?:[^{}]|\{[^{}]*\})*)\}/g)].map((m) => m[1]).pop() ??
    null;
  let letter = null;
  if (q.answer_format === "multiple_choice") {
    if (/^[A-D]$/i.test(norm(boxed))) letter = norm(boxed).toUpperCase();
    else {
      const { data } = await db
        .from("answer_choices")
        .select("letter,choice_text")
        .eq("question_id", q.id);
      const hit = data.find((c) => norm(c.choice_text) === norm(boxed));
      letter = hit?.letter ?? null;
    }
  }
  out.final_answer = letter ?? boxed;
  writeFileSync(f, JSON.stringify(out, null, 2));
  const key = String(q.correct_answer).trim();
  const ok =
    q.answer_format === "multiple_choice"
      ? out.final_answer === key.toUpperCase()
      : num(out.final_answer) !== null && Math.abs(num(out.final_answer) - num(key)) < 1e-6;
  rows.push({ qid: q.qid, bank: key, solver: out.final_answer, match: ok });
  if (!ok)
    miss.push(
      `- **${q.qid}** (${q.id}) bank answer **${key}**, solver answer **${out.final_answer ?? "none found"}**. Picture: clean/${q.qid}.png`
    );
}
writeFileSync(
  `${E}/review_list.md`,
  `# Answers to check by hand\n\nThe solver and the bank disagree on these. Look at the picture and say which is right.\n\n${miss.join("\n") || "None so far."}\n`
);
console.table(rows);
