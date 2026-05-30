import { createClient } from "@supabase/supabase-js";
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const PDF = "202406asiav2.pdf";

console.log(`Probing ${PDF} — pages 75-82, math module 2:\n`);
const { data, error } = await sb
  .from("quiz_questions")
  .select(
    "id, source_page, topic_cluster, question_text, correct_answer, image_url, import_status, import_flag_reason, answer_choices(letter, choice_text)"
  )
  .eq("source_pdf", PDF)
  .is("archived_at", null)
  .gte("source_page", 75)
  .lte("source_page", 82)
  .order("source_page", { ascending: true });

if (error) {
  console.error(error);
  process.exit(1);
}

for (const r of data ?? []) {
  console.log(
    `p.${r.source_page} ${r.topic_cluster ?? ""} | answer=${r.correct_answer} | img=${r.image_url ? "yes" : "no"}`
  );
  console.log(`  Q: ${(r.question_text ?? "").slice(0, 120)}`);
  const choices = (r.answer_choices ?? []).sort((a, b) => a.letter.localeCompare(b.letter));
  for (const c of choices) {
    console.log(`  ${c.letter}: ${(c.choice_text ?? "<empty>").slice(0, 60)}`);
  }
  if (choices.length < 4 && r.correct_answer && /^[A-D]$/.test(r.correct_answer)) {
    const have = new Set(choices.map((c) => c.letter));
    const missing = ["A", "B", "C", "D"].filter((l) => !have.has(l));
    console.log(`  ⚠ MISSING CHOICES: ${missing.join(", ")}`);
  }
  if (r.import_flag_reason) console.log(`  flag: ${r.import_flag_reason}`);
  console.log("");
}

console.log(`Total rows on pages 75-82: ${data?.length ?? 0}`);
