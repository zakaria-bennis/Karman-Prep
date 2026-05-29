import { createClient } from "@supabase/supabase-js";
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const PDF = "202406asiav2.pdf";

// Get ALL math questions (subject=math) from this PDF, ordered by page
const { data, error } = await sb
  .from("quiz_questions")
  .select(
    "source_page, subject, topic_cluster, correct_answer, question_text, answer_choices(letter)"
  )
  .eq("source_pdf", PDF)
  .is("archived_at", null)
  .eq("subject", "math")
  .order("source_page", { ascending: true });

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Total math questions in DB: ${data?.length ?? 0}`);
console.log(`Expected for an SAT: ~44 (22 Module 1 + 22 Module 2)\n`);

console.log("All math pages + choice counts + answers:");
for (const r of data ?? []) {
  const numChoices = (r.answer_choices ?? []).length;
  const choices = (r.answer_choices ?? [])
    .map((c) => c.letter)
    .sort()
    .join("");
  const flag = numChoices < 4 && /^[A-D]$/.test(r.correct_answer ?? "") ? " ⚠" : "";
  console.log(
    `  p.${String(r.source_page).padStart(3)} | choices=${choices.padEnd(5)} (n=${numChoices}) | ans=${r.correct_answer ?? "?"} | ${(r.question_text ?? "").slice(0, 60)}${flag}`
  );
}

// Look for gaps in source_page ranges
console.log("\nSource_page distribution:");
const pages = (data ?? []).map((r) => r.source_page).filter((p) => p != null);
const minPg = Math.min(...pages);
const maxPg = Math.max(...pages);
console.log(`  range: p.${minPg} - p.${maxPg}`);
const seen = new Set(pages);
const gaps = [];
for (let p = minPg; p <= maxPg; p++) {
  if (!seen.has(p)) gaps.push(p);
}
console.log(`  missing pages in range: ${gaps.length ? gaps.join(", ") : "none"}`);
