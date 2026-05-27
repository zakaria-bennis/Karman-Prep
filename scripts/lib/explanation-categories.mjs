// ============================================================
// explanation-categories — Phase 7 canonical enums.
//
// Pure module. Defines:
//   · EXPLANATION_V2_STATUSES — what gets written to
//     quiz_questions.explanation_v2_status. App-enforced (no DB
//     CHECK), so additions don't require a migration.
//   · INTERNAL_CATEGORIES — the optional analytics-only label
//     attached to a wrong-answer choice's explanation. NOT shown
//     to students. NOT required. Generator may leave null.
//   · EXPLANATION_V2_VERSION — sentinel written into the JSONB
//     so a future migration can detect old shapes.
//
// Per user policy: trap_label is NOT required. Student-facing
// explanations should feel natural. The misconception_note field
// is free-text and nullable; this internal_category enum is
// purely for downstream analytics (e.g. "what % of wrong choices
// in our bank are too_broad?").
// ============================================================

export const EXPLANATION_V2_VERSION = "explanation_v2_v1";

// quiz_questions.explanation_v2_status enum (app-enforced).
export const EXPLANATION_V2_STATUSES = Object.freeze({
  // Phase 7 never touched this row yet (legacy).
  NOT_STARTED: "not_started",
  // Pre-fill eligibility gate said NO — admin diagnostic note recorded.
  SKIPPED_NOT_ELIGIBLE: "skipped_not_eligible",
  // Generator produced explanation_v2 but QA hasn't run yet
  // (transient state inside the orchestrator between Stage 11 and 12).
  GENERATED: "generated",
  // Schema + critic both passed.
  QA_PASSED: "qa_passed",
  // QA exhausted (schema fail OR critic-serious OR 2nd-attempt
  // critic-fail). Goes to needs_human_review at the publish-gate.
  QA_FAILED: "qa_failed",
  // Operator explicitly flagged this for review (used by manual
  // admin actions; the runner doesn't produce this directly).
  NEEDS_HUMAN_REVIEW: "needs_human_review",
  // Phase 6 changed the verified answer AFTER explanation_v2 was
  // generated. Existing explanation may be wrong for the new answer.
  // Set by Phase 6's runner when it detects post-Phase-7 changes.
  STALE_ANSWER_CHANGED: "stale_answer_changed",
});

// Convenience set for the publish-gate.
export const STATUSES_BLOCKING_PUBLISH = Object.freeze(
  new Set([
    EXPLANATION_V2_STATUSES.SKIPPED_NOT_ELIGIBLE,
    EXPLANATION_V2_STATUSES.QA_FAILED,
    EXPLANATION_V2_STATUSES.NEEDS_HUMAN_REVIEW,
    EXPLANATION_V2_STATUSES.STALE_ANSWER_CHANGED,
  ])
);

export const STATUSES_PUBLISH_READY = Object.freeze(new Set([EXPLANATION_V2_STATUSES.QA_PASSED]));

// ── INTERNAL_CATEGORIES — admin/analytics labels only ──────────
//
// These are OPTIONAL labels the generator may attach to wrong-answer
// choices for downstream analysis. They are NEVER shown to students.
// Per user policy:
//
//   Recommended explanation_v2 choice shape:
//     {
//       "explanation": "...",
//       "evidence": "...",
//       "misconception_note": null,      // free-text, nullable
//       "internal_category": null        // OPTIONAL from this enum
//     }
//
// When the generator chooses NOT to label a choice (because no
// genuine trap exists), it sets internal_category=null. Forcing a
// label on every choice produces robotic-feeling explanations.
export const INTERNAL_CATEGORIES = Object.freeze({
  UNSUPPORTED_INFERENCE: "unsupported_inference",
  TOO_BROAD: "too_broad",
  TOO_NARROW: "too_narrow",
  WRONG_RELATIONSHIP: "wrong_relationship",
  GRAMMAR_MISMATCH: "grammar_mismatch",
  TRANSITION_MISMATCH: "transition_mismatch",
  IRRELEVANT_DETAIL: "irrelevant_detail",
  CALCULATION_ERROR: "calculation_error",
  SIGN_ERROR: "sign_error",
  NO_CLEAR_TRAP: "no_clear_trap",
  OTHER: "other",
});

export const INTERNAL_CATEGORY_VALUES = Object.freeze(Object.values(INTERNAL_CATEGORIES));

export function isValidInternalCategory(value) {
  if (value == null) return true; // null is explicitly allowed
  return INTERNAL_CATEGORY_VALUES.includes(value);
}
