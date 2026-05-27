#!/usr/bin/env node

// ============================================================
// repair-math-notation — v2 Phase 5.
//
// Scans publish-pending questions for OCR-mangled math notation,
// runs the 8-condition auto-repair gate, writes math_repair_records
// rows, and (only when the gate passes ALL 8 conditions) mutates
// the live question_text / choice_text fields. The original is
// always preserved as raw_question_text / raw_choice_text.
//
// CAUTIOUS BY DESIGN. Per the user's policy:
//   "The goal is not to auto-fix every suspicious math expression.
//    The goal is to auto-fix only obvious OCR notation errors and
//    preserve a full audit trail for everything else."
//
// SCOPE
//   Only inspects question_text and answer_choices.choice_text.
//   passage / explanation_text deferred to Phase 5.5.
//
// FLOW (per question, per detection, per candidate)
//   1. detect via math-notation-patterns
//   2. refineRiskTier with question.answer_format + vision unclear
//   3. Gemini Vision confirmation against the Phase 3 question crop
//   4. Solver-vote: callGemini + callDeepSeek on raw + repaired
//   5. SymPy equivalence: raw vs repaired (CI-only)
//   6. evaluateAutoRepairGate → status + reason
//   7. INSERT into math_repair_records
//   8. If verified_auto_repair → UPDATE the live field, set applied_at
//   9. Roll up per-question status → math_notation_status,
//      math_notation_checked_at = NOW
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { callGemini, callDeepSeek } from "../lib/llm-providers.mjs";
import {
  PHASE5_VERSION,
  RISK_TIERS,
  detectAllPatterns,
  applyRepair,
} from "../lib/math-notation-patterns.mjs";
import {
  REPAIR_STATUSES,
  QUESTION_STATUSES,
  evaluateAutoRepairGate,
  refineRiskTier,
  rollUpQuestionStatus,
  buildRepairRecord,
  VISION_CONFIDENCE_FLOOR,
  MIN_SOLVER_AGREEMENT,
} from "../lib/math-notation-logic.mjs";
import { areExpressionsEquivalent } from "../lib/math-equivalence.mjs";

// ── CLI parsing (matches Phase 4 conventions) ──────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const NO_LLM = args.includes("--no-llm");
const SOURCE_PDF_IDX = args.indexOf("--source-pdf");
const SOURCE_PDF =
  SOURCE_PDF_IDX >= 0 && args[SOURCE_PDF_IDX + 1] ? args[SOURCE_PDF_IDX + 1] : null;
const LIMIT_IDX = args.indexOf("--limit");
const LIMIT = LIMIT_IDX >= 0 && args[LIMIT_IDX + 1] ? Number(args[LIMIT_IDX + 1]) : null;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function usage() {
  console.log(`Usage:
  node --env-file=.env.local scripts/pdf-pipeline/repair-math-notation.mjs [options]

Options:
  --source-pdf <filename>  Limit to one imported PDF (basename match).
  --limit <n>             Cap inspected questions, useful for smoke tests.
  --dry-run               Print decisions; no DB writes.
  --force                 Re-inspect rows already marked math_notation_checked_at.
  --no-llm                Skip vision + solver round-trips. Every detection routes
                          to suggested_repair_needs_review. Useful for cheap first-pass.
  --help                  Show this message.
`);
}

if (args.includes("--help")) {
  usage();
  process.exit(0);
}

// ── Selection ──────────────────────────────────────────────────

const QUESTION_SELECT = [
  "id",
  "question_text",
  "raw_question_text",
  "answer_format",
  "source_pdf",
  "source_page",
  "publish_status",
  "selected_official_answer",
  "verified_answer",
  "math_notation_checked_at",
].join(", ");

const CHOICE_SELECT = "id, question_id, letter, choice_text, raw_choice_text, is_correct";

async function selectCandidateQuestions() {
  let query = supabase.from("quiz_questions").select(QUESTION_SELECT);
  if (SOURCE_PDF) query = query.eq("source_pdf", SOURCE_PDF);
  if (!FORCE) query = query.is("math_notation_checked_at", null);
  if (LIMIT) query = query.limit(LIMIT);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function selectChoicesForQuestions(questionIds) {
  if (questionIds.length === 0) return new Map();
  const byQuestion = new Map();
  // Supabase .in is fine up to ~1000 ids; chunk just in case.
  const CHUNK = 200;
  for (let i = 0; i < questionIds.length; i += CHUNK) {
    const slice = questionIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("answer_choices")
      .select(CHOICE_SELECT)
      .in("question_id", slice);
    if (error) throw error;
    for (const c of data ?? []) {
      const list = byQuestion.get(c.question_id) ?? [];
      list.push(c);
      byQuestion.set(c.question_id, list);
    }
  }
  return byQuestion;
}

// Phase 3 question crop URL: the source_assets row of asset_type
// 'question_crop' joined on question_id. Used as the vision target.
async function selectQuestionCropUrl(questionId) {
  const { data, error } = await supabase
    .from("source_assets")
    .select("public_url, asset_type, created_at")
    .eq("question_id", questionId)
    .in("asset_type", ["question_crop", "expanded_question_crop"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.public_url ?? null;
}

// ── External validators (vision + solvers + sympy) ─────────────

const VISION_RESPONSE_SCHEMA = {
  type: "object",
  required: ["matches_repaired", "matches_raw", "unclear", "confidence", "rationale"],
  properties: {
    matches_repaired: { type: "boolean" },
    matches_raw: { type: "boolean" },
    unclear: { type: "boolean" },
    confidence: { type: "number" },
    rationale: { type: "string" },
  },
};

async function fetchImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const mime = res.headers.get("content-type") ?? "image/png";
  return { buf: Buffer.from(await res.arrayBuffer()), mime };
}

/**
 * Ask Gemini Vision: "Does the raw OCR text faithfully match the
 * source image, or does the repair candidate match better?"
 *
 * Returns null on any failure — caller treats null as
 * "vision_confirmed: false, confidence: 0".
 */
async function visionConfirm({ cropUrl, rawText, repairedText }) {
  if (NO_LLM || !cropUrl) return null;
  let image;
  try {
    image = await fetchImageBuffer(cropUrl);
  } catch (err) {
    console.warn(`  vision: image fetch failed (${err.message})`);
    return null;
  }
  const prompt = `You are verifying whether OCR captured the math notation in this question correctly.

Two text candidates for the same printed expression:

A (raw OCR output): ${JSON.stringify(rawText)}
B (proposed repair): ${JSON.stringify(repairedText)}

Look at the image. Answer:
- matches_repaired: true iff candidate B reproduces the printed expression exactly.
- matches_raw: true iff candidate A reproduces it exactly.
- unclear: true ONLY if the image is too blurry/cropped/tiny to tell.
- confidence: 0-1 for how sure you are about matches_repaired (NOT matches_raw).
- rationale: one sentence.

If both look equivalent on the page, prefer the one with explicit math notation (exponents, parens).`;

  try {
    const resp = await callGemini({
      prompt,
      image,
      model: "gemini-2.5-flash",
      responseSchema: VISION_RESPONSE_SCHEMA,
      maxOutputTokens: 512,
      thinkingBudget: 0,
    });
    return resp;
  } catch (err) {
    console.warn(`  vision: call failed (${err.message})`);
    return null;
  }
}

const SOLVER_RESPONSE_SCHEMA = {
  type: "object",
  required: ["answer", "is_answerable"],
  properties: {
    answer: { type: "string" },
    is_answerable: { type: "boolean" },
  },
};

function buildSolverPrompt(text, choices) {
  if (choices && choices.length > 0) {
    const list = choices.map((c) => `(${c.letter}) ${c.choice_text}`).join("\n");
    return `Solve this SAT question and pick the single best multiple-choice answer (A/B/C/D).
Return JSON: { "answer": "<letter>", "is_answerable": <bool> }.

Question:
${text}

Choices:
${list}`;
  }
  return `Solve this SAT question. Return JSON: { "answer": "<numeric or short string>", "is_answerable": <bool> }.

Question:
${text}`;
}

/**
 * Run 2 independent solvers against a text variant. Returns the
 * agreement count (0, 1, or 2) and which answer each produced.
 *
 * NO_LLM → always returns { count: 0, gemini: null, deepseek: null }
 *          so the gate sees "below threshold" and routes to review.
 */
async function solverVote({ text, choices }) {
  if (NO_LLM) return { count: 0, gemini: null, deepseek: null };
  const prompt = buildSolverPrompt(text, choices);
  let gemini = null;
  let deepseek = null;
  try {
    const resp = await callGemini({
      prompt,
      model: "gemini-2.5-flash",
      responseSchema: SOLVER_RESPONSE_SCHEMA,
      maxOutputTokens: 512,
      thinkingBudget: 0,
    });
    if (resp?.is_answerable === true) gemini = String(resp.answer ?? "").trim();
  } catch (err) {
    console.warn(`  solver gemini: ${err.message}`);
  }
  try {
    const resp = await callDeepSeek({ prompt });
    if (resp?.is_answerable === true) deepseek = String(resp.answer ?? "").trim();
  } catch (err) {
    console.warn(`  solver deepseek: ${err.message}`);
  }
  const count = gemini && deepseek && gemini === deepseek ? 2 : 0;
  return { count, gemini, deepseek };
}

// ── Per-field processing ───────────────────────────────────────

async function processField({
  question,
  field, // "question_text" or "choice_text"
  fieldIndex, // null for question_text, letter for choices
  rawText,
  currentText, // active value (may already equal rawText)
  choicesForQuestion, // for solver prompts on choice repairs
  cropUrl,
  records, // accumulator (mutated)
}) {
  const detections = detectAllPatterns(rawText);
  if (detections.length === 0) {
    records.push(
      buildRepairRecord({
        questionId: question.id,
        field,
        fieldIndex,
        rawText,
        repairedText: rawText,
        riskTier: RISK_TIERS.LOW_RISK_OCR,
        detectionPattern: null,
        visualConfirmed: null,
        visualConfirmationConfidence: null,
        solverAgreementCount: null,
        changesVerifiedAnswer: null,
        createsAnswerKeyDispute: null,
        isOpenEndedAmbiguous: null,
        status: REPAIR_STATUSES.NO_REPAIR_NEEDED,
        rawMetadata: { version: PHASE5_VERSION, detections: 0 },
      })
    );
    return { newText: currentText, applied: false };
  }

  // Apply repairs left-to-right against a working copy; track whether
  // any were auto-applied. Each detection produces ONE record.
  let working = rawText;
  let appliedAny = false;

  for (const detection of detections) {
    // First candidate is the "most likely" interpretation; iterate
    // only that one for low-risk (single canonical), and the first
    // for medium-risk (which the gate routes to review anyway).
    const candidate = detection.candidates[0];
    const repairedText = applyRepair(rawText, detection, candidate);

    // Refine tier with question context. Vision result feeds back
    // into tier refinement; collect it first.
    const vision = await visionConfirm({ cropUrl, rawText, repairedText });
    const visionResult = vision
      ? {
          confirmed: vision.matches_repaired === true,
          confidence: vision.confidence,
          unclear: vision.unclear === true,
        }
      : null;

    const refinedTier = refineRiskTier({ detection, question, visionResult });

    // Run solver-vote on raw and repaired separately to detect
    // whether the repair changes the verified answer.
    const verifiedAnswer = question.selected_official_answer ?? question.verified_answer;
    let changesVerifiedAnswer = null;
    let solverCount = 0;

    if (refinedTier === RISK_TIERS.LOW_RISK_OCR && !NO_LLM) {
      const rawVote = await solverVote({ text: rawText, choices: choicesForQuestion });
      const repVote = await solverVote({ text: repairedText, choices: choicesForQuestion });
      solverCount = repVote.count;
      if (verifiedAnswer && repVote.gemini && repVote.deepseek) {
        changesVerifiedAnswer =
          repVote.gemini === repVote.deepseek &&
          repVote.gemini !== String(verifiedAnswer).trim() &&
          rawVote.gemini !== repVote.gemini;
      }
    }

    // SymPy equivalence — if raw == repaired symbolically, the
    // repair is a no-op (don't bother writing it as a change).
    let equivalenceReason = null;
    try {
      const eq = await areExpressionsEquivalent({
        expressionA: detection.match,
        expressionB: candidate,
      });
      equivalenceReason = eq.reason;
      if (eq.equivalent === true) {
        // Symbolically equivalent → no functional change, skip apply.
        records.push(
          buildRepairRecord({
            questionId: question.id,
            field,
            fieldIndex,
            rawText,
            repairedText,
            riskTier: refinedTier,
            detectionPattern: detection.pattern,
            visualConfirmed: visionResult?.confirmed ?? null,
            visualConfirmationConfidence: visionResult?.confidence ?? null,
            solverAgreementCount: solverCount,
            changesVerifiedAnswer,
            createsAnswerKeyDispute: false,
            isOpenEndedAmbiguous: question.answer_format === "numeric_entry",
            status: REPAIR_STATUSES.NO_REPAIR_NEEDED,
            rawMetadata: {
              version: PHASE5_VERSION,
              match: detection.match,
              candidate,
              sympy: eq,
              note: "Candidate is symbolically equivalent to raw — no-op.",
            },
          })
        );
        continue;
      }
    } catch (err) {
      equivalenceReason = `sympy_exception: ${err.message}`;
    }

    const gateResult = evaluateAutoRepairGate({
      refinedTier,
      rawText,
      repairedText,
      visualConfirmed: visionResult?.confirmed ?? false,
      visualConfirmationConfidence: visionResult?.confidence ?? 0,
      solverAgreementCount: solverCount,
      changesVerifiedAnswer: changesVerifiedAnswer === true,
      createsAnswerKeyDispute: false,
      isOpenEndedAmbiguous: question.answer_format === "numeric_entry",
    });

    const willApply = gateResult.status === REPAIR_STATUSES.VERIFIED_AUTO_REPAIR;
    if (willApply) {
      working = applyRepair(working, detection, candidate);
      appliedAny = true;
    }

    records.push(
      buildRepairRecord({
        questionId: question.id,
        field,
        fieldIndex,
        rawText,
        repairedText,
        riskTier: refinedTier,
        detectionPattern: detection.pattern,
        visualConfirmed: visionResult?.confirmed ?? null,
        visualConfirmationConfidence: visionResult?.confidence ?? null,
        solverAgreementCount: solverCount,
        changesVerifiedAnswer,
        createsAnswerKeyDispute: false,
        isOpenEndedAmbiguous: question.answer_format === "numeric_entry",
        status: gateResult.status,
        appliedAt: willApply ? new Date().toISOString() : null,
        rawMetadata: {
          version: PHASE5_VERSION,
          match: detection.match,
          candidate,
          candidates_considered: detection.candidates,
          vision: vision ?? null,
          equivalence_reason: equivalenceReason,
          gate_reason: gateResult.reason,
          gate_failed_conditions: gateResult.failed_conditions,
          thresholds: {
            vision_confidence_floor: VISION_CONFIDENCE_FLOOR,
            min_solver_agreement: MIN_SOLVER_AGREEMENT,
          },
        },
      })
    );
  }

  return { newText: appliedAny ? working : currentText, applied: appliedAny };
}

// ── DB write helpers ───────────────────────────────────────────

async function writeRecords(records) {
  if (records.length === 0) return;
  if (DRY_RUN) {
    console.log(`  [dry-run] would insert ${records.length} math_repair_records`);
    return;
  }
  // Chunk inserts to stay well under the 1MB row-batch ceiling.
  const CHUNK = 100;
  for (let i = 0; i < records.length; i += CHUNK) {
    const slice = records.slice(i, i + CHUNK);
    const { error } = await supabase.from("math_repair_records").insert(slice);
    if (error) throw error;
  }
}

async function updateQuestionFinal({ questionId, newQuestionText, status }) {
  const update = {
    math_notation_checked_at: new Date().toISOString(),
    math_notation_status: status,
  };
  if (typeof newQuestionText === "string") {
    update.question_text = newQuestionText;
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] would update quiz_questions[${questionId}] →`, update);
    return;
  }
  const { error } = await supabase.from("quiz_questions").update(update).eq("id", questionId);
  if (error) throw error;
}

async function updateChoiceFinal({ choiceId, newChoiceText }) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would update answer_choices[${choiceId}] choice_text`);
    return;
  }
  const { error } = await supabase
    .from("answer_choices")
    .update({ choice_text: newChoiceText })
    .eq("id", choiceId);
  if (error) throw error;
}

// ── Per-question driver ────────────────────────────────────────

async function processQuestion(question, choices) {
  console.log(`\nq ${question.id} — ${question.source_pdf}#${question.source_page}`);
  const cropUrl = await selectQuestionCropUrl(question.id);
  if (!cropUrl) {
    console.log("  no question_crop available — vision step will be skipped");
  }
  const records = [];
  const choiceList = choices ?? [];

  // 1) question_text
  const qResult = await processField({
    question,
    field: "question_text",
    fieldIndex: null,
    rawText: question.raw_question_text,
    currentText: question.question_text,
    choicesForQuestion: choiceList,
    cropUrl,
    records,
  });

  // 2) every choice_text
  const choiceUpdates = [];
  for (const choice of choiceList) {
    const cResult = await processField({
      question,
      field: "choice_text",
      fieldIndex: choice.letter,
      rawText: choice.raw_choice_text,
      currentText: choice.choice_text,
      choicesForQuestion: choiceList,
      cropUrl,
      records,
    });
    if (cResult.applied && cResult.newText !== choice.choice_text) {
      choiceUpdates.push({ choiceId: choice.id, newChoiceText: cResult.newText });
    }
  }

  // Roll up
  const status = rollUpQuestionStatus(records.map((r) => r.status));
  console.log(
    `  rolled-up status=${status}, records=${records.length}, q-applied=${qResult.applied}, choices-applied=${choiceUpdates.length}`
  );

  // Write records FIRST so the audit trail is intact even if a later
  // mutation fails. Then apply mutations.
  await writeRecords(records);
  for (const u of choiceUpdates) await updateChoiceFinal(u);
  await updateQuestionFinal({
    questionId: question.id,
    newQuestionText: qResult.applied ? qResult.newText : undefined,
    status,
  });
}

// ── Entry point ────────────────────────────────────────────────

async function main() {
  console.log(`Phase 5 — math notation repair (${PHASE5_VERSION})`);
  console.log(
    `  source_pdf=${SOURCE_PDF ?? "<all>"} limit=${LIMIT ?? "<none>"} dry-run=${DRY_RUN} force=${FORCE} no-llm=${NO_LLM}`
  );

  const questions = await selectCandidateQuestions();
  console.log(`  ${questions.length} candidate question(s)`);
  if (questions.length === 0) return;

  const choicesByQuestion = await selectChoicesForQuestions(questions.map((q) => q.id));

  // Quick sanity check: the migration's NOT NULL backfill should
  // mean every row has raw_question_text. Fail loud if not — that
  // indicates the migration didn't apply.
  for (const q of questions) {
    if (typeof q.raw_question_text !== "string" || q.raw_question_text.length === 0) {
      throw new Error(
        `quiz_questions[${q.id}] missing raw_question_text — Phase 5 migration not applied?`
      );
    }
  }

  const tally = {
    [QUESTION_STATUSES.NO_REPAIR_NEEDED]: 0,
    [QUESTION_STATUSES.VERIFIED_AUTO_REPAIR]: 0,
    [QUESTION_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW]: 0,
    [QUESTION_STATUSES.AMBIGUOUS_REPAIR]: 0,
    [QUESTION_STATUSES.UNREPAIRABLE_FROM_SOURCE]: 0,
  };

  for (const q of questions) {
    try {
      const before = tally;
      await processQuestion(q, choicesByQuestion.get(q.id) ?? []);
      // Re-fetch the question's final math_notation_status from
      // the records we wrote — simpler to keep accurate than
      // threading it back from processQuestion.
      const { data } = await supabase
        .from("quiz_questions")
        .select("math_notation_status")
        .eq("id", q.id)
        .single();
      const finalStatus = data?.math_notation_status ?? QUESTION_STATUSES.NO_REPAIR_NEEDED;
      before[finalStatus] = (before[finalStatus] ?? 0) + 1;
    } catch (err) {
      console.error(`  ✗ question ${q.id} failed: ${err.message}`);
    }
  }

  console.log("\nSummary");
  for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(36)} ${v}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
