// Bank stream (2026-11-22): batch files for the third-opinion stages (skill judge, key
// adjudicator), each question with its content from the main batches plus what the two blind
// passes said. Only the adjudicator's files carry the stored key.
// Usage: node scripts/bank/prep-queue-batches.mjs <work-dir> judge|adjudicate [size]
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const [work, stage, sizeArg] = process.argv.slice(2);
const size = Number(sizeArg ?? (stage === "judge" ? 25 : 8));
const index = JSON.parse(readFileSync(join(work, "batches", "main", "index.json"), "utf8"));
const content = new Map();
for (const b of index)
  for (const q of JSON.parse(readFileSync(b.file, "utf8"))) content.set(q.id, q);
const queue = JSON.parse(readFileSync(join(work, "decisions", `${stage}-queue.json`), "utf8"));
const dir = join(work, "batches", stage);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const items = queue.map((x) => {
  const q = content.get(x.id);
  if (stage === "judge")
    return {
      ...q,
      classifier_1: { skill: x.a, confidence: x.a_confidence, second: x.a_second },
      classifier_2: { skill: x.b, confidence: x.b_confidence, second: x.b_second },
    };
  return {
    ...q,
    stored_key: x.key,
    solver_1: { answer: x.a, issue: x.a_issue, note: x.a_note },
    solver_2: { answer: x.b, issue: x.b_issue, note: x.b_note },
    ...(x.suspect ? { outside_report: x.suspect } : {}),
    ...(x.first ? { earlier_ruling: { ruling: x.first.ruling, answer: x.first.answer } } : {}),
  };
});
// math and reading apart, so one helper keeps one mindset
const subjectOf = new Map(index.flatMap((b) => b.ids.map((id) => [id, b.subject])));
const groups = { reading: [], math: [] };
for (const it of items) groups[subjectOf.get(it.id)].push(it);
const names = [];
for (const [subject, list] of Object.entries(groups))
  for (let i = 0; i * size < list.length; i++) {
    const name = `${subject}-${String(i + 1).padStart(3, "0")}`;
    const batch = list.slice(i * size, (i + 1) * size);
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(batch, null, 1) + "\n");
    names.push([name, batch.length]);
  }
writeFileSync(join(dir, "items.json"), JSON.stringify(names));
console.log(stage, items.length, "questions in", names.length, "batches");
