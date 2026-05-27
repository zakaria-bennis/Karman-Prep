#!/usr/bin/env node

// ============================================================
// qa-explanations — v2 Phase 7 Stage 12.
//
// Hybrid QA for explanation_v2 bundles produced at Stage 11.
//
// FLOW per question:
//   1. Schema-validate the explanation_v2 JSONB.
//      · schema FAIL → record attempt, status='qa_failed',
//                       publish_status='needs_human_review' (via gate).
//   2. Schema PASS → run LLM critic (Sonnet by default; Opus on
//      escalation per explanation-tiering).
//   3. Critic verdict 'pass'        → status='qa_passed'. Done.
//   4. Critic verdict 'fail_serious' → status='qa_failed' (no retry).
//   5. Critic verdict 'fail_fixable' on attempt 1 →
//        a. Re-run generator with the repair prompt (max 1 retry).
//        b. Schema-validate attempt 2.
//        c. Critic attempt 2.
//        d. If still failing → status='qa_failed'.
//   6. Critic verdict 'fail_fixable' on attempt 2 → status='qa_failed'.
//
// Writes one explanation_qa_records row per attempt. Mirrors any
// regenerated explanation_v2 + legacy fields back to the question.
//
// Cost rule (per user policy): max 2 generation calls per question.
// Average expected per PDF (~30 q): ~5 questions hit retry → ~$0.06.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { callClaude, QuotaExhaustedError } from "../lib/llm-providers.mjs";
import { EXPLANATION_V2_VERSION, EXPLANATION_V2_STATUSES } from "../lib/explanation-categories.mjs";
import { validateExplanationV2 } from "../lib/explanation-schema.mjs";
import { buildCriticPrompt, buildRepairPrompt } from "../lib/explanation-prompts.mjs";
import {
  pickGeneratorTier,
  pickCriticTier,
  COST_PER_CALL,
  TIERING_MODELS,
} from "../lib/explanation-tiering.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const NO_LLM = args.includes("--no-llm");
const SOURCE_PDF_IDX = args.indexOf("--source-pdf");
const SOURCE_PDF =
  SOURCE_PDF_IDX >= 0 && args[SOURCE_PDF_IDX + 1] ? args[SOURCE_PDF_IDX + 1] : null;
const QUESTION_ID_IDX = args.indexOf("--question-id");
const QUESTION_ID =
  QUESTION_ID_IDX >= 0 && args[QUESTION_ID_IDX + 1] ? args[QUESTION_ID_IDX + 1] : null;
const LIMIT_IDX = args.indexOf("--limit");
const LIMIT = LIMIT_IDX >= 0 && args[LIMIT_IDX + 1] ? Number(args[LIMIT_IDX + 1]) : null;

if (args.includes("--help")) {
  console.log(`Usage:
  node --env-file=.env.local scripts/pdf-pipeline/qa-explanations.mjs [options]

Options:
  --source-pdf <filename>  Scope to one PDF.
  --question-id <uuid>     Single question.
  --limit <n>              Cap inspected rows.
  --dry-run                No DB writes.
  --no-llm                 Skip LLM; only run the schema check.
  --help                   Show this message.
`);
  process.exit(0);
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const QUESTION_SELECT = [
  "id",
  "question_text",
  "passage",
  "passage_a",
  "passage_b",
  "passage_intro",
  "subject",
  "answer_format",
  "concept_slug",
  "correct_answer",
  "selected_official_answer",
  "answer_verification_status",
  "dispute_category",
  "explanation_v2",
  "explanation_v2_status",
  "answer_choices(letter, choice_text)",
].join(", ");

async function selectFilledRows() {
  let q = supabase.from("quiz_questions").select(QUESTION_SELECT);
  if (QUESTION_ID) q = q.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) q = q.eq("source_pdf", SOURCE_PDF);
  // Only QA rows the fill stage just produced.
  if (!QUESTION_ID) {
    q = q.eq("explanation_v2_status", EXPLANATION_V2_STATUSES.GENERATED);
  }
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Critic + repair calls ────────────────────────────────────

async function runCritic({ question, explanation, criticTier }) {
  if (NO_LLM) {
    return { ok: false, error: "no_llm_mode" };
  }
  const { prompt, toolSchema } = buildCriticPrompt({
    question,
    choices: question.answer_choices ?? [],
    explanation,
  });
  try {
    const resp = await callClaude({
      prompt,
      model: criticTier.model,
      toolSchema,
      maxTokens: 1200,
    });
    return { ok: true, findings: resp };
  } catch (err) {
    if (err instanceof QuotaExhaustedError) {
      return { ok: false, error: `quota_exhausted: ${err.message}` };
    }
    return { ok: false, error: err?.message ?? String(err) };
  }
}

async function runRepair({ question, originalExplanation, criticFindings, generatorTier }) {
  if (NO_LLM) return { ok: false, error: "no_llm_mode" };
  const { prompt, toolSchema } = buildRepairPrompt({
    question: {
      ...question,
      _generator_role: generatorTier.role,
      _generator_model: generatorTier.model,
    },
    choices: question.answer_choices ?? [],
    originalExplanation,
    criticFindings,
  });
  try {
    const resp = await callClaude({
      prompt,
      model: generatorTier.model,
      toolSchema,
      maxTokens: 2400,
    });
    resp.generator_role = generatorTier.role;
    resp.generator_model = generatorTier.model;
    return { ok: true, explanation: resp };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

// ── DB writes ────────────────────────────────────────────────

async function writeAttemptRecord({
  questionId,
  attemptNumber,
  generatorRole,
  generatorModel,
  generatorCostEstimate,
  schemaResult,
  schemaMissing,
  schemaInvalid,
  criticRole,
  criticModel,
  criticResult,
  criticFindings,
  criticCostEstimate,
  outcome,
  snapshot,
}) {
  if (DRY_RUN) {
    console.log(
      `  [dry-run] would insert explanation_qa_records attempt=${attemptNumber} outcome=${outcome}`
    );
    return;
  }
  const { error } = await supabase.from("explanation_qa_records").insert({
    question_id: questionId,
    attempt_number: attemptNumber,
    generator_role: generatorRole,
    generator_model: generatorModel,
    generator_cost_estimate: generatorCostEstimate,
    schema_result: schemaResult,
    schema_missing_fields: schemaMissing.length > 0 ? schemaMissing : null,
    schema_invalid_fields: schemaInvalid.length > 0 ? schemaInvalid : null,
    critic_role: criticRole,
    critic_model: criticModel,
    critic_result: criticResult,
    critic_findings: criticFindings,
    critic_cost_estimate: criticCostEstimate,
    outcome,
    explanation_snapshot: snapshot,
  });
  if (error) console.warn(`  ✗ qa_records insert: ${error.message}`);
}

async function writeFinalStatus({ questionId, status, explanation }) {
  const update = { explanation_v2_status: status };
  if (explanation) {
    update.explanation_v2 = explanation;
    update.explanation_v2_filled_at = new Date().toISOString();
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] would set ${questionId.slice(0, 8)} → ${status}`);
    return;
  }
  const { error } = await supabase.from("quiz_questions").update(update).eq("id", questionId);
  if (error) console.warn(`  ✗ status write ${questionId.slice(0, 8)}: ${error.message}`);
}

function mirrorToLegacyFields(explanation, question) {
  const legacy = {
    explanation_text: explanation.correct_reasoning ?? "",
  };
  if (question.answer_format === "multiple_choice" && explanation.choices) {
    const epc = {};
    for (const letter of ["A", "B", "C", "D"]) {
      const c = explanation.choices[letter];
      if (c && typeof c.explanation === "string") epc[letter] = c.explanation;
    }
    legacy.explanation_per_choice = epc;
  }
  if (question.subject === "math" && explanation.desmos_tip) {
    legacy.desmos_strategy = explanation.desmos_tip;
  }
  return legacy;
}

// ── Per-question QA driver ──────────────────────────────────

async function qaOneQuestion(q) {
  const ctx = { subject: q.subject, answer_format: q.answer_format };
  const explanation = q.explanation_v2 ?? {};

  // ── Attempt 1: schema → critic ──
  const schema1 = validateExplanationV2(explanation, ctx);
  const generatorTier1 = pickGeneratorTier({ question: q, isRetry: false });
  const generatorCost1 = COST_PER_CALL[generatorTier1.model] ?? 0;

  if (!schema1.ok) {
    console.log(
      `  ✗ ${q.id.slice(0, 8)} schema fail: ${[...schema1.missing, ...schema1.invalid].join("; ")}`
    );
    await writeAttemptRecord({
      questionId: q.id,
      attemptNumber: 1,
      generatorRole: explanation.generator_role ?? generatorTier1.role,
      generatorModel: explanation.generator_model ?? generatorTier1.model,
      generatorCostEstimate: generatorCost1,
      schemaResult: "fail",
      schemaMissing: schema1.missing,
      schemaInvalid: schema1.invalid,
      criticRole: null,
      criticModel: null,
      criticResult: null,
      criticFindings: null,
      criticCostEstimate: null,
      outcome: "qa_failed",
      snapshot: explanation,
    });
    await writeFinalStatus({ questionId: q.id, status: EXPLANATION_V2_STATUSES.QA_FAILED });
    return { outcome: "qa_failed", attempts: 1 };
  }

  const criticTier1 = pickCriticTier({
    question: q,
    generatorModel: explanation.generator_model ?? generatorTier1.model,
  });
  const criticResp1 = await runCritic({ question: q, explanation, criticTier: criticTier1 });
  const criticCost1 = COST_PER_CALL[criticTier1.model] ?? 0;

  if (!criticResp1.ok) {
    console.log(`  ⚠ ${q.id.slice(0, 8)} critic error: ${criticResp1.error}`);
    await writeAttemptRecord({
      questionId: q.id,
      attemptNumber: 1,
      generatorRole: explanation.generator_role ?? generatorTier1.role,
      generatorModel: explanation.generator_model ?? generatorTier1.model,
      generatorCostEstimate: generatorCost1,
      schemaResult: "pass",
      schemaMissing: [],
      schemaInvalid: [],
      criticRole: criticTier1.role,
      criticModel: criticTier1.model,
      criticResult: null,
      criticFindings: { error: criticResp1.error },
      criticCostEstimate: criticCost1,
      outcome: "needs_human_review",
      snapshot: explanation,
    });
    await writeFinalStatus({
      questionId: q.id,
      status: EXPLANATION_V2_STATUSES.NEEDS_HUMAN_REVIEW,
    });
    return { outcome: "needs_human_review", attempts: 1 };
  }

  const findings1 = criticResp1.findings;
  const verdict1 = findings1.verdict;

  if (verdict1 === "pass") {
    console.log(`  ✓ ${q.id.slice(0, 8)} qa_passed (attempt 1)`);
    await writeAttemptRecord({
      questionId: q.id,
      attemptNumber: 1,
      generatorRole: explanation.generator_role ?? generatorTier1.role,
      generatorModel: explanation.generator_model ?? generatorTier1.model,
      generatorCostEstimate: generatorCost1,
      schemaResult: "pass",
      schemaMissing: [],
      schemaInvalid: [],
      criticRole: criticTier1.role,
      criticModel: criticTier1.model,
      criticResult: "pass",
      criticFindings: findings1,
      criticCostEstimate: criticCost1,
      outcome: "qa_passed",
      snapshot: explanation,
    });
    await writeFinalStatus({ questionId: q.id, status: EXPLANATION_V2_STATUSES.QA_PASSED });
    return { outcome: "qa_passed", attempts: 1 };
  }

  if (verdict1 === "fail_serious") {
    console.log(`  ✗ ${q.id.slice(0, 8)} critic fail_serious: ${findings1.summary}`);
    await writeAttemptRecord({
      questionId: q.id,
      attemptNumber: 1,
      generatorRole: explanation.generator_role ?? generatorTier1.role,
      generatorModel: explanation.generator_model ?? generatorTier1.model,
      generatorCostEstimate: generatorCost1,
      schemaResult: "pass",
      schemaMissing: [],
      schemaInvalid: [],
      criticRole: criticTier1.role,
      criticModel: criticTier1.model,
      criticResult: "fail_serious",
      criticFindings: findings1,
      criticCostEstimate: criticCost1,
      outcome: "qa_failed",
      snapshot: explanation,
    });
    await writeFinalStatus({ questionId: q.id, status: EXPLANATION_V2_STATUSES.QA_FAILED });
    return { outcome: "qa_failed_serious", attempts: 1 };
  }

  // verdict1 === "fail_fixable" → repair attempt
  console.log(`  ↻ ${q.id.slice(0, 8)} critic fail_fixable, retrying (Opus): ${findings1.summary}`);
  await writeAttemptRecord({
    questionId: q.id,
    attemptNumber: 1,
    generatorRole: explanation.generator_role ?? generatorTier1.role,
    generatorModel: explanation.generator_model ?? generatorTier1.model,
    generatorCostEstimate: generatorCost1,
    schemaResult: "pass",
    schemaMissing: [],
    schemaInvalid: [],
    criticRole: criticTier1.role,
    criticModel: criticTier1.model,
    criticResult: "fail_fixable",
    criticFindings: findings1,
    criticCostEstimate: criticCost1,
    outcome: "will_retry",
    snapshot: explanation,
  });

  // ── Attempt 2: repair (always Opus per tiering) ──
  const generatorTier2 = pickGeneratorTier({ question: q, isRetry: true });
  const generatorCost2 = COST_PER_CALL[generatorTier2.model] ?? 0;
  const repairResp = await runRepair({
    question: q,
    originalExplanation: explanation,
    criticFindings: findings1,
    generatorTier: generatorTier2,
  });
  if (!repairResp.ok) {
    console.log(`  ✗ ${q.id.slice(0, 8)} repair call failed: ${repairResp.error}`);
    await writeAttemptRecord({
      questionId: q.id,
      attemptNumber: 2,
      generatorRole: generatorTier2.role,
      generatorModel: generatorTier2.model,
      generatorCostEstimate: generatorCost2,
      schemaResult: "fail",
      schemaMissing: ["<repair_call_failed>"],
      schemaInvalid: [],
      criticRole: null,
      criticModel: null,
      criticResult: null,
      criticFindings: null,
      criticCostEstimate: null,
      outcome: "qa_failed",
      snapshot: null,
    });
    await writeFinalStatus({ questionId: q.id, status: EXPLANATION_V2_STATUSES.QA_FAILED });
    return { outcome: "qa_failed", attempts: 2 };
  }

  const repaired = repairResp.explanation;
  const schema2 = validateExplanationV2(repaired, ctx);
  if (!schema2.ok) {
    await writeAttemptRecord({
      questionId: q.id,
      attemptNumber: 2,
      generatorRole: generatorTier2.role,
      generatorModel: generatorTier2.model,
      generatorCostEstimate: generatorCost2,
      schemaResult: "fail",
      schemaMissing: schema2.missing,
      schemaInvalid: schema2.invalid,
      criticRole: null,
      criticModel: null,
      criticResult: null,
      criticFindings: null,
      criticCostEstimate: null,
      outcome: "qa_failed",
      snapshot: repaired,
    });
    await writeFinalStatus({ questionId: q.id, status: EXPLANATION_V2_STATUSES.QA_FAILED });
    return { outcome: "qa_failed", attempts: 2 };
  }

  const criticTier2 = pickCriticTier({
    question: q,
    generatorModel: generatorTier2.model,
  });
  const criticResp2 = await runCritic({
    question: q,
    explanation: repaired,
    criticTier: criticTier2,
  });
  const criticCost2 = COST_PER_CALL[criticTier2.model] ?? 0;

  if (!criticResp2.ok || criticResp2.findings.verdict !== "pass") {
    const outcome = "qa_failed";
    console.log(
      `  ✗ ${q.id.slice(0, 8)} attempt-2 critic: ${criticResp2.findings?.summary ?? criticResp2.error}`
    );
    await writeAttemptRecord({
      questionId: q.id,
      attemptNumber: 2,
      generatorRole: generatorTier2.role,
      generatorModel: generatorTier2.model,
      generatorCostEstimate: generatorCost2,
      schemaResult: "pass",
      schemaMissing: [],
      schemaInvalid: [],
      criticRole: criticTier2.role,
      criticModel: criticTier2.model,
      criticResult: criticResp2.ok ? criticResp2.findings.verdict : null,
      criticFindings: criticResp2.ok ? criticResp2.findings : { error: criticResp2.error },
      criticCostEstimate: criticCost2,
      outcome,
      snapshot: repaired,
    });
    await writeFinalStatus({
      questionId: q.id,
      status: EXPLANATION_V2_STATUSES.QA_FAILED,
      explanation: repaired,
    });
    return { outcome: "qa_failed", attempts: 2 };
  }

  // Attempt 2 passed.
  const legacy = mirrorToLegacyFields(repaired, q);
  if (!DRY_RUN) {
    await supabase
      .from("quiz_questions")
      .update({
        explanation_v2: repaired,
        explanation_v2_status: EXPLANATION_V2_STATUSES.QA_PASSED,
        explanation_v2_filled_at: new Date().toISOString(),
        ...legacy,
      })
      .eq("id", q.id);
  }
  await writeAttemptRecord({
    questionId: q.id,
    attemptNumber: 2,
    generatorRole: generatorTier2.role,
    generatorModel: generatorTier2.model,
    generatorCostEstimate: generatorCost2,
    schemaResult: "pass",
    schemaMissing: [],
    schemaInvalid: [],
    criticRole: criticTier2.role,
    criticModel: criticTier2.model,
    criticResult: "pass",
    criticFindings: criticResp2.findings,
    criticCostEstimate: criticCost2,
    outcome: "qa_passed",
    snapshot: repaired,
  });
  console.log(`  ✓ ${q.id.slice(0, 8)} qa_passed (attempt 2)`);
  return { outcome: "qa_passed", attempts: 2 };
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("Phase 7 — QA explanations");
  console.log(
    `  source_pdf=${SOURCE_PDF ?? "<all>"} limit=${LIMIT ?? "<none>"} dry-run=${DRY_RUN} no-llm=${NO_LLM}`
  );
  const filled = await selectFilledRows();
  console.log(`  ${filled.length} row(s) at status=generated`);
  if (filled.length === 0) return;

  const tally = {};
  let totalCost = 0;
  for (const q of filled) {
    try {
      const r = await qaOneQuestion(q);
      tally[r.outcome] = (tally[r.outcome] ?? 0) + 1;
      // Rough cost: 1 critic call + possible 1 repair + 1 critic.
      totalCost += r.attempts === 2 ? COST_PER_CALL[TIERING_MODELS.OPUS] + 0.04 : 0.02;
    } catch (err) {
      console.error(`  ✗ ${q.id.slice(0, 8)} fatal: ${err?.message ?? err}`);
      tally.error = (tally.error ?? 0) + 1;
    }
  }

  console.log("");
  console.log("─".repeat(56));
  console.log("QA tally");
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }
  console.log(`Estimated extra cost: $${totalCost.toFixed(2)}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
