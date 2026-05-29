// Diagnostic: figure out what's at count 73 in the current DB
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function count(name, qb) {
  const { count, error } = await qb;
  if (error) return console.log(`  ${name.padEnd(60)} ERROR: ${error.message}`);
  if (count === 73) console.log(`  ★ ${name.padEnd(60)} ${count}`);
  else console.log(`  ${name.padEnd(60)} ${count}`);
}

console.log("Looking for a count of 73 across likely places…");
console.log("");

console.log("quiz_questions (overall):");
await count(
  "active (archived_at IS NULL)",
  sb.from("quiz_questions").select("*", { count: "exact", head: true }).is("archived_at", null)
);
await count(
  "active + is_flagged=true",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("is_flagged", true)
);
await count(
  "active + import_status=needs_review",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("import_status", "needs_review")
);
await count(
  "active + is_live=true",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("is_live", true)
);
await count(
  "active + is_live=false",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("is_live", false)
);
await count(
  "from 202406asiav2.pdf (any status)",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("source_pdf", "202406asiav2.pdf")
);
await count(
  "202406asiav2.pdf + needs_human_review",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("source_pdf", "202406asiav2.pdf")
    .eq("publish_status", "needs_human_review")
);
await count(
  "202406asiav2.pdf + verified_panel",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("source_pdf", "202406asiav2.pdf")
    .eq("answer_verification_status", "verified_panel")
);
await count(
  "202406asiav2.pdf + qa_passed",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("source_pdf", "202406asiav2.pdf")
    .eq("explanation_v2_status", "qa_passed")
);

console.log("");
console.log("question_findings by category (active):");
for (const cat of [
  "well_formedness",
  "slug_alignment",
  "figure_coherence",
  "explanation_consistency",
  "schema",
  "quality",
  "ocr_pattern",
  "formatting",
]) {
  await count(
    `category=${cat}`,
    sb
      .from("question_findings")
      .select("*", { count: "exact", head: true })
      .eq("category", cat)
      .is("resolved_at", null)
  );
}

console.log("");
console.log("question_findings by severity (active):");
for (const sev of ["BLOCKING", "WARNING", "NOTICE"]) {
  await count(
    `severity=${sev}`,
    sb
      .from("question_findings")
      .select("*", { count: "exact", head: true })
      .eq("severity", sev)
      .is("resolved_at", null)
  );
}
