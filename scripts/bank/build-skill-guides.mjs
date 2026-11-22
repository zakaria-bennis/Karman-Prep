// Bank stream (2026-11-22): the two classifiers' guides. Same rules (prompts/skills72-rules.md), the
// 72 skills listed in a different order, and different real example questions from the bank, so the
// two passes stay independent. Examples come from the old sub-skill map (src/data/curriculum/
// sub-skill-map.json) through the bridge, with a text check for skills that share a sub-skill.
// Usage: node scripts/bank/build-skill-guides.mjs <backup-dir> <work-dir>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [backup, work] = process.argv.slice(2);
const rules = readFileSync("scripts/bank/prompts/skills72-rules.md", "utf8");
const idsSrc = readFileSync("src/lib/skills/ids72.ts", "utf8");
const skills = [
  ...idsSrc.matchAll(
    /id: "([^"]+)",\s*section: "([^"]+)",\s*domain: "([^"]+)",\s*name: "([^"]+)",\s*tests: "([^"]+)"/g
  ),
].map((m) => ({ id: m[1], section: m[2], domain: m[3], name: m[4], tests: m[5] }));
if (skills.length !== 72) throw new Error(`expected 72 skills, read ${skills.length}`);

const bridgeSrc = readFileSync("src/lib/portal/skill-bridge.ts", "utf8");
const map = JSON.parse(readFileSync("src/data/curriculum/sub-skill-map.json", "utf8"));
const lines = (f) =>
  readFileSync(join(backup, f), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
const questions = lines("quiz_questions.jsonl").filter((q) => q.is_live);
const choices = new Map();
for (const c of lines("answer_choices.jsonl")) {
  if (!choices.has(c.question_id)) choices.set(c.question_id, []);
  choices.get(c.question_id).push(c);
}
const byPrefix = new Map(questions.map((q) => [q.id.slice(0, map.prefix), q]));

// The bridge's sub-skill ids, expanded from its helper calls, by skill name.
const helpers = {
  CID: "rw-skill-central-ideas-and-details--",
  COE: "rw-skill-command-of-evidence--",
  INF: "rw-skill-inferences--",
  WIC: "rw-skill-words-in-context--",
  TSP: "rw-skill-text-structure-and-purpose--",
  CTC: "rw-skill-cross-text-connections--",
  SYN: "rw-skill-rhetorical-synthesis--",
  TRN: "rw-skill-transitions--",
  LE1: "ma-skill-linear-equations-in-one-variable--",
  LE2: "ma-skill-linear-equations-in-two-variables--",
  LF: "ma-skill-linear-functions--",
  SYS: "ma-skill-systems-of-two-linear-equations-in-two-variables--",
  INQ: "ma-skill-linear-inequalities-in-one-or-two-variables--",
  EQX: "ma-skill-equivalent-expressions--",
  NLE: "ma-skill-nonlinear-equations-in-one-variable-and-systems-of-equations-in-two-variables--",
  NLF: "ma-skill-nonlinear-functions--",
  RAT: "ma-skill-ratios-rates-proportional-relationships-and-units--",
  PCT: "ma-skill-percentages--",
  ONE: "ma-skill-one-variable-data-distributions-and-measures-of-center-and-spread--",
  TWO: "ma-skill-two-variable-data-models-and-scatterplots--",
  AV: "ma-skill-area-and-volume--",
  LAT: "ma-skill-lines-angles-and-triangles--",
  RTT: "ma-skill-right-triangles-and-trigonometry--",
  CIR: "ma-skill-circles--",
};
const subsOf = {};
for (const m of bridgeSrc.matchAll(/^\s*(?:"([^"]+)"|(\w+)): \[([^\]]*)\]/gm)) {
  const name = m[1] ?? m[2];
  const ids = [...m[3].matchAll(/(\w+)\("([^"]+)"\)/g)].map(([, h, k]) =>
    h === "RW" ? `rw-skill-${k}` : h === "MA" ? `ma-skill-${k}` : `${helpers[h]}${k}`
  );
  if (ids.length) subsOf[name] = ids;
}

// "Advanced vocabulary" shares the precise-word blank task; look among those for rare words.
subsOf["Advanced vocabulary"] = ["rw-skill-words-in-context--precise"];
const text = (q) => `${q.question_text ?? ""} ${q.passage ?? ""}`.toLowerCase();
const refine = {
  "Reading tables": (q) => q.figure_table_data != null || q.figure_kind === "table",
  "Reading graphs": (q) => q.figure_kind === "chart" || /graph/.test(text(q)),
  "Advanced vocabulary": (q) =>
    /precise word/.test(text(q)) &&
    (choices.get(q.id) ?? []).every((c) => /^[a-z]{10,}$/.test((c.choice_text ?? "").trim())),
  "Meaning in context": (q) => /most nearly mean/.test(text(q)),
  "Precise word choice": (q) =>
    /precise word/.test(text(q)) &&
    (choices.get(q.id) ?? []).every((c) => (c.choice_text ?? "").length <= 9),
  Radians: (q) => /radian/.test(text(q)),
  Circles: (q) => !/radian/.test(text(q)) && !/x-?y-plane/.test(text(q)),
};

function candidates(skill) {
  const ids = subsOf[skill.name] ?? [];
  const out = [];
  for (const sub of ids)
    for (const p of (map.subSkills[sub] || "").split(" ").filter(Boolean)) {
      const q = byPrefix.get(p);
      if (q && (!refine[skill.name] || refine[skill.name](q))) out.push(q);
    }
  return out
    .filter((q) => (q.question_text ?? "").length + (q.passage ?? "").length < 1500)
    .sort((a, b) => a.id.localeCompare(b.id));
}

const cut = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…` : s);
function example(q) {
  const parts = [];
  if (q.passage_a) parts.push(`Text 1: ${cut(q.passage_a, 260)}`);
  if (q.passage_b) parts.push(`Text 2: ${cut(q.passage_b, 260)}`);
  if (q.passage) parts.push(`Text: ${cut(q.passage, 420)}`);
  if (q.figure_table_data) parts.push("[a table is shown]");
  if (q.figure_kind === "chart" || q.figure_chart_data) parts.push("[a graph is shown]");
  parts.push(`Question: ${cut(q.question_text, 360)}`);
  const list = (choices.get(q.id) ?? []).sort((a, b) => a.letter.localeCompare(b.letter));
  if (list.length) parts.push(`Choices: ${list.map((c) => cut(c.choice_text, 70)).join(" | ")}`);
  return parts.join("\n");
}

const missing = [];
function guide(which) {
  const ordered =
    which === "A"
      ? skills
      : [
          ...skills.filter((s) => s.section === "Math"),
          ...skills.filter((s) => s.section !== "Math"),
        ];
  const out = [rules, "", "## The 72 skills with a real example each", ""];
  for (const s of ordered) {
    const list = candidates(s);
    const pick = which === "A" ? list[0] : (list[Math.floor(list.length / 2)] ?? list[0]);
    out.push(`### ${s.id} (${s.section} > ${s.domain} > ${s.name})`, `Tests: ${s.tests}`);
    if (pick) out.push("Example:", "```", example(pick), "```");
    else missing.push(`${which}:${s.id}`);
    out.push("");
  }
  return out.join("\n");
}

mkdirSync(join(work, "guides"), { recursive: true });
writeFileSync(join(work, "guides", "skills72-guide-A.md"), guide("A"));
writeFileSync(join(work, "guides", "skills72-guide-B.md"), guide("B"));
console.log("guides written; skills without an example:", missing.join(", ") || "none");
