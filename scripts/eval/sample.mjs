// Picks 140 questions: 100 to tune on and 40 held back, spread across all 72 skills, all 7 levels and
// the 8 domains. Every skill appears in the tuning set; the 40 held back are second questions from 40
// skills, spread across domains and levels. Pilot questions are left out. Writes sample.csv and
// sample.json (Q001-Q140 in a shuffled order, so the number says nothing about the split).
// Run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";
import { db } from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/scripts/bank/db.mjs";
const E = "/Users/zakariabennis/Documents/Karman-SAT-eval";
const src = readFileSync("src/lib/skills/ids72.ts", "utf8");
const meta = {};
for (const m of src.matchAll(
  /id: "([^"]+)",\s*section: "([^"]+)",\s*domain: "([^"]+)",\s*name: "([^"]+)"/g
))
  meta[m[1]] = { section: m[2], domain: m[3], name: m[4] };
const pilot = new Set(JSON.parse(readFileSync(`${E}/pilot.json`, "utf8")).map((p) => p.id));
let seed = 20261126;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const shuffle = (a) =>
  a
    .map((x) => [rnd(), x])
    .sort((p, q) => p[0] - q[0])
    .map((p) => p[1]);
const pool = shuffle(
  JSON.parse(readFileSync(`${E}/pool.json`, "utf8")).filter(
    (r) => !r.poor_fit && !pilot.has(r.id) && meta[r.skill]
  )
);

// A question whose figure is promised but missing cannot be shown: check candidates as we go.
const figCache = new Map();
async function showable(r) {
  if (figCache.has(r.id)) return figCache.get(r.id);
  const { data } = await db
    .from("quiz_questions")
    .select(
      "figure_kind,image_url,figure_svg,figure_spec,figure_table_data,figure_chart_data,figure_geometry_data,question_text"
    )
    .eq("id", r.id)
    .single();
  const promised = !!data.figure_kind;
  const has =
    data.image_url ||
    data.figure_svg ||
    data.figure_spec ||
    data.figure_table_data ||
    data.figure_chart_data ||
    data.figure_geometry_data;
  const ok = (!promised || !!has) && (data.question_text ?? "").trim().length > 0;
  figCache.set(r.id, ok);
  return ok;
}

const bySkill = {};
for (const r of pool) (bySkill[r.skill] ??= []).push(r);
const skills = shuffle(Object.keys(meta));
const levelCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
const used = new Set();
async function pick(skill) {
  // the level with the fewest picks so far that this skill has, then the next fewest
  const levels = Object.keys(levelCount)
    .map(Number)
    .sort((a, b) => levelCount[a] - levelCount[b] || rnd() - 0.5);
  for (const lvl of levels)
    for (const r of bySkill[skill] ?? [])
      if (!used.has(r.id) && r.difficulty_level === lvl && (await showable(r))) {
        used.add(r.id);
        levelCount[lvl]++;
        return r;
      }
  return null;
}
const tuning = [],
  held = [];
for (const s of skills) {
  const r = await pick(s);
  if (r) tuning.push(r);
}
// 40 held back: second questions, spread over the 8 domains in proportion to their skills
const domains = [...new Set(Object.values(meta).map((m) => m.domain))];
const skillsIn = (d) => skills.filter((s) => meta[s].domain === d);
const quota = Object.fromEntries(
  domains.map((d) => [d, Math.round((40 * skillsIn(d).length) / 72)])
);
let diff = 40 - Object.values(quota).reduce((a, b) => a + b, 0);
for (const d of domains) {
  if (!diff) break;
  quota[d] += Math.sign(diff);
  diff -= Math.sign(diff);
}
const heldSkills = new Set();
for (const d of domains)
  for (const s of skillsIn(d).slice(0, quota[d])) {
    const r = await pick(s);
    if (r) {
      held.push(r);
      heldSkills.add(s);
    }
  }
// 28 more tuning questions from skills not already doubled
for (const s of skills) {
  if (tuning.length >= 100) break;
  if (heldSkills.has(s)) continue;
  const r = await pick(s);
  if (r) tuning.push(r);
}
for (const s of skills) {
  if (tuning.length >= 100) break;
  const r = await pick(s);
  if (r) tuning.push(r);
}

const all = shuffle([
  ...tuning.map((r) => ({ ...r, split: "tuning" })),
  ...held.map((r) => ({ ...r, split: "heldout" })),
]);
all.forEach((r, i) => (r.qid = `Q${String(i + 1).padStart(3, "0")}`));
const rows = all.map((r) => ({
  qid: r.qid,
  id: r.id,
  section: meta[r.skill].section,
  domain: meta[r.skill].domain,
  skill: r.skill,
  difficulty: r.difficulty_level,
  format: r.answer_format,
  split: r.split,
  bank_answer: r.correct_answer,
}));
writeFileSync(
  `${E}/sample.json`,
  JSON.stringify(
    rows.map((r) => ({ ...r, answer_format: r.format, correct_answer: r.bank_answer })),
    null,
    2
  )
);
const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync(
  `${E}/sample.csv`,
  [
    "qid,id,section,domain,skill,difficulty,format,split,bank_answer",
    ...rows.map((r) => Object.values(r).map(esc).join(",")),
  ].join("\n") + "\n"
);
const tally = (k, f = () => true) =>
  rows.filter(f).reduce((m, r) => ((m[r[k]] = (m[r[k]] || 0) + 1), m), {});
console.log(
  "tuning",
  tuning.length,
  "held",
  held.length,
  "skills in tuning",
  new Set(tuning.map((r) => r.skill)).size
);
console.log("levels", levelCount);
console.log(
  "domains tuning",
  tally("domain", (r) => r.split === "tuning")
);
console.log(
  "domains held",
  tally("domain", (r) => r.split === "heldout")
);
console.log(
  "levels held",
  tally("difficulty", (r) => r.split === "heldout")
);
console.log("typed answers", tally("format"));
