// Bank stream (overnight build, 2026-11-22): turn the backup into question batches for the two
// independent check passes (one skill of the 72 and a blind answer per question). The answer key,
// explanations, hints, grading notes and old tags are left out, so a checker never sees them.
// Usage: node scripts/bank/prep-check-batches.mjs <backup-dir> <work-dir> [--archived]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [backup, work] = process.argv.slice(2);
const archivedToo = process.argv.includes("--archived");
if (!backup || !work) throw new Error("usage: prep-check-batches.mjs <backup-dir> <work-dir>");

const lines = (f) =>
  readFileSync(join(backup, f), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
const questions = lines("quiz_questions.jsonl");
const choices = lines("answer_choices.jsonl");
const byQuestion = new Map();
for (const c of choices) {
  if (!byQuestion.has(c.question_id)) byQuestion.set(c.question_id, []);
  byQuestion.get(c.question_id).push(c);
}

const images = join(work, "images");
mkdirSync(images, { recursive: true });

async function localImage(q) {
  if (!q.image_url) return null;
  if (q.image_url.startsWith("/")) {
    // served from the app's own public folder
    const file = join(process.cwd(), "public", q.image_url);
    return existsSync(file) ? file : `unavailable (${q.image_url})`;
  }
  const ext = q.image_url.split("?")[0].split(".").pop().toLowerCase();
  const file = join(
    images,
    `${q.id}.${["png", "jpg", "jpeg", "svg", "webp"].includes(ext) ? ext : "png"}`
  );
  if (!existsSync(file)) {
    const res = await fetch(q.image_url);
    if (!res.ok) return `unavailable (${res.status})`;
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

const keep = (v) => v !== null && v !== undefined && v !== "";
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => keep(v)));
}

const out = { reading: [], math: [] };
for (const q of questions) {
  if (q.archived_at && !archivedToo) continue;
  if (!q.archived_at && archivedToo) continue;
  const list = (byQuestion.get(q.id) ?? []).sort((a, b) => a.letter.localeCompare(b.letter));
  out[q.subject].push(
    compact({
      id: q.id,
      format: q.answer_format,
      passage_intro: q.passage_intro,
      passage: q.passage,
      passage_a: q.passage_a,
      passage_b: q.passage_b,
      question: q.question_text,
      table: q.figure_table_data,
      chart: q.figure_chart_data,
      graph: q.figure_graph_data,
      geometry: q.figure_geometry_data,
      figure_spec: q.figure_spec,
      figure_svg: q.figure_kind === "image" && !q.image_url ? q.figure_svg : null,
      image: await localImage(q),
      image_alt: q.image_alt,
      choices:
        q.answer_format === "multiple_choice"
          ? list.map((c) =>
              compact({
                letter: c.letter,
                text: c.choice_text,
                table: c.choice_table_data,
                figure_spec: c.choice_figure_spec,
              })
            )
          : undefined,
    })
  );
}

const SIZE = { reading: 40, math: 25 };
const tag = archivedToo ? "arch" : "main";
const dir = join(work, "batches", tag);
mkdirSync(dir, { recursive: true });
const index = [];
for (const subject of ["reading", "math"]) {
  const list = out[subject].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i * SIZE[subject] < list.length; i++) {
    const batch = list.slice(i * SIZE[subject], (i + 1) * SIZE[subject]);
    const file = join(dir, `${subject}-${String(i + 1).padStart(3, "0")}.json`);
    writeFileSync(file, JSON.stringify(batch, null, 1) + "\n");
    index.push({ file, subject, n: batch.length, ids: batch.map((q) => q.id) });
  }
}
writeFileSync(join(dir, "index.json"), JSON.stringify(index) + "\n");
console.log(
  tag,
  "reading",
  out.reading.length,
  "math",
  out.math.length,
  "batches",
  index.length,
  index.filter((b) => b.subject === "reading").length,
  "rw /",
  index.filter((b) => b.subject === "math").length,
  "math"
);
