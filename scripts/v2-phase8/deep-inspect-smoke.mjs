// Deeper look at what's actually in the smoke-test rows.
// We need to know: did Stage 10 actually populate explanation_v2
// with real content, or just timestamps?
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: rows } = await sb
  .from("quiz_questions")
  .select(
    "id, source_page, subject, explanation_v2, explanation_v2_status, " +
      "answer_verification_status, answer_verified_at, " +
      "explanation_v2_filled_at, math_notation_status, publish_status"
  )
  .eq("source_pdf", "202406asiav2.pdf")
  .order("source_page", { ascending: true });

// Stage 10 sanity: how many rows have a meaningful explanation_v2?
let hasJsonObj = 0;
let hasCorrectReasoning = 0;
let hasChoices = 0;
let isSkipped = 0;
let isQaPassed = 0;
let isQaFailed = 0;
let isGenerated = 0;
let v2StatusOther = {};
const skipReasons = {};

for (const r of rows) {
  const v2 = r.explanation_v2;
  if (v2 && typeof v2 === "object" && !Array.isArray(v2)) hasJsonObj++;
  if (v2?.correct_reasoning) hasCorrectReasoning++;
  if (v2?.choices && Object.keys(v2.choices).length > 0) hasChoices++;
  if (r.explanation_v2_status === "skipped_not_eligible") {
    isSkipped++;
    const reason = v2?.skip_reason ?? "unknown";
    skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
  } else if (r.explanation_v2_status === "qa_passed") isQaPassed++;
  else if (r.explanation_v2_status === "qa_failed") isQaFailed++;
  else if (r.explanation_v2_status === "generated") isGenerated++;
  else
    v2StatusOther[r.explanation_v2_status ?? "<null>"] =
      (v2StatusOther[r.explanation_v2_status ?? "<null>"] ?? 0) + 1;
}

console.log("explanation_v2 deep check:");
console.log(`  Rows total:                       ${rows.length}`);
console.log(`  Rows w/ explanation_v2 object:    ${hasJsonObj}`);
console.log(`  Rows w/ correct_reasoning text:   ${hasCorrectReasoning}`);
console.log(`  Rows w/ per-choice explanations:  ${hasChoices}`);
console.log("");
console.log("explanation_v2_status breakdown:");
console.log(`  skipped_not_eligible:  ${isSkipped}`);
console.log(`  qa_passed:             ${isQaPassed}`);
console.log(`  qa_failed:             ${isQaFailed}`);
console.log(`  generated (no qa yet): ${isGenerated}`);
for (const [k, v] of Object.entries(v2StatusOther)) {
  console.log(`  ${k.padEnd(22)} ${v}`);
}
if (Object.keys(skipReasons).length > 0) {
  console.log("");
  console.log("Why rows were skipped at eligibility:");
  for (const [k, v] of Object.entries(skipReasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${(k ?? "<null>").slice(0, 60).padEnd(60)} ${v}`);
  }
}
console.log("");

// Phase 6 sanity: how many have answer_verification_status set?
const avStatus = {};
let avNullCount = 0;
for (const r of rows) {
  if (r.answer_verification_status == null) avNullCount++;
  else avStatus[r.answer_verification_status] = (avStatus[r.answer_verification_status] ?? 0) + 1;
}
console.log("answer_verification_status (Phase 6):");
console.log(`  NULL:                            ${avNullCount}`);
for (const [k, v] of Object.entries(avStatus)) console.log(`  ${k.padEnd(32)} ${v}`);
console.log("");

// Sample an explanation_v2 object so we can see what's IN there
const withV2 = rows.find((r) => r.explanation_v2 && typeof r.explanation_v2 === "object");
if (withV2) {
  console.log("Sample explanation_v2 (first row that has one):");
  console.log(`  id: ${withV2.id.slice(0, 8)} (page ${withV2.source_page})`);
  console.log(`  status: ${withV2.explanation_v2_status}`);
  const keys = Object.keys(withV2.explanation_v2);
  console.log(`  keys: ${keys.join(", ")}`);
  for (const k of keys.slice(0, 6)) {
    const v = withV2.explanation_v2[k];
    const str =
      typeof v === "string"
        ? v.slice(0, 80) + (v.length > 80 ? "…" : "")
        : typeof v === "object"
          ? JSON.stringify(v).slice(0, 80) + "…"
          : String(v);
    console.log(`    ${k.padEnd(22)} ${str}`);
  }
}
