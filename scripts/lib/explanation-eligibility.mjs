// ============================================================
// explanation-eligibility — Phase 7 pre-fill gate.
//
// Pure function. Given a question row (with Phase 2/3/4/5/6
// signals hydrated by the caller), decides whether Phase 7 should
// generate a polished student-facing explanation.
//
// Per user policy: DO NOT generate explanations for rows that are
// broken, disputed, visually incomplete, or unverified. Blocked
// rows MAY receive an admin-facing diagnostic note explaining why
// fill was skipped, but the student-facing fields stay empty.
//
// The 14 blocking conditions (in priority order — first match wins):
//
//   STRUCTURAL (extraction is broken)
//     1.  corrupt_question      publish_status='corrupt_question'
//     2.  rejected              row was moved to rejected_questions
//                                (caller filters these out; here we
//                                 just check the publish_status flag)
//     3.  missing_mc_choices    MC question with <4 choices
//     4.  empty_question_text   no stem text
//     5.  duplicate_detected    publish_status='duplicate_detected'
//
//   ANSWER-KEY (Phase 2)
//     6.  missing_answer_key    no selected_official_answer AND
//                                no correct_answer
//     7.  correction_unclear    answer_key_status='correction_unclear'
//     8.  correction_disputed   answer_key_status='correction_disputed'
//
//   SOURCE (Phase 3/4)
//     9.  missing_required_visual  question references a visual but
//                                  no required visual asset exists
//
//   MATH NOTATION (Phase 5)
//    10.  unresolved_math_notation  math_notation_status is one of
//                                   suggested_repair_needs_review,
//                                   ambiguous_repair,
//                                   unrepairable_from_source
//
//   VERIFICATION (Phase 6)
//    11.  blocked_answer_dispute    publish_status='blocked_answer_dispute'
//    12.  model_consensus_disagrees  answer_verification_status=
//                                   'model_consensus_disagrees_with_key'
//    13.  verifier_error            answer_verification_status=
//                                   'verifier_error' or 'unanswerable'
//
//   KATEX (Phase 1)
//    14.  blocked_katex_error   publish_status='blocked_katex_error'
//    15.  blocked_slug_uncertain publish_status='blocked_slug_uncertain'
//
// Returns:
//   { eligible: boolean, reason: string|null,
//     diagnostic_note: string|null }
//
// `diagnostic_note` is the admin-facing message Phase 7 writes
// into explanation_v2.admin_diagnostic_note for blocked rows.
// NEVER shown to students.
// ============================================================

// Helper: question references a visual element (graph/table/figure)
// in its stem. Used to decide whether MISSING required visual is
// actually a problem for THIS question.
function questionMentionsVisual(question) {
  const t = String(question?.question_text ?? "").toLowerCase();
  if (!t) return false;
  return /\b(graph|table|chart|figure|diagram|plot|scatter\s*plot|histogram|box\s*plot|coordinate\s+plane|number\s+line|fig\.?\s*\d+)\b/.test(
    t
  );
}

function blocked(reason, diagnostic_note) {
  return { eligible: false, reason, diagnostic_note };
}

const ELIGIBLE = Object.freeze({
  eligible: true,
  reason: null,
  diagnostic_note: null,
});

/**
 * Decide whether Phase 7 should fill this question.
 *
 * @param {object} q  — quiz_questions row hydrated with:
 *   · publish_status, import_status, question_text, answer_format
 *   · answer_choices: [{letter, choice_text}, ...]
 *   · selected_official_answer, correct_answer
 *   · answer_key_status (Phase 2)
 *   · has_question_crop, source_assets_processed_at (Phase 3)
 *   · required_visual_asset_count, image_url (Phase 4)
 *   · math_notation_status (Phase 5)
 *   · answer_verified_at, answer_verification_status (Phase 6)
 */
export function checkFillEligibility(q) {
  // ── STRUCTURAL ──
  if (q?.publish_status === "corrupt_question") {
    return blocked(
      "corrupt_question",
      "Skipped explanation generation because the question was flagged corrupt during import."
    );
  }
  if (q?.publish_status === "duplicate_detected") {
    return blocked(
      "duplicate_detected",
      "Skipped explanation generation because this row was flagged as a duplicate."
    );
  }
  if (!q?.question_text || !String(q.question_text).trim()) {
    return blocked(
      "empty_question_text",
      "Skipped explanation generation because the question text is empty."
    );
  }
  if (q?.answer_format === "multiple_choice") {
    const letters = new Set((q?.answer_choices ?? []).map((c) => c.letter));
    if (!(letters.has("A") && letters.has("B") && letters.has("C") && letters.has("D"))) {
      return blocked(
        "missing_mc_choices",
        "Skipped explanation generation because the multiple-choice question is missing one or more of choices A/B/C/D."
      );
    }
  }

  // ── ANSWER KEY (Phase 2) ──
  const selected = q?.selected_official_answer;
  const raw = q?.correct_answer;
  if (!selected && !raw) {
    return blocked(
      "missing_answer_key",
      "Skipped explanation generation because no selected_official_answer or correct_answer is set."
    );
  }
  if (q?.answer_key_status === "correction_unclear") {
    return blocked(
      "answer_key_correction_unclear",
      "Skipped explanation generation because the answer-key correction is unclear. Needs human review."
    );
  }
  if (q?.answer_key_status === "correction_disputed") {
    return blocked(
      "answer_key_correction_disputed",
      "Skipped explanation generation because the answer-key correction is disputed."
    );
  }
  if (
    q?.answer_key_status === "missing_answer_key" ||
    q?.answer_key_status === "unverifiable" ||
    q?.answer_key_status === "question_unanswerable" ||
    q?.answer_key_status === "probably_wrong" ||
    q?.answer_key_status === "formatting_error"
  ) {
    return blocked(
      `answer_key_status=${q.answer_key_status}`,
      `Skipped explanation generation because answer_key_status is "${q.answer_key_status}". Needs human review.`
    );
  }

  // ── SOURCE (Phase 3 / Phase 4) ──
  // If Phase 3 ran AND the question text references a visual element
  // AND there's no attached image AND no required visual asset,
  // the question is unanswerable. (We deliberately don't gate on
  // missing question_crop alone — a missing crop is a publish-gate
  // concern, not a fill-eligibility concern.)
  if (
    q?.source_assets_processed_at != null &&
    questionMentionsVisual(q) &&
    !q?.image_url &&
    (q?.required_visual_asset_count ?? 0) === 0
  ) {
    return blocked(
      "missing_required_visual",
      "Skipped explanation generation because the question references a visual element but no required visual asset is attached."
    );
  }

  // ── MATH NOTATION (Phase 5) ──
  const mathStatus = q?.math_notation_status;
  if (
    mathStatus === "suggested_repair_needs_review" ||
    mathStatus === "ambiguous_repair" ||
    mathStatus === "unrepairable_from_source"
  ) {
    return blocked(
      `math_notation_${mathStatus}`,
      `Skipped explanation generation because math notation is unresolved (math_notation_status="${mathStatus}"). Needs human review before a polished explanation can be safely generated.`
    );
  }

  // ── VERIFICATION (Phase 6) ──
  // Phase 6 surfaces dispute via two channels: publish_status and
  // answer_verification_status. Check both.
  if (q?.publish_status === "blocked_answer_dispute") {
    return blocked(
      "blocked_answer_dispute",
      "Skipped explanation generation because the question is in answer dispute. Needs human review."
    );
  }
  const verStatus = q?.answer_verification_status;
  if (verStatus === "model_consensus_disagrees_with_key" || verStatus === "escalation_disagrees") {
    return blocked(
      `verification_${verStatus}`,
      `Skipped explanation generation because Phase 6 detected ${verStatus.replaceAll("_", " ")}. Needs human review.`
    );
  }
  if (verStatus === "unanswerable" || verStatus === "verifier_error") {
    return blocked(
      `verification_${verStatus}`,
      `Skipped explanation generation because Phase 6 marked this row "${verStatus}". Needs human review.`
    );
  }

  // ── KATEX / SLUG (Phase 1) ──
  if (q?.publish_status === "blocked_katex_error") {
    return blocked(
      "blocked_katex_error",
      "Skipped explanation generation because the question contains an unresolved KaTeX error. Fix the KaTeX first."
    );
  }
  if (q?.publish_status === "blocked_slug_uncertain") {
    return blocked(
      "blocked_slug_uncertain",
      "Skipped explanation generation because the concept_slug is uncertain. Assign a canonical slug first."
    );
  }

  return ELIGIBLE;
}

// Convenience: classify a checked row as eligible / blocked-by-this-tier
// so callers can produce a summary tally. Not used in the gate itself.
export const ELIGIBILITY_CATEGORIES = Object.freeze({
  ELIGIBLE: "eligible",
  STRUCTURAL: "structural",
  ANSWER_KEY: "answer_key",
  SOURCE: "source",
  MATH_NOTATION: "math_notation",
  VERIFICATION: "verification",
  KATEX_SLUG: "katex_slug",
});

export function categorizeReason(reason) {
  if (!reason) return ELIGIBILITY_CATEGORIES.ELIGIBLE;
  if (
    reason === "corrupt_question" ||
    reason === "duplicate_detected" ||
    reason === "empty_question_text" ||
    reason === "missing_mc_choices"
  )
    return ELIGIBILITY_CATEGORIES.STRUCTURAL;
  if (reason.startsWith("answer_key_") || reason === "missing_answer_key")
    return ELIGIBILITY_CATEGORIES.ANSWER_KEY;
  if (reason === "missing_required_visual") return ELIGIBILITY_CATEGORIES.SOURCE;
  if (reason.startsWith("math_notation_")) return ELIGIBILITY_CATEGORIES.MATH_NOTATION;
  if (reason === "blocked_answer_dispute" || reason.startsWith("verification_"))
    return ELIGIBILITY_CATEGORIES.VERIFICATION;
  if (reason === "blocked_katex_error" || reason === "blocked_slug_uncertain")
    return ELIGIBILITY_CATEGORIES.KATEX_SLUG;
  return ELIGIBILITY_CATEGORIES.ELIGIBLE;
}
