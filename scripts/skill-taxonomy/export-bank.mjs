// Read-only snapshot of the question bank for the skill taxonomy project.
// Writes audit-out/skill-taxonomy/bank.jsonl (gitignored). Never writes to the database.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const OUT = process.env.SKILL_OUT ?? "../Karman-Prep/audit-out/skill-taxonomy";
mkdirSync(OUT, { recursive: true });

const COLS = "id,subject,domain,difficulty_level,answer_format,question_text,passage,passage_a,passage_b,passage_intro," +
  "correct_answer,verified_answer,selected_official_answer,numeric_tolerance,is_live,publish_status,import_status,archived_at," +
  "figure_kind,image_url,image_alt,figure_table_data,figure_chart_data,figure_graph_data,figure_geometry_data,figure_svg," +
  "explanation_text,source_pdf,source_question_number,answer_choices(letter,choice_text,choice_table_data,choice_figure_spec)";

async function all(table, cols) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from(table).select(cols).order("id").range(from, from + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

const questions = await all("quiz_questions", COLS);
const keys = await all("answer_key_entries", "question_id,raw_model_response");
const tagBy = new Map();
for (const k of keys) {
  const t = k.raw_model_response?.approved_tags ?? k.raw_model_response?.evidence?.approved_tags;
  if (k.question_id && t?.catalog_skill_id) tagBy.set(k.question_id, t.catalog_skill_id);
}
const lines = questions.map((q) => {
  const hasFigure = !!(q.image_url || q.figure_svg || q.figure_table_data || q.figure_chart_data || q.figure_graph_data || q.figure_geometry_data);
  return JSON.stringify({
    ...q,
    answer_choices: (q.answer_choices ?? []).sort((a, b) => a.letter.localeCompare(b.letter)),
    key: q.selected_official_answer ?? q.verified_answer ?? q.correct_answer,
    cb_skill: tagBy.get(q.id) ?? null,
    figure_missing: !!q.figure_kind && !hasFigure,
  });
});
writeFileSync(`${OUT}/bank.jsonl`, lines.join("\n") + "\n");
console.log(`exported ${lines.length} questions, ${tagBy.size} with a 39-skill tag -> ${OUT}/bank.jsonl`);
