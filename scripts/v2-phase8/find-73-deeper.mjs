import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function count(name, qb) {
  const { count, error } = await qb;
  if (error) return console.log(`  ${name.padEnd(70)} ERROR`);
  const marker = count === 73 ? " ★★★" : "";
  console.log(`  ${name.padEnd(70)} ${count}${marker}`);
}

console.log("Deeper hunt for 73…");
console.log("");

console.log("Phase 6 verifier status × source_pdf=202406asiav2.pdf:");
for (const s of [
  "verified_panel",
  "verified_pro",
  "verified_opus",
  "verified_sympy",
  "panel_split",
  "model_consensus_disagrees_with_key",
  "escalation_disagrees",
  "sympy_inconclusive",
  "unanswerable",
  "verifier_error",
]) {
  await count(
    `answer_verification_status=${s}`,
    sb
      .from("quiz_questions")
      .select("*", { count: "exact", head: true })
      .eq("source_pdf", "202406asiav2.pdf")
      .eq("answer_verification_status", s)
  );
}

console.log("");
console.log("Phase 7 explanation_v2_status × 202406asiav2:");
for (const s of [
  "qa_passed",
  "qa_failed",
  "skipped_not_eligible",
  "generated",
  "needs_human_review",
]) {
  await count(
    `explanation_v2_status=${s}`,
    sb
      .from("quiz_questions")
      .select("*", { count: "exact", head: true })
      .eq("source_pdf", "202406asiav2.pdf")
      .eq("explanation_v2_status", s)
  );
}

console.log("");
console.log("All publish_status (active rows):");
const { data: ps } = await sb
  .from("quiz_questions")
  .select("publish_status")
  .is("archived_at", null);
const tally = {};
for (const r of ps ?? []) tally[r.publish_status] = (tally[r.publish_status] ?? 0) + 1;
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  const marker = v === 73 ? " ★★★" : "";
  console.log(`  ${k.padEnd(40)} ${v}${marker}`);
}

console.log("");
console.log("Rows with at least one BLOCKING finding, scoped:");
const { data: blockingByQ } = await sb
  .from("question_findings")
  .select("question_id")
  .eq("severity", "BLOCKING")
  .is("resolved_at", null);
const uniqueQ = new Set(blockingByQ?.map((r) => r.question_id));
console.log(
  `  unique questions with >=1 BLOCKING finding:                          ${uniqueQ.size}${uniqueQ.size === 73 ? " ★★★" : ""}`
);

const { data: smokeQs } = await sb
  .from("quiz_questions")
  .select("id")
  .eq("source_pdf", "202406asiav2.pdf");
const smokeIds = new Set(smokeQs?.map((r) => r.id));
const blockingInSmoke = [...uniqueQ].filter((id) => smokeIds.has(id));
console.log(
  `  smoke-pdf rows with >=1 BLOCKING finding:                            ${blockingInSmoke.length}${blockingInSmoke.length === 73 ? " ★★★" : ""}`
);

console.log("");
console.log("Possible math: 85 needs_human_review - 12 = 73?");
console.log(
  `  85 - 12 = 73 (suggests admin UI shows 73 of 85 needs_human_review after some filter)`
);
