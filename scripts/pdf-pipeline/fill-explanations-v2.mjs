#!/usr/bin/env node

// ============================================================
// fill-explanations-v2 — v2 Phase 7 Stage 11.
//
// Generates the explanation_v2 JSONB bundle for every eligible
// question (i.e. rows where Phase 7's eligibility gate (Stage 10)
// did NOT mark skipped_not_eligible). Uses tiered Claude (Sonnet
// default, Opus on escalation per explanation-tiering.mjs).
//
// MIRRORS to legacy fields after generation so the existing admin
// preview UI keeps rendering:
//   explanation_text          ← explanation_v2.correct_reasoning
//   explanation_per_choice    ← explanation_v2.choices (shape:
//                                {A: text, B: text, C: text, D: text})
//   desmos_strategy           ← explanation_v2.desmos_tip (math only)
//
// Sets explanation_v2_status='generated' (transient, between Stage
// 11 and Stage 12 QA). The QA stage flips it to qa_passed / qa_failed.
//
// REPLACES scripts/content-generation/fill-all.mjs in the
// orchestrator (Phase 7). fill-all.mjs was removed in v2 phase 8.4
// once Phase 7's eligibility-gated + QA'd flow proved out
// end-to-end on real PDFs (smoke #1 on 202406asiav2.pdf).
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { callClaude, QuotaExhaustedError } from "../lib/llm-providers.mjs";
import { EXPLANATION_V2_VERSION, EXPLANATION_V2_STATUSES } from "../lib/explanation-categories.mjs";
import { buildGeneratorPrompt } from "../lib/explanation-prompts.mjs";
import { pickGeneratorTier, COST_PER_CALL, TIERING_MODELS } from "../lib/explanation-tiering.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
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
  node --env-file=.env.local scripts/pdf-pipeline/fill-explanations-v2.mjs [options]

Options:
  --source-pdf <filename>  Scope to one PDF.
  --question-id <uuid>     Single question.
  --limit <n>              Cap inspected rows.
  --dry-run                No DB writes.
  --no-llm                 Skip LLM; mark every eligible row qa_failed (used for cheap smoke tests).
  --force                  Re-fill rows already at status='generated' or 'qa_passed'.
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
  "answer_verifier_version",
  "explanation_v2_status",
  "explanation_v2_filled_at",
  "answer_choices(letter, choice_text)",
].join(", ");

async function selectEligible() {
  let q = supabase.from("quiz_questions").select(QUESTION_SELECT);
  if (QUESTION_ID) q = q.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) q = q.eq("source_pdf", SOURCE_PDF);
  // Eligible = explanation_v2_status is null OR === 'generated' on
  // --force. We deliberately do NOT touch rows the gate marked
  // 'skipped_not_eligible' — they stay skipped.
  if (!FORCE && !QUESTION_ID) {
    q = q.or("explanation_v2_status.is.null,explanation_v2_status.eq.not_started");
  } else if (FORCE && !QUESTION_ID) {
    q = q.in("explanation_v2_status", ["generated", "qa_passed", "qa_failed", null]);
  }
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Call Claude with the generator prompt ────────────────────

async function callGenerator(question, tier) {
  const { prompt, toolSchema } = buildGeneratorPrompt({
    question: { ...question, _generator_role: tier.role, _generator_model: tier.model },
    choices: question.answer_choices ?? [],
    isRetry: false,
  });
  if (NO_LLM) {
    return { ok: false, error: "no_llm_mode" };
  }
  try {
    const resp = await callClaude({
      prompt,
      model: tier.model,
      toolSchema,
      maxTokens: 2400,
    });
    return { ok: true, explanation: resp };
  } catch (err) {
    if (err instanceof QuotaExhaustedError) {
      return { ok: false, error: `quota_exhausted: ${err.message}` };
    }
    return { ok: false, error: err?.message ?? String(err) };
  }
}

// ── Mirror to legacy fields ──────────────────────────────────

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

// ── DB write ─────────────────────────────────────────────────

async function writeFilled({ questionId, explanation, legacy }) {
  const update = {
    explanation_v2: explanation,
    explanation_v2_filled_at: explanation.generated_at,
    explanation_v2_status: EXPLANATION_V2_STATUSES.GENERATED,
    ...legacy,
  };
  if (DRY_RUN) {
    console.log(
      `  [dry-run] would fill ${questionId.slice(0, 8)} (model=${explanation.generator_model})`
    );
    return { ok: true };
  }
  const { error } = await supabase.from("quiz_questions").update(update).eq("id", questionId);
  if (error) {
    console.warn(`  ✗ write filled ${questionId.slice(0, 8)}: ${error.message}`);
    return { ok: false };
  }
  return { ok: true };
}

async function writeError({ questionId, reason }) {
  const v2 = {
    version: EXPLANATION_V2_VERSION,
    generated_at: new Date().toISOString(),
    generator_role: "phase7_fill_failed",
    generator_model: "none",
    status: EXPLANATION_V2_STATUSES.QA_FAILED,
    fill_error: reason,
  };
  if (DRY_RUN) {
    console.log(`  [dry-run] would mark ${questionId.slice(0, 8)} qa_failed (${reason})`);
    return;
  }
  await supabase
    .from("quiz_questions")
    .update({
      explanation_v2: v2,
      explanation_v2_filled_at: v2.generated_at,
      explanation_v2_status: EXPLANATION_V2_STATUSES.QA_FAILED,
    })
    .eq("id", questionId);
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("Phase 7 — fill explanations v2");
  console.log(
    `  source_pdf=${SOURCE_PDF ?? "<all>"} limit=${LIMIT ?? "<none>"} dry-run=${DRY_RUN} no-llm=${NO_LLM} force=${FORCE}`
  );
  const eligible = await selectEligible();
  console.log(`  ${eligible.length} eligible question(s)`);
  if (eligible.length === 0) return;

  let filled = 0;
  let errored = 0;
  let totalCost = 0;
  const tierTally = { [TIERING_MODELS.SONNET]: 0, [TIERING_MODELS.OPUS]: 0 };

  for (const q of eligible) {
    const tier = pickGeneratorTier({ question: q, isRetry: false });
    tierTally[tier.model] = (tierTally[tier.model] ?? 0) + 1;
    totalCost += COST_PER_CALL[tier.model] ?? 0;

    console.log(
      `  → ${q.id.slice(0, 8)} ${q.subject ?? "?"}/${q.answer_format ?? "?"} via ${tier.model.split("-").slice(-1)[0]} (${tier.reason})`
    );

    const result = await callGenerator(q, tier);
    if (!result.ok) {
      errored++;
      await writeError({ questionId: q.id, reason: result.error });
      continue;
    }
    const explanation = result.explanation;
    // Stamp the actual model + role the call used (the prompt
    // contained these as placeholders).
    explanation.generator_role = tier.role;
    explanation.generator_model = tier.model;
    const legacy = mirrorToLegacyFields(explanation, q);
    const write = await writeFilled({ questionId: q.id, explanation, legacy });
    if (write.ok) filled++;
    else errored++;
  }

  console.log("");
  console.log("─".repeat(56));
  console.log(`Filled: ${filled} | Errored: ${errored}`);
  console.log(
    `Tier mix: Sonnet=${tierTally[TIERING_MODELS.SONNET]} Opus=${tierTally[TIERING_MODELS.OPUS]}`
  );
  console.log(
    `Estimated cost: $${totalCost.toFixed(2)} (generation only, critic billed separately)`
  );
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
