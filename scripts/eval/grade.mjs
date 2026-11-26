// Reads the solver's final answer from each output (the last \boxed{...}), turns a choice's text into
// its letter, compares with the bank answer, and lists mismatches in review_list.md.
// Usage (from the repo root): node grade.mjs <questions.json>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { db } from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/scripts/bank/db.mjs";
const E = "/Users/zakariabennis/Documents/Karman-SAT-eval";
const list = JSON.parse(readFileSync(process.argv[2], "utf8"));
const unfrac = (s) =>
  String(s ?? "")
    .replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/\\left|\\right/g, "");
const norm = (s) =>
  String(s ?? "")
    .replace(/\\\(|\\\)/g, "")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/[\s$\\{}]/g, "")
    .replace(/^\(?([A-D])\)?$/, "$1")
    .toLowerCase();
const num = (s) => {
  const t = norm(unfrac(s))
    .replace(/,/g, "")
    .replace(/^[a-z]=/, "")
    .replace(/−/g, "-")
    .replace(/^\((-?\d+)\)\/\((\d+)\)$/, "$1/$2")
    .replace(/^-\((\d+)\)\/\((\d+)\)$/, "-$1/$2");
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
  // the last \boxed{...}, with any depth of braces inside; else the line after "Final Answer"
  let boxed = null;
  for (let i = out.explanation.lastIndexOf("\\boxed{"); i >= 0 && boxed === null; i = -1) {
    let d = 0,
      j = i + 6;
    for (; j < out.explanation.length; j++) {
      const c = out.explanation[j];
      if (c === "{") d++;
      else if (c === "}") {
        d--;
        if (d === 0) break;
      }
    }
    boxed = out.explanation.slice(i + 7, j);
  }
  if (boxed === null)
    boxed = out.explanation.match(/Final Answer\s*\n+\s*(?:\$+)?\s*([^\n$]+)/)?.[1]?.trim() ?? null;
  let letter = null;
  if (q.answer_format === "multiple_choice") {
    const plain = String(boxed ?? "")
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/\\[,;! ]/g, " ")
      .trim();
    const lead = plain.match(/^\(?([A-D])\)?(?=$|[\s,.:)])/);
    if (lead) letter = lead[1];
    else if (boxed !== null) {
      const { data } = await db
        .from("answer_choices")
        .select("letter,choice_text")
        .eq("question_id", q.id);
      const hit =
        data.find((c) => norm(unfrac(c.choice_text)) === norm(unfrac(boxed))) ??
        data.find((c) => num(c.choice_text) !== null && num(c.choice_text) === num(boxed));
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
  rows.push({
    qid: q.qid,
    section: q.section,
    id: q.id,
    bank: key,
    solver: out.final_answer,
    match: ok,
  });
  if (!ok)
    miss.push(
      `- **${q.qid}** (${q.id}) bank answer **${key}**, solver answer **${out.final_answer ?? "none found"}**. Picture: clean/${q.qid}.png`
    );
}
// 20 matches per section for a spot check, picked by a fixed hash of the question id (same every run)
const h = (t) => [...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const spot = (sec) =>
  rows
    .filter((r) => r.match && r.section === sec)
    .sort((a, b) => h(a.id) - h(b.id))
    .slice(0, 20)
    .sort((a, b) => a.qid.localeCompare(b.qid));
const line = (r) =>
  `- **${r.qid}** (${r.id}) bank answer **${r.bank}**, solver answer **${r.solver}**. Picture: clean/${r.qid}.png`;
const graded = rows.filter((r) => r.match !== undefined);
const tally = (sec) => {
  const g = graded.filter((r) => r.section === sec);
  return `${sec}: ${g.filter((r) => r.match).length} of ${g.length} agree`;
};
writeFileSync(
  `${E}/review_list.md`,
  [
    "# Answers to check by hand",
    "",
    `${tally("Math")}. ${tally("Reading and Writing")}.`,
    "",
    "## The solver and the bank disagree",
    "",
    "Look at the picture and say which answer is right.",
    "",
    miss.join("\n") || "None.",
    "",
    "## Spot check: 20 agreements in Math",
    "",
    "Both say the same answer. Say if the answer is wrong anyway.",
    "",
    spot("Math").map(line).join("\n"),
    "",
    "## Spot check: 20 agreements in Reading and Writing",
    "",
    spot("Reading and Writing").map(line).join("\n"),
    "",
  ].join("\n")
);
console.table(rows);
