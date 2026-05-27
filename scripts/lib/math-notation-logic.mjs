// ============================================================
// math-notation-logic — Phase 5 risk-tier classifier + auto-repair gate.
//
// Pure function library. Given a detection (from
// math-notation-patterns) plus evidence (vision confirmation, solver
// vote tally, answer-key context, question_format), decides which of
// the 5 statuses applies and whether the live text may be mutated.
//
//   no_repair_needed              — nothing suspicious, ignore.
//   verified_auto_repair          — 8/8 gate passed; safe to apply.
//   suggested_repair_needs_review — medium-risk, even with vision/solver.
//   ambiguous_repair              — solvers disagree OR answer-key dispute.
//   unrepairable_from_source      — visual unclear or source unreadable.
//
// The user's cautious tiered policy (verbatim from PR thread):
//
//   "A repair should not be accepted just because it is high confidence
//    or because it verifies against the answer key. The answer key can
//    still be wrong, and a model could choose a repair just because
//    it makes the key work."
//
// So auto-repair requires ALL 8 conditions:
//   1. pattern is low_risk_ocr (single canonical interpretation)
//   2. visual_confirmed (Phase 3 source crop visually supports the repair)
//   3. visual_confirmation_confidence ≥ 0.95
//   4. solver_agreement_count ≥ 2 (independent solvers agree)
//   5. changes_verified_answer === false (repair must NOT change the
//      already-verified answer — that's a sign the model is hunting)
//   6. creates_answer_key_dispute === false
//   7. is_open_ended_ambiguous === false (numeric_entry escalates)
//   8. raw_text !== repaired_text (sanity: there's something to apply)
//
// Conditions 2–7 are pure data the caller computes; condition 1 is
// the detection's risk_tier; condition 8 is a string check we do here.
// ============================================================

import { RISK_TIERS } from "./math-notation-patterns.mjs";

// Mirror of the migration's CHECK constraint on math_repair_records.status.
export const REPAIR_STATUSES = Object.freeze({
  NO_REPAIR_NEEDED: "no_repair_needed",
  VERIFIED_AUTO_REPAIR: "verified_auto_repair",
  SUGGESTED_REPAIR_NEEDS_REVIEW: "suggested_repair_needs_review",
  AMBIGUOUS_REPAIR: "ambiguous_repair",
  UNREPAIRABLE_FROM_SOURCE: "unrepairable_from_source",
});

// Mirror of quiz_questions.math_notation_status. Identical to the
// record-level statuses; one question may have multiple records and
// the aggregate status is the WORST of them (most-restrictive wins).
export const QUESTION_STATUSES = REPAIR_STATUSES;

// Auto-repair gate thresholds — codified here so the test file and
// the runner script reference one source of truth.
export const VISION_CONFIDENCE_FLOOR = 0.95;
export const MIN_SOLVER_AGREEMENT = 2;

// ── Tier refinement ────────────────────────────────────────────
//
// The patterns module assigns a DEFAULT tier per pattern. The
// classifier may BUMP that tier based on question context. We never
// LOWER a tier — a low_risk detection on a numeric_entry stem
// becomes open_ended_uncertain; an unclear vision result becomes
// visual_unclear regardless of the pattern.

const TIER_RANK = Object.freeze({
  [RISK_TIERS.LOW_RISK_OCR]: 1,
  [RISK_TIERS.MEDIUM_RISK_GROUPING]: 2,
  [RISK_TIERS.HIGH_RISK_ANSWER_CHANGING]: 3,
  [RISK_TIERS.OPEN_ENDED_UNCERTAIN]: 4,
  [RISK_TIERS.VISUAL_UNCLEAR]: 5,
});

function maxTier(a, b) {
  return (TIER_RANK[a] ?? 0) >= (TIER_RANK[b] ?? 0) ? a : b;
}

/**
 * Refine a detection's tier given the question and any vision result.
 *
 * @param {object} args
 * @param {object} args.detection   from math-notation-patterns
 * @param {object} args.question    { answer_format, ... }
 * @param {{ confirmed: boolean, confidence: number, unclear: boolean }} [args.visionResult]
 * @returns {string} the refined tier
 */
export function refineRiskTier({ detection, question, visionResult }) {
  let tier = detection?.risk_tier ?? RISK_TIERS.MEDIUM_RISK_GROUPING;

  // numeric_entry questions never auto-repair — bump to open-ended.
  if (question?.answer_format === "numeric_entry") {
    tier = maxTier(tier, RISK_TIERS.OPEN_ENDED_UNCERTAIN);
  }

  // Vision flagged the source crop as unclear → escalate.
  if (visionResult && visionResult.unclear === true) {
    tier = maxTier(tier, RISK_TIERS.VISUAL_UNCLEAR);
  }

  return tier;
}

// ── 8-condition auto-repair gate ───────────────────────────────

/**
 * Evaluate the gate. Returns a structured object the caller writes
 * straight to math_repair_records.
 *
 * Inputs are explicit so the test file can stage every combination:
 *
 * @param {object} args
 * @param {string} args.refinedTier          one of RISK_TIERS
 * @param {string} args.rawText
 * @param {string} args.repairedText
 * @param {boolean} args.visualConfirmed
 * @param {number}  args.visualConfirmationConfidence
 * @param {number}  args.solverAgreementCount
 * @param {boolean} args.changesVerifiedAnswer
 * @param {boolean} args.createsAnswerKeyDispute
 * @param {boolean} args.isOpenEndedAmbiguous
 *
 * @returns {{
 *   status: string,
 *   reason: string,
 *   failed_conditions: string[]
 * }}
 */
export function evaluateAutoRepairGate({
  refinedTier,
  rawText,
  repairedText,
  visualConfirmed,
  visualConfirmationConfidence,
  solverAgreementCount,
  changesVerifiedAnswer,
  createsAnswerKeyDispute,
  isOpenEndedAmbiguous,
}) {
  // ── Hard-stop tiers — never auto-repair ──────────────────────
  if (refinedTier === RISK_TIERS.VISUAL_UNCLEAR) {
    return {
      status: REPAIR_STATUSES.UNREPAIRABLE_FROM_SOURCE,
      reason: "Source crop too unclear to verify a repair candidate.",
      failed_conditions: ["visual_clarity"],
    };
  }

  if (refinedTier === RISK_TIERS.OPEN_ENDED_UNCERTAIN) {
    return {
      status: REPAIR_STATUSES.AMBIGUOUS_REPAIR,
      reason: "Open-ended numeric_entry question with ambiguous notation — human review required.",
      failed_conditions: ["open_ended_format"],
    };
  }

  if (refinedTier === RISK_TIERS.HIGH_RISK_ANSWER_CHANGING) {
    return {
      status: REPAIR_STATUSES.AMBIGUOUS_REPAIR,
      reason: "Candidate repair would change the verified answer — blocked.",
      failed_conditions: ["changes_verified_answer"],
    };
  }

  if (refinedTier === RISK_TIERS.MEDIUM_RISK_GROUPING) {
    // Medium tier ALWAYS routes to human review per user policy:
    //   "Medium-risk grouping repair (1/2x, x+1/x-1, sqrt x+1,
    //    missing parens) — suggest but require human review."
    return {
      status: REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW,
      reason: "Grouping-ambiguous repair (parenthesization unclear) — human review required.",
      failed_conditions: ["risk_tier=medium"],
    };
  }

  // ── refinedTier === LOW_RISK_OCR ──────────────────────────────
  // Run the 8 conditions explicitly so the audit trail names each one.

  const failed = [];

  // 1. Pattern is low_risk_ocr — already checked above by tier gating.
  // (No-op condition; included for traceability.)

  // 2 + 3. Visual confirmation
  if (visualConfirmed !== true) failed.push("not_visual_confirmed");
  if (
    !Number.isFinite(visualConfirmationConfidence) ||
    visualConfirmationConfidence < VISION_CONFIDENCE_FLOOR
  ) {
    failed.push(`vision_confidence_below_${VISION_CONFIDENCE_FLOOR}`);
  }

  // 4. Two independent solvers agree on the post-repair answer.
  if (!Number.isFinite(solverAgreementCount) || solverAgreementCount < MIN_SOLVER_AGREEMENT) {
    failed.push(`solver_agreement_below_${MIN_SOLVER_AGREEMENT}`);
  }

  // 5. The repair must NOT change the already-verified answer.
  //
  //    Per user policy: "the answer key can still be wrong, and a
  //    model could choose a repair just because it makes the key
  //    work." So if changesVerifiedAnswer === true we route to
  //    review, NOT auto-apply.
  if (changesVerifiedAnswer === true) failed.push("changes_verified_answer");

  // 6. Repair must not create a fresh answer-key dispute.
  if (createsAnswerKeyDispute === true) failed.push("creates_answer_key_dispute");

  // 7. Open-ended ambiguity (belt-and-suspenders — refineRiskTier
  //    already escalates these; this is the explicit per-record check.)
  if (isOpenEndedAmbiguous === true) failed.push("open_ended_ambiguous");

  // 8. There has to actually BE a change to apply.
  if (typeof rawText !== "string" || typeof repairedText !== "string") {
    failed.push("text_inputs_not_strings");
  } else if (rawText === repairedText) {
    failed.push("repair_is_noop");
  }

  if (failed.length === 0) {
    return {
      status: REPAIR_STATUSES.VERIFIED_AUTO_REPAIR,
      reason: "All 8 conditions passed — safe to auto-apply.",
      failed_conditions: [],
    };
  }

  // Low-risk pattern that didn't clear the bar → suggest-needs-review.
  return {
    status: REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW,
    reason: `Low-risk repair held back — conditions failed: ${failed.join(", ")}.`,
    failed_conditions: failed,
  };
}

// ── Aggregate per-question status ──────────────────────────────

/**
 * Roll up a question's per-field records into a single
 * math_notation_status. Worst-status wins (most restrictive).
 *
 * Order from least-to-most restrictive:
 *   no_repair_needed
 *   verified_auto_repair
 *   suggested_repair_needs_review
 *   ambiguous_repair
 *   unrepairable_from_source
 */
const STATUS_RANK = Object.freeze({
  [REPAIR_STATUSES.NO_REPAIR_NEEDED]: 1,
  [REPAIR_STATUSES.VERIFIED_AUTO_REPAIR]: 2,
  [REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW]: 3,
  [REPAIR_STATUSES.AMBIGUOUS_REPAIR]: 4,
  [REPAIR_STATUSES.UNREPAIRABLE_FROM_SOURCE]: 5,
});

export function rollUpQuestionStatus(recordStatuses) {
  if (!Array.isArray(recordStatuses) || recordStatuses.length === 0) {
    return REPAIR_STATUSES.NO_REPAIR_NEEDED;
  }
  let worst = REPAIR_STATUSES.NO_REPAIR_NEEDED;
  for (const s of recordStatuses) {
    if ((STATUS_RANK[s] ?? 0) > (STATUS_RANK[worst] ?? 0)) worst = s;
  }
  return worst;
}

// ── Record payload builder ─────────────────────────────────────

/**
 * Shape a math_repair_records insert payload. Pure — caller hands
 * it to supabase.insert(). Used by the runner CLI.
 *
 * The 8-condition evidence fields are nullable because the runner
 * writes a record for EVERY detection, including cases where the
 * gate short-circuited before producing them (e.g. visual_unclear
 * tier never runs the solver vote). DB columns are NULLABLE in the
 * migration to match.
 *
 * @param {object} args
 * @param {string} args.questionId
 * @param {"question_text" | "choice_text"} args.field
 * @param {string | null} [args.fieldIndex]
 * @param {string} args.rawText
 * @param {string} args.repairedText
 * @param {string} args.riskTier            one of RISK_TIERS values
 * @param {string | null} [args.detectionPattern]
 * @param {boolean | null} [args.visualConfirmed]
 * @param {number | null} [args.visualConfirmationConfidence]
 * @param {number | null} [args.solverAgreementCount]
 * @param {boolean | null} [args.changesVerifiedAnswer]
 * @param {boolean | null} [args.createsAnswerKeyDispute]
 * @param {boolean | null} [args.isOpenEndedAmbiguous]
 * @param {string} args.status               one of REPAIR_STATUSES values
 * @param {string | null} [args.appliedAt]
 * @param {Record<string, unknown>} [args.rawMetadata]
 */
export function buildRepairRecord({
  questionId,
  field,
  fieldIndex = null,
  rawText,
  repairedText,
  riskTier,
  detectionPattern = null,
  visualConfirmed = null,
  visualConfirmationConfidence = null,
  solverAgreementCount = null,
  changesVerifiedAnswer = null,
  createsAnswerKeyDispute = null,
  isOpenEndedAmbiguous = null,
  status,
  appliedAt = null,
  rawMetadata = {},
}) {
  return {
    question_id: questionId,
    field,
    field_index: fieldIndex,
    raw_text: rawText,
    repaired_text: repairedText,
    risk_tier: riskTier,
    detection_pattern: detectionPattern ?? null,
    visual_confirmed: typeof visualConfirmed === "boolean" ? visualConfirmed : null,
    visual_confirmation_confidence: Number.isFinite(visualConfirmationConfidence)
      ? visualConfirmationConfidence
      : null,
    solver_agreement_count: Number.isFinite(solverAgreementCount) ? solverAgreementCount : null,
    changes_verified_answer:
      typeof changesVerifiedAnswer === "boolean" ? changesVerifiedAnswer : null,
    creates_answer_key_dispute:
      typeof createsAnswerKeyDispute === "boolean" ? createsAnswerKeyDispute : null,
    is_open_ended_ambiguous:
      typeof isOpenEndedAmbiguous === "boolean" ? isOpenEndedAmbiguous : null,
    status,
    applied_at: appliedAt,
    raw_metadata: rawMetadata,
  };
}
