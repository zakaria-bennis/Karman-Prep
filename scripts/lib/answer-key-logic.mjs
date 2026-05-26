// ============================================================
// answer-key-logic — PURE correction-detection rules.
//
// Extracted from scripts/pdf-pipeline/extract-answer-key.mjs so
// the decision matrix can be Vitest-unit-tested (see
// src/lib/pipeline-v2/answer-key-logic.test.ts) without standing
// up Gemini.
//
// All confidence thresholds match spec §7.
// ============================================================

export const CORRECTION_CONFIDENCE_THRESHOLDS = {
  // Manual correction
  correction_high: 0.9, // >= → accept automatically
  correction_medium: 0.7, // 0.70-0.89 → use but mark for review
  // (else < 0.70 → don't auto-select)

  // Cross-out
  crossout_high: 0.85, // >= → treat as crossed out
  crossout_medium: 0.6, // 0.60-0.84 → mark uncertain
  // (else < 0.60 → don't treat as crossed out)
};

/**
 * Given a raw entry from Gemini extraction (possibly escalated to
 * Pro), apply the §6 correction rules and produce:
 *   {
 *     selected_official_answer,
 *     selected_confidence,
 *     status,                  // → answer_key_entries.status
 *     quiz_status,             // → quiz_questions.answer_key_status
 *     review_required,
 *     review_reason,
 *   }
 *
 * Status taxonomy (per spec §1, §6):
 *   printed_key_used_no_correction
 *   corrected_key_verified
 *   manual_correction_selected_pending_verification
 *   correction_unclear
 *   correction_disputed
 *   printed_key_crossed_out_no_readable_replacement
 *   missing_answer_key
 */
export function selectOfficialAnswerFromEntry(entry) {
  const t = CORRECTION_CONFIDENCE_THRESHOLDS;
  const printed = entry.printed_answer ?? null;
  const printedConf = entry.printed_answer_confidence ?? 0;

  // No printed answer at all → missing
  if (!printed && printedConf < 0.5) {
    return {
      selected_official_answer: null,
      selected_confidence: 0,
      status: "missing_answer_key",
      quiz_status: "missing_answer_key",
      review_required: true,
      review_reason: "printed answer not readable and no correction present",
    };
  }

  const crossedOut = !!entry.printed_answer_crossed_out;
  const crossedOutConf = entry.printed_answer_crossed_out_confidence ?? 0;
  const crossedOutHighConfidence = crossedOut && crossedOutConf >= t.crossout_high;
  const crossedOutUncertain =
    crossedOut && crossedOutConf >= t.crossout_medium && crossedOutConf < t.crossout_high;

  const correctionPresent = !!entry.manual_correction_present;
  const correctionAnswer = entry.manual_correction_answer ?? null;
  const correctionConf = entry.manual_correction_confidence ?? 0;
  const correctionReadable =
    correctionPresent && correctionAnswer && correctionConf >= t.correction_medium;
  const correctionHighConfidence = correctionReadable && correctionConf >= t.correction_high;

  // §6.1 printed only — no correction
  if (!correctionPresent && !crossedOut) {
    return {
      selected_official_answer: printed,
      selected_confidence: printedConf,
      status: "printed_key_used_no_correction",
      quiz_status: "printed_key_used_no_correction",
      review_required: false,
      review_reason: null,
    };
  }

  // §6.4 printed crossed out + correction unreadable
  if (crossedOutHighConfidence && !correctionReadable) {
    return {
      selected_official_answer: null,
      selected_confidence: 0,
      status: "printed_key_crossed_out_no_readable_replacement",
      quiz_status: "unverifiable",
      review_required: true,
      review_reason: "printed answer crossed out but replacement unreadable",
    };
  }

  // §6.2 printed crossed out + correction readable → use correction
  if (crossedOutHighConfidence && correctionReadable) {
    return {
      selected_official_answer: correctionAnswer,
      selected_confidence: correctionConf,
      status: "corrected_key_verified",
      quiz_status: "corrected_key_verified",
      review_required: !correctionHighConfidence,
      review_reason: correctionHighConfidence
        ? null
        : "correction confidence below 0.90 — please verify",
    };
  }

  // §6.3 correction present but printed NOT crossed out
  if (correctionPresent && !crossedOut) {
    if (correctionHighConfidence) {
      return {
        selected_official_answer: correctionAnswer,
        selected_confidence: correctionConf,
        status: "corrected_key_verified",
        quiz_status: "corrected_key_verified",
        review_required: true,
        review_reason: "manual correction present but printed answer not visibly crossed out",
      };
    }
    if (correctionReadable) {
      return {
        selected_official_answer: correctionAnswer,
        selected_confidence: correctionConf,
        status: "manual_correction_selected_pending_verification",
        quiz_status: "correction_unclear",
        review_required: true,
        review_reason: "correction medium confidence + printed not crossed out",
      };
    }
    return {
      selected_official_answer: printed,
      selected_confidence: printedConf,
      status: "correction_unclear",
      quiz_status: "correction_unclear",
      review_required: true,
      review_reason: "manual correction present but unreadable; defaulting to printed",
    };
  }

  // Cross-out uncertain regardless of correction state
  if (crossedOutUncertain) {
    return {
      selected_official_answer: printed,
      selected_confidence: printedConf * 0.75, // discount confidence
      status: "correction_unclear",
      quiz_status: "correction_unclear",
      review_required: true,
      review_reason: "ambiguous cross-out detection",
    };
  }

  // Fallback — should not be reached, but log as unclear if we get here.
  return {
    selected_official_answer: printed,
    selected_confidence: printedConf,
    status: "correction_unclear",
    quiz_status: "correction_unclear",
    review_required: true,
    review_reason: "uncategorized correction state",
  };
}

/**
 * Cross-check: given a selected_official_answer and a grader-consensus
 * verdict, compute the final answer_verification_status.
 *
 * Used by the multi-vote grader's per-row tally to decide whether the
 * grader's conclusion matches what answer-key extraction picked.
 *
 *   solverVote = single-letter answer the grader settled on
 *   selectedOfficial = answer_key_entries.selected_official_answer
 *   verdict = multi-vote-grader's final verdict
 *
 * Returns: 'verified' | 'verified_pro' | 'verified_opus' | 'disputed' |
 *          'unverifiable' | 'equivalent'
 */
export function answerVerificationStatus({ solverVote, selectedOfficial, verdict }) {
  if (!solverVote && !selectedOfficial) return "unverifiable";
  if (!selectedOfficial) return "unverifiable"; // can't verify against nothing
  if (!solverVote) return "unverifiable";

  // String-equal first (case-insensitive for letters)
  const match =
    String(solverVote).trim().toLowerCase() === String(selectedOfficial).trim().toLowerCase();
  if (match) {
    if (verdict === "verified_opus") return "verified_opus";
    if (verdict === "verified_pro") return "verified_pro";
    return "verified";
  }
  return "disputed";
}
