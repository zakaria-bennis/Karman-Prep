// Picks 5 varied pilot questions: Math with a figure, Math typed answer, and three Reading and Writing domains.
import { readFileSync, writeFileSync } from "node:fs";
import { db } from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/scripts/bank/db.mjs";
const E = "/Users/zakariabennis/Documents/Karman-SAT-eval";
const src = readFileSync("src/lib/skills/ids72.ts", "utf8");
const dom = {};
for (const m of src.matchAll(/id: "([^"]+)",\s*section: "([^"]+)",\s*domain: "([^"]+)"/g))
  dom[m[1]] = m[3];
const pool = JSON.parse(readFileSync(`${E}/pool.json`, "utf8")).filter((r) => !r.poor_fit);
let seed = 20261126;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const shuffled = pool
  .map((r) => [rnd(), r])
  .sort((a, b) => a[0] - b[0])
  .map((x) => x[1]);
const want = [
  { d: "Geometry and Trigonometry", lvl: 4, fig: true, fmt: "multiple_choice" },
  { d: "Algebra", lvl: 6, fmt: "numeric_entry" },
  { d: "Craft and Structure", lvl: 3 },
  { d: "Standard English Conventions", lvl: 5 },
  { d: "Information and Ideas", lvl: 2 },
];
const out = [];
for (const w of want) {
  for (const r of shuffled) {
    if (dom[r.skill] !== w.d || r.difficulty_level !== w.lvl) continue;
    if (w.fmt && r.answer_format !== w.fmt) continue;
    if (w.fig) {
      const { data } = await db
        .from("quiz_questions")
        .select("figure_kind,image_url")
        .eq("id", r.id)
        .single();
      if (!data.figure_kind && !data.image_url) continue;
    }
    out.push({ ...r, domain72: dom[r.skill] });
    break;
  }
}
out.forEach((r, i) => (r.qid = `P${String(i + 1).padStart(2, "0")}`));
writeFileSync(`${E}/pilot.json`, JSON.stringify(out, null, 2));
console.log(
  out
    .map(
      (r) => `${r.qid} ${r.id} ${r.domain72} L${r.difficulty_level} ${r.skill} ${r.answer_format}`
    )
    .join("\n")
);
