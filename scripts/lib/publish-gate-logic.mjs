// ============================================================
// publish-gate-logic — PURE decision rules for the publish-gate.
//
// Extracted from scripts/pdf-pipeline/publish-gate.mjs so the
// decision matrix can be Vitest-unit-tested without standing up a
// Supabase fixture (the script itself does the DB I/O).
//
// Every gate is a function (row, validSlugs) → null on pass OR
// { reason, suggestedStatus } on fail. Tested in
// src/lib/pipeline-v2/publish-gate.test.ts.
// ============================================================

export function gateRequiredFields(q) {
  if (!q.question_text || !String(q.question_text).trim()) {
    return { reason: "empty_question_text", suggestedStatus: "corrupt_question" };
  }
  if (!q.correct_answer || !String(q.correct_answer).trim()) {
    return { reason: "empty_correct_answer", suggestedStatus: "needs_human_review" };
  }
  if (q.answer_format === "multiple_choice") {
    const letters = new Set((q.answer_choices ?? []).map((c) => c.letter));
    if (!(letters.has("A") && letters.has("B") && letters.has("C") && letters.has("D"))) {
      return { reason: "mc_missing_choices", suggestedStatus: "corrupt_question" };
    }
  }
  return null;
}

export function gateKaTeX(q) {
  if (q.publish_status === "blocked_katex_error") {
    return { reason: "katex_error_still_set", suggestedStatus: "blocked_katex_error" };
  }
  return null;
}

export function gateGraderVotes(q) {
  const v = q.grader_votes;
  if (!v || typeof v !== "object") return null;
  const verdict = v.verdict;
  if (
    verdict === "likely_wrong" ||
    verdict === "pass1_split" ||
    verdict === "pass1_disagree" ||
    verdict === "pass2_disagree"
  ) {
    return { reason: `grader_verdict=${verdict}`, suggestedStatus: "blocked_answer_dispute" };
  }
  return null;
}

export function gateSlug(q, validSlugs) {
  if (!validSlugs || validSlugs.size === 0) return null;
  if (!q.concept_slug) return null;
  if (!validSlugs.has(q.concept_slug)) {
    return {
      reason: `unknown_slug=${q.concept_slug}`,
      suggestedStatus: "blocked_slug_uncertain",
    };
  }
  return null;
}

export function gateMissingVisual(q) {
  if (
    q.import_flag_reason &&
    /missing.*figure|figure.*missing|whole-page figure fallback/i.test(q.import_flag_reason)
  ) {
    return {
      reason: q.import_flag_reason,
      suggestedStatus: "blocked_missing_visual",
    };
  }
  return null;
}

// ── v2 phase 4 gates — visual relevance (OPT-IN) ─────────────
//
// IMPORTANT: the fields these gates read off `q` (phase4_visual_relevance_checked,
// required_visual_asset_count, irrelevant_visual_asset_count,
// uncertain_visual_asset_count) are NOT columns on quiz_questions.
// They are HYDRATED AT RUNTIME by publish-gate.mjs:
// `aggregatePhase4VisualSignals(assets)` walks the question's
// source_assets rows, reads `raw_metadata.phase4_visual_relevance`
// (written by classify-visual-relevance.mjs), and spreads the
// aggregate counts onto `q` before calling computePublishStatus().
//
// So no DB migration is needed for phase 4 — the source of truth
// lives on source_assets.raw_metadata, and these gate fields are
// per-row aggregates computed by the publish-gate script.
function isPhase4Active(q) {
  return q.phase4_visual_relevance_checked === true;
}

export function gateIrrelevantAttachedVisual(q) {
  if (!isPhase4Active(q)) return null;
  if (!q.image_url) return null;
  if ((q.required_visual_asset_count ?? 0) > 0) return null;
  if ((q.irrelevant_visual_asset_count ?? 0) === 0) return null;
  return {
    reason: "phase4_attached_visual_classified_irrelevant",
    suggestedStatus: "blocked_missing_visual",
  };
}

export function gateUncertainVisualRelevance(q) {
  if (!isPhase4Active(q)) return null;
  const count = q.uncertain_visual_asset_count ?? 0;
  if (count === 0) return null;
  return {
    reason: `phase4_uncertain_visual_relevance=${count}`,
    suggestedStatus: "needs_human_review",
  };
}

export function gateImportStatus(q) {
  if (q.import_status === "needs_review") {
    return {
      reason: `import_status=needs_review (${q.import_flag_type ?? "unspecified"})`,
      suggestedStatus: "needs_human_review",
    };
  }
  return null;
}

export function gateExplanation(q) {
  if (!q.explanation_text || !String(q.explanation_text).trim()) {
    return {
      reason: "missing_explanation_text",
      suggestedStatus: "needs_human_review",
    };
  }
  return null;
}

// ── v2 phase 2 gates ───────────────────────────────────────────

/** answer_key_status is the result of Phase 2 extract-answer-key.mjs.
 *  Some statuses are publish-blocking; others just require review. */
export function gateAnswerKeyStatus(q) {
  const s = q.answer_key_status;
  if (!s) return null; // not yet processed by phase 2
  if (s === "correction_disputed") {
    return {
      reason: "answer_key_status=correction_disputed",
      suggestedStatus: "blocked_answer_dispute",
    };
  }
  if (s === "missing_answer_key" || s === "unverifiable" || s === "question_unanswerable") {
    return {
      reason: `answer_key_status=${s}`,
      suggestedStatus: "needs_human_review",
    };
  }
  if (s === "correction_unclear") {
    return {
      reason: "answer_key_status=correction_unclear",
      suggestedStatus: "needs_human_review",
    };
  }
  if (s === "probably_wrong" || s === "formatting_error") {
    return {
      reason: `answer_key_status=${s}`,
      suggestedStatus: "needs_human_review",
    };
  }
  // 'printed_key_used_no_correction', 'corrected_key_verified', 'correct' → pass
  return null;
}

/** Compares solver's verified answer against selected_official_answer.
 *  If they disagree, this is a publish-blocking dispute that requires
 *  human review (the grader thinks the printed key is wrong). */
export function gateAnswerVerification(q) {
  if (q.answer_verification_status === "disputed") {
    return {
      reason: "solver_consensus_disagrees_with_selected_official_answer",
      suggestedStatus: "blocked_answer_dispute",
    };
  }
  if (q.answer_verification_status === "unverifiable") {
    return {
      reason: "answer_verification_status=unverifiable",
      suggestedStatus: "needs_human_review",
    };
  }
  return null;
}

/** A corrected (i.e. red-ink-overridden) answer that passed verification
 *  gets a more truthful publish_status so admins can see it came from
 *  a hand correction (and might want to spot-check). Returned only when
 *  the row is otherwise clean. */
export function postProcessVerifiedRepair(q) {
  if (q.answer_key_status === "corrected_key_verified") {
    return "publish_ready_with_verified_repair";
  }
  return "publish_ready";
}

// ── v2 phase 3 gates — source evidence (OPT-IN) ────────────────
//
// Every gate below short-circuits on `q.source_assets_processed_at`
// being null. That column is set by extract-question-crops.mjs (or
// the backfill) when the row goes through Phase 3 processing.
// Pre-Phase-3 rows have it null and these gates DO NOT FIRE on them.
//
// This was the central design call from the user: "old v1 rows
// should not all be newly flagged just because Phase 3 exists."

const LOW_CONFIDENCE_THRESHOLD = 0.75;

function isPhase3Active(q) {
  return q.source_assets_processed_at != null;
}

export function gateMissingSourcePage(q) {
  if (!isPhase3Active(q)) return null;
  if (q.source_page != null) return null;
  return {
    reason: "phase3_source_page_missing",
    suggestedStatus: "needs_human_review",
  };
}

export function gateMissingQuestionCrop(q) {
  if (!isPhase3Active(q)) return null;
  if (q.has_question_crop) return null;
  return {
    reason: "phase3_missing_question_crop",
    suggestedStatus: "needs_human_review",
  };
}

export function gateLowCropConfidence(q) {
  if (!isPhase3Active(q)) return null;
  if (q.question_crop_match_confidence == null) return null;
  if (q.question_crop_match_confidence >= LOW_CONFIDENCE_THRESHOLD) return null;
  return {
    reason: `phase3_low_crop_confidence=${q.question_crop_match_confidence}`,
    suggestedStatus: "needs_human_review",
  };
}

export function gateOrderedFallbackMatch(q) {
  if (!isPhase3Active(q)) return null;
  if (q.question_crop_match_method !== "ordered_fallback") return null;
  return {
    reason: "phase3_match_method=ordered_fallback",
    suggestedStatus: "needs_human_review",
  };
}

export function gateOrphanCropsOnPage(q) {
  if (!isPhase3Active(q)) return null;
  if (!q.has_orphan_crops_on_page) return null;
  return {
    reason: "phase3_orphan_crops_on_page",
    suggestedStatus: "needs_human_review",
  };
}

export function gateCropCountMismatch(q) {
  if (!isPhase3Active(q)) return null;
  // The signal lives on processed_status='partial' with a specific
  // marker the script sets. For Phase 3 v1 we treat any 'partial'
  // status that ALSO has orphan crops on the page as a count mismatch.
  if (q.source_assets_processed_status !== "partial") return null;
  if (!q.has_orphan_crops_on_page) return null;
  return {
    reason: "phase3_crop_count_mismatch",
    suggestedStatus: "needs_human_review",
  };
}

export function gateIncompleteCrop(q) {
  if (!isPhase3Active(q)) return null;
  if (q.question_crop_complete !== false) return null; // null or true → pass
  return {
    reason: "phase3_crop_complete=false",
    suggestedStatus: "needs_human_review",
  };
}

// ── v2 phase 5 gates — math-notation repair (OPT-IN) ───────────
//
// Every gate below short-circuits on `q.math_notation_checked_at`
// being null. That column is set by repair-math-notation.mjs when
// the row has been inspected. Pre-Phase-5 rows have it null and
// these gates DO NOT FIRE on them — same opt-in pattern as Phase 3.
//
// The Phase 5 publish-gate logic distinguishes verified_auto_repair
// (which still publishes, just with a more truthful publish_status
// suffix) from anything that needs human review.
function isPhase5Active(q) {
  return q.math_notation_checked_at != null;
}

export function gateMathRepairNeedsReview(q) {
  if (!isPhase5Active(q)) return null;
  if (q.math_notation_status !== "suggested_repair_needs_review") return null;
  return {
    reason: "phase5_math_repair_suggested_needs_review",
    suggestedStatus: "needs_human_review",
  };
}

export function gateMathRepairAmbiguous(q) {
  if (!isPhase5Active(q)) return null;
  if (q.math_notation_status !== "ambiguous_repair") return null;
  return {
    reason: "phase5_math_repair_ambiguous",
    suggestedStatus: "blocked_answer_dispute",
  };
}

export function gateMathRepairUnrepairable(q) {
  if (!isPhase5Active(q)) return null;
  if (q.math_notation_status !== "unrepairable_from_source") return null;
  return {
    reason: "phase5_math_repair_unrepairable_from_source",
    suggestedStatus: "needs_human_review",
  };
}

/**
 * Phase 5 post-processor: when all gates pass AND a verified
 * auto-repair was applied, surface that visibly in publish_status
 * so admins can spot-check. Mirrors postProcessVerifiedRepair's
 * pattern for Phase 2 corrected answer keys — same downstream
 * publish_status name.
 */
export function postProcessVerifiedMathRepair(q, baseStatus) {
  if (!isPhase5Active(q)) return baseStatus;
  if (q.math_notation_status === "verified_auto_repair") {
    return "publish_ready_with_verified_repair";
  }
  return baseStatus;
}

// ── v2 phase 6 gates — answer verification (OPT-IN) ────────────
//
// Every gate below short-circuits on `q.answer_verified_at` being
// null. That column is set by verify-answers.mjs when the row goes
// through Phase 6. Pre-Phase-6 rows have it null and these gates
// DO NOT FIRE on them. Same opt-in pattern as Phase 3 + Phase 5.
//
// IMPORTANT: gateAnswerVerification (Phase 2) still fires for legacy
// rows that have answer_verification_status='disputed' from the old
// multi-vote-grader. Phase 6 adds richer status values that the
// new gates below handle separately.
function isPhase6Active(q) {
  return q.answer_verified_at != null;
}

export function gateModelConsensusDispute(q) {
  if (!isPhase6Active(q)) return null;
  if (q.answer_verification_status !== "model_consensus_disagrees_with_key") return null;
  return {
    reason: `phase6_model_consensus_disagrees_with_key (suggested=${q.suggested_verified_answer ?? "?"})`,
    suggestedStatus: "blocked_answer_dispute",
  };
}

export function gateEscalationDisagrees(q) {
  if (!isPhase6Active(q)) return null;
  if (q.answer_verification_status !== "escalation_disagrees") return null;
  return {
    reason: "phase6_escalation_disagrees (Pro and Opus disagree)",
    suggestedStatus: "blocked_answer_dispute",
  };
}

export function gatePanelSplit(q) {
  if (!isPhase6Active(q)) return null;
  if (q.answer_verification_status !== "panel_split") return null;
  return {
    reason: "phase6_panel_split (no Pass 1 majority)",
    suggestedStatus: "needs_human_review",
  };
}

export function gateSympyInconclusive(q) {
  if (!isPhase6Active(q)) return null;
  if (q.answer_verification_status !== "sympy_inconclusive") return null;
  return {
    reason: "phase6_sympy_inconclusive (open-ended equivalence undecidable)",
    suggestedStatus: "needs_human_review",
  };
}

export function gateUnanswerable(q) {
  if (!isPhase6Active(q)) return null;
  if (q.answer_verification_status !== "unanswerable") return null;
  return {
    reason: `phase6_unanswerable (${q.dispute_category ?? "unspecified"})`,
    suggestedStatus: "needs_human_review",
  };
}

export function gateVerifierError(q) {
  if (!isPhase6Active(q)) return null;
  if (q.answer_verification_status !== "verifier_error") return null;
  return {
    reason: "phase6_verifier_error (panel transport failures)",
    suggestedStatus: "needs_human_review",
  };
}

/**
 * Phase 6 post-processor: a verified-by-Pro/Opus/SymPy answer
 * surfaces as publish_ready_with_verified_repair so admins can
 * spot-check, same pattern as Phase 2 + Phase 5.
 *
 * Note: VERIFIED_PANEL alone (Pass 1 majority agrees with key) is
 * the happy path and produces plain publish_ready — no spot-check
 * surface needed there.
 */
export function postProcessVerifiedPhase6(q, baseStatus) {
  if (!isPhase6Active(q)) return baseStatus;
  const s = q.answer_verification_status;
  if (s === "verified_pro" || s === "verified_opus" || s === "verified_sympy") {
    return "publish_ready_with_verified_repair";
  }
  return baseStatus;
}

// ── v2 phase 7 gates — explanation v2 (OPT-IN) ─────────────────
//
// Every gate below short-circuits on `q.explanation_v2_filled_at`
// being null. That column is set by Phase 7's runners (the
// eligibility gate OR the fill stage). Legacy rows that were
// filled by the old fill-all.mjs have it null and these gates DO
// NOT FIRE on them — same opt-in pattern as Phase 3 / 5 / 6.
//
// A row that Phase 7 marked skipped_not_eligible carries
// explanation_v2.admin_diagnostic_note explaining WHY (visible to
// admins via the preview UI). The student-facing legacy fields
// remain whatever they were before Phase 7 ran on the row.
function isPhase7Active(q) {
  return q.explanation_v2_filled_at != null;
}

export function gateExplanationSkippedNotEligible(q) {
  if (!isPhase7Active(q)) return null;
  if (q.explanation_v2_status !== "skipped_not_eligible") return null;
  return {
    reason: "phase7_skipped_not_eligible (pre-fill gate blocked generation)",
    suggestedStatus: "needs_human_review",
  };
}

export function gateExplanationQaFailed(q) {
  if (!isPhase7Active(q)) return null;
  if (q.explanation_v2_status !== "qa_failed") return null;
  return {
    reason: "phase7_qa_failed (schema or critic rejected the explanation)",
    suggestedStatus: "needs_human_review",
  };
}

export function gateExplanationNeedsHumanReview(q) {
  if (!isPhase7Active(q)) return null;
  if (q.explanation_v2_status !== "needs_human_review") return null;
  return {
    reason: "phase7_needs_human_review",
    suggestedStatus: "needs_human_review",
  };
}

export function gateExplanationStale(q) {
  if (!isPhase7Active(q)) return null;
  if (q.explanation_v2_status !== "stale_answer_changed") return null;
  return {
    reason: "phase7_stale_answer_changed (Phase 6 changed the verified answer after fill)",
    suggestedStatus: "needs_human_review",
  };
}

/**
 * Phase 7 post-processor: a qa_passed explanation on a row that
 * also has a verified repair (Phase 2 corrected key OR Phase 5
 * verified math repair OR Phase 6 Pro/Opus/SymPy verification)
 * keeps that "verified_repair" surface — the explanation just
 * adds polish on top.
 *
 * A qa_passed explanation on a row with NO repair stays plain
 * publish_ready — no spot-check surface needed.
 */
export function postProcessVerifiedPhase7(q, baseStatus) {
  // Phase 7 doesn't INTRODUCE a new "with_verified_repair" flavor.
  // It just doesn't FIGHT the upstream phase's verdict. So this
  // post-processor is intentionally a no-op pass-through, kept
  // for symmetry with the other phases' post-processors and so
  // future Phase 7.5 changes have a hook to drop into.
  return baseStatus;
}

// Strictness order: first match wins.
// blocked_* (corrupt > katex > answer disputes > slug > visual) before
// needs_human_review (answer_key_status > import_status > phase3 source
// evidence > phase4 uncertain visuals > explanation).
// v2 phase 2 adds answer_verification + answer_key_status gates.
// v2 phase 3 adds 7 source-evidence gates, all OPT-IN (no-op when
// source_assets_processed_at is null — so old v1 rows aren't affected).
// v2 phase 4 adds visual relevance gates, also OPT-IN (requires at
// least one visual asset carrying phase4_visual_relevance metadata).
// v2 phase 5 adds 3 math-notation gates, also OPT-IN (no-op when
// math_notation_checked_at is null). gateMathRepairAmbiguous routes
// to blocked_answer_dispute alongside other answer disputes;
// gateMathRepairNeedsReview / gateMathRepairUnrepairable route to
// needs_human_review alongside other Phase 3 review gates.
// v2 phase 6 adds 6 verifier gates, all OPT-IN via answer_verified_at.
// gateModelConsensusDispute + gateEscalationDisagrees route to
// blocked_answer_dispute (the "key is probably wrong" surface);
// gatePanelSplit / gateSympyInconclusive / gateUnanswerable /
// gateVerifierError route to needs_human_review.
// v2 phase 7 adds 4 explanation gates, all OPT-IN via
// explanation_v2_filled_at. gateExplanationSkippedNotEligible /
// gateExplanationQaFailed / gateExplanationNeedsHumanReview /
// gateExplanationStale all route to needs_human_review (Phase 7
// never blocks publish on its own — it just defers to upstream
// dispute gates already in this list, OR routes to the soft
// needs_human_review bucket).
export const ALL_GATES = [
  gateRequiredFields, // → corrupt_question on missing q_text
  gateKaTeX, // → blocked_katex_error
  gateGraderVotes, // → blocked_answer_dispute (grader latest summary)
  gateAnswerVerification, // → blocked_answer_dispute (v2 phase 2: solver vs key)
  gateAnswerKeyStatus, // → blocked_answer_dispute or needs_human_review (v2 phase 2)
  gateMathRepairAmbiguous, // → blocked_answer_dispute (v2 phase 5)
  gateModelConsensusDispute, // → blocked_answer_dispute (v2 phase 6)
  gateEscalationDisagrees, // → blocked_answer_dispute (v2 phase 6)
  (q, slugs) => gateSlug(q, slugs), // → blocked_slug_uncertain
  gateMissingVisual, // → blocked_missing_visual
  gateIrrelevantAttachedVisual, // → blocked_missing_visual (v2 phase 4)
  gateImportStatus, // → needs_human_review (specific reason)
  // ── v2 phase 3 (all opt-in via source_assets_processed_at) ──
  gateMissingSourcePage,
  gateMissingQuestionCrop,
  gateLowCropConfidence,
  gateOrderedFallbackMatch,
  gateOrphanCropsOnPage,
  gateCropCountMismatch,
  gateIncompleteCrop,
  gateUncertainVisualRelevance, // → needs_human_review (v2 phase 4)
  // ── v2 phase 5 (opt-in via math_notation_checked_at) ──
  gateMathRepairNeedsReview, // → needs_human_review
  gateMathRepairUnrepairable, // → needs_human_review
  // ── v2 phase 6 (opt-in via answer_verified_at) ──
  gatePanelSplit, // → needs_human_review
  gateSympyInconclusive, // → needs_human_review
  gateUnanswerable, // → needs_human_review
  gateVerifierError, // → needs_human_review
  // ── v2 phase 7 (opt-in via explanation_v2_filled_at) ──
  gateExplanationSkippedNotEligible, // → needs_human_review
  gateExplanationQaFailed, // → needs_human_review
  gateExplanationNeedsHumanReview, // → needs_human_review
  gateExplanationStale, // → needs_human_review
  // ── softest gate runs last ──
  gateExplanation, // → needs_human_review (softer)
];

export function computePublishStatus(q, validSlugs) {
  for (const gate of ALL_GATES) {
    const r = gate(q, validSlugs);
    if (r) return r;
  }
  // All gates pass → publish_ready. v2 phase 2 surfaces hand-corrected
  // answer keys as publish_ready_with_verified_repair; v2 phase 5
  // surfaces verified math notation repairs the same way; v2 phase 6
  // adds verified-by-Pro/Opus/SymPy. v2 phase 7's post-processor is
  // a no-op pass-through (it preserves whatever Phase 2/5/6 set).
  let finalStatus = postProcessVerifiedRepair(q);
  finalStatus = postProcessVerifiedMathRepair(q, finalStatus);
  finalStatus = postProcessVerifiedPhase6(q, finalStatus);
  finalStatus = postProcessVerifiedPhase7(q, finalStatus);
  return {
    reason:
      finalStatus === "publish_ready_with_verified_repair"
        ? "all_gates_pass_with_verified_repair"
        : "all_gates_pass",
    suggestedStatus: finalStatus,
  };
}

// Also export the KaTeX span extractor for shared use in
// validate-katex.mjs and its unit test.
export function extractMathSpans(text) {
  if (!text) return [];
  const spans = [];
  const displayRe = /\$\$([\s\S]+?)\$\$/g;
  let m;
  while ((m = displayRe.exec(text)) !== null) {
    spans.push({ latex: m[1], displayMode: true, index: m.index });
  }
  const withoutDisplay = text.replace(displayRe, (s) => " ".repeat(s.length));
  const inlineRe = /(?<!\\)\$([^$\n]+?)(?<!\\)\$/g;
  while ((m = inlineRe.exec(withoutDisplay)) !== null) {
    spans.push({ latex: m[1], displayMode: false, index: m.index });
  }
  return spans;
}
