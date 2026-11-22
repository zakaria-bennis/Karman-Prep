// Bank stream (2026-11-22): batch files for the explanation writers, skill by skill, the two
// sections interleaved (a Reading and Writing skill, then a Math skill, and so on). Only questions
// whose key is settled (confirmed by both blind solvers, or kept by the adjudicator) and that have
// no new explanation yet. Each question carries its correct answer, its skill and the old
// explanation for reference.
// Usage: node scripts/bank/prep-explain-batches.mjs <backup-dir> <work-dir> <round-name>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [backup, work, round] = process.argv.slice(2);
if (!round) throw new Error("usage: prep-explain-batches.mjs <backup-dir> <work-dir> <round-name>");
const jsonl = (f) =>
  existsSync(f)
    ? readFileSync(f, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
const rows = new Map(jsonl(join(backup, "quiz_questions.jsonl")).map((q) => [q.id, q]));
const choicesOf = new Map();
for (const c of jsonl(join(backup, "answer_choices.jsonl"))) {
  if (!choicesOf.has(c.question_id)) choicesOf.set(c.question_id, []);
  choicesOf.get(c.question_id).push(c);
}
const evidenceOf = new Map(
  jsonl(join(backup, "answer_key_entries.jsonl")).map((k) => [k.question_id, k.raw_model_response])
);
const index = JSON.parse(readFileSync(join(work, "batches", "main", "index.json"), "utf8"));
const content = new Map();
for (const b of index)
  for (const q of JSON.parse(readFileSync(b.file, "utf8"))) content.set(q.id, q);

const skillOf = new Map(jsonl(join(work, "decisions", "skills.jsonl")).map((s) => [s.id, s.skill]));
const passA = new Map(jsonl(join(work, "results", "pass-A.jsonl")).map((r) => [r.id, r.skill]));
const settled = new Set(
  jsonl(join(work, "decisions", "keys.jsonl"))
    .filter((k) => k.verdict === "confirmed" || k.verdict.startsWith("kept"))
    .map((k) => k.id)
);
const done = new Set(jsonl(join(work, "results", "explain-final.jsonl")).map((r) => r.id));
const queued = new Set(
  existsSync(join(work, "batches", "explain", "queued.json"))
    ? JSON.parse(readFileSync(join(work, "batches", "explain", "queued.json"), "utf8"))
    : []
);

const ids72 = [
  ...readFileSync("src/lib/skills/ids72.ts", "utf8").matchAll(
    /id: "([^"]+)",\s*section: "([^"]+)",\s*domain: "[^"]+",\s*name: "([^"]+)",\s*tests: "([^"]+)"/g
  ),
].map((m) => ({ id: m[1], section: m[2], name: m[3], tests: m[4] }));
const rw = ids72.filter((s) => s.section !== "Math");
const ma = ids72.filter((s) => s.section === "Math");
const order = [];
for (let i = 0; i < Math.max(rw.length, ma.length); i++) {
  if (rw[i]) order.push(rw[i]);
  if (ma[i]) order.push(ma[i]);
}

function reviewedValues(row) {
  const ev = evidenceOf.get(row.id);
  const e =
    ev && typeof ev === "object"
      ? ev.kind === "independently_confirmed_generated"
        ? ev.evidence
        : ev
      : null;
  const set = e?.numeric_answer_set?.answers ?? e?.numeric_answer_set?.values;
  return Array.isArray(set) ? set.map(String) : [];
}

const bySkill = new Map(order.map((s) => [s.id, []]));
for (const [id, q] of content) {
  if (!settled.has(id) || done.has(id) || queued.has(id)) continue;
  const row = rows.get(id);
  const skill = skillOf.get(id) ?? passA.get(id);
  if (!row || !skill || !bySkill.has(skill)) continue;
  const list = (choicesOf.get(id) ?? []).sort((a, b) => a.letter.localeCompare(b.letter));
  const key = String(row.correct_answer).trim();
  const correct =
    row.answer_format === "multiple_choice"
      ? { letter: key, text: list.find((c) => c.letter === key)?.choice_text ?? null }
      : { values: [...new Set([key, ...reviewedValues(row)])] };
  bySkill.get(skill).push({
    ...q,
    correct,
    old_explanation: (row.explanation_text ?? "").slice(0, 2500),
    old_hint: row.hint ?? null,
  });
}

const dir = join(work, "batches", "explain", round);
mkdirSync(dir, { recursive: true });
const items = [];
for (const s of order) {
  const list = bySkill.get(s.id).sort((a, b) => a.id.localeCompare(b.id));
  const size = s.section === "Math" ? 8 : 10;
  for (let i = 0; i * size < list.length; i++) {
    const name = String(items.length + 1).padStart(4, "0");
    const batch = list
      .slice(i * size, (i + 1) * size)
      .map((q) => ({ ...q, skill: { id: s.id, name: s.name, tests: s.tests } }));
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(batch, null, 1) + "\n");
    items.push([name, batch.length, s.name, s.tests, s.id]);
  }
}
writeFileSync(join(dir, "items.json"), JSON.stringify(items));
const now = [
  ...queued,
  ...items.flatMap(([name]) =>
    JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8")).map((q) => q.id)
  ),
];
writeFileSync(join(work, "batches", "explain", "queued.json"), JSON.stringify(now));
console.log(
  round,
  items.length,
  "batches,",
  items.reduce((a, x) => a + x[1], 0),
  "questions"
);
