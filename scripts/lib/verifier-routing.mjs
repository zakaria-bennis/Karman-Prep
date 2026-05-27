// ============================================================
// verifier-routing — Phase 6 evidence-based dispute router.
//
// Pure function. Takes a question + Pass 1 panel result + the
// signals available from earlier phases (Phase 2 answer-key
// status, Phase 3 source-asset confidence, Phase 5 math-notation
// flags) and decides:
//
//   { dispute_category, escalation_path }
//
// Implements the user's verbatim Phase 6 routing policy:
//
//   1. R&W disputes → Claude Opus (reasoning-heavy)
//   2. Math + visual element (graph/table/chart/figure) → Gemini Pro
//   3. Math notation disputes → Pro for visual confirmation,
//      then SymPy/solver (sympy_first)
//   4. Math open-ended equivalence → SymPy first
//   5. Pure math reasoning (no visual/notation) → Pro first,
//      Opus if Pro still disputes
//   6. Routing ambiguous → run BOTH Pro AND Opus
//   7. (downstream) Pro + Opus disagree → human review
//
// Panel signal is ALSO used:
//   · Flash disagreeing with text solvers hints visual_dispute
//   · Text solvers disagreeing with each other hints reasoning_dispute
//   But the router checks subject + answer_format + visual flags
//   + Phase 5 notation flags first — those are higher-signal than
//   "which model disagreed".
//
// HARD STOPS (route to HUMAN_REVIEW_ONLY, no model can help):
//   · extraction_error: MC question with <4 choices
//   · unanswerable_question: all voters reported is_answerable=false
//   · verifier_error: all 3 panel voters failed transport-side
//     (handled by the caller; this module sees ≥1 valid vote)
// ============================================================

import { DISPUTE_CATEGORIES, ESCALATION_PATHS } from "./grader-roles.mjs";

// ── Detection helpers ─────────────────────────────────────────

/**
 * Returns true when the question stem mentions a visual element
 * (graph/table/chart/figure/diagram). We re-use the same pattern
 * set Phase 4's visual-relevance-logic uses for consistency, but
 * inline here to keep this module dependency-free for tests.
 */
function questionMentionsVisual(question) {
  const t = String(question?.question_text ?? "").toLowerCase();
  if (!t) return false;
  return /\b(graph|table|chart|figure|diagram|plot|scatter\s*plot|histogram|box\s*plot|coordinate\s+plane|number\s+line|fig\.?\s*\d+)\b/.test(
    t
  );
}

/**
 * True when the question has an attached image (image_url) OR a
 * source_assets row classified as a required visual.
 */
function questionHasRequiredVisual(question) {
  if (question?.image_url) return true;
  if ((question?.required_visual_asset_count ?? 0) > 0) return true;
  return false;
}

/**
 * True when Phase 5 flagged the question as having an unreviewed
 * math-notation issue. The router treats this as a notation_dispute
 * signal regardless of what Pass 1 voted, because the OCR text the
 * voters saw may be misleading.
 */
function questionHasMathNotationFlag(question) {
  const s = question?.math_notation_status;
  return (
    s === "suggested_repair_needs_review" ||
    s === "ambiguous_repair" ||
    s === "unrepairable_from_source"
  );
}

/**
 * True when the answer-key status itself is one of the disputed
 * values (Phase 2). Phase 6 should NOT use the panel verdict alone
 * when the key itself is already flagged — the dispute is really
 * about the key, not the solver.
 */
function answerKeyIsDisputed(question) {
  const s = question?.answer_key_status;
  return (
    s === "correction_disputed" ||
    s === "correction_unclear" ||
    s === "manual_correction_selected_pending_verification"
  );
}

// ── Panel-signal inspection ───────────────────────────────────

/**
 * From the Pass 1 votes, decide which voters agreed and which
 * disagreed. Returns sub-signals the router uses below.
 *
 * @param {Array<{role: string, answer: string|null}>} pass1Votes
 * @param {string} storedAnswer
 */
function inspectPanelSignal(pass1Votes, storedAnswer) {
  const flashVote = pass1Votes.find((v) => v.role?.includes("flash"));
  const deepseekVote = pass1Votes.find((v) => v.role?.includes("deepseek"));
  const groqVote = pass1Votes.find((v) => v.role?.includes("groq"));

  const flashAns = flashVote?.answer ?? null;
  const textAnswers = [deepseekVote?.answer, groqVote?.answer].filter(Boolean);

  const flashAgreesWithText =
    flashAns &&
    textAnswers.length > 0 &&
    textAnswers.every((a) => String(a).trim() === String(flashAns).trim());

  const textVotersAgreeWithEachOther =
    textAnswers.length === 2 && String(textAnswers[0]).trim() === String(textAnswers[1]).trim();

  const stored = storedAnswer ? String(storedAnswer).trim() : null;
  const flashAgreesWithKey = stored && flashAns && String(flashAns).trim() === stored;

  return {
    flash_answer: flashAns,
    text_answers: textAnswers,
    flash_agrees_with_text: !!flashAgreesWithText,
    text_voters_agree_with_each_other: textVotersAgreeWithEachOther,
    flash_agrees_with_key: !!flashAgreesWithKey,
  };
}

// ── Main router ──────────────────────────────────────────────

/**
 * Classify a dispute and choose an escalation path.
 *
 * @param {object} args
 * @param {object} args.question                  — quiz_questions row
 *        (with subject, answer_format, math_notation_status,
 *         answer_key_status, image_url, question_text,
 *         required_visual_asset_count). Other Phase 3/4/5 fields
 *         tolerated but not required.
 * @param {Array<{role: string, answer: string|null, is_answerable?: boolean, ok?: boolean}>} args.pass1Votes
 *        — Result of the Pass 1 typed-role panel. At least one
 *          entry should have answer != null (caller short-circuits
 *          to verifier_error otherwise).
 * @param {{consensus: string|null, count: number, unanimous: boolean}} args.pass1Tally
 *        — Output of grader-normalize.tallyAgreement on the votes.
 *
 * @returns {{
 *   dispute_category: string,
 *   escalation_path: string,
 *   reason: string,
 * }}
 */
export function routeDispute({ question, pass1Votes, pass1Tally }) {
  // ── HARD STOPS — no model can help ──
  if (
    question?.answer_format === "multiple_choice" &&
    Array.isArray(question?.answer_choices) &&
    question.answer_choices.length < 4
  ) {
    return {
      dispute_category: DISPUTE_CATEGORIES.EXTRACTION_ERROR,
      escalation_path: ESCALATION_PATHS.HUMAN_REVIEW_ONLY,
      reason: "MC question has fewer than 4 answer_choices — extraction error.",
    };
  }

  const unanswerableCount = pass1Votes.filter((v) => v.is_answerable === false).length;
  if (unanswerableCount === pass1Votes.length && pass1Votes.length > 0) {
    return {
      dispute_category: DISPUTE_CATEGORIES.UNANSWERABLE_QUESTION,
      escalation_path: ESCALATION_PATHS.HUMAN_REVIEW_ONLY,
      reason: "All Pass 1 voters reported the question is unanswerable.",
    };
  }

  // ── No dispute at all ──
  const stored = question?.selected_official_answer ?? question?.correct_answer ?? null;
  if (
    pass1Tally?.consensus &&
    stored &&
    String(pass1Tally.consensus).trim() === String(stored).trim() &&
    pass1Tally.count >= 2 // need majority, not single survivor
  ) {
    return {
      dispute_category: DISPUTE_CATEGORIES.NONE,
      escalation_path: ESCALATION_PATHS.HUMAN_REVIEW_ONLY, // not used; sentinel
      reason: "Pass 1 majority agreed with stored answer — no escalation.",
    };
  }

  const subject = question?.subject;
  const fmt = question?.answer_format;
  const panel = inspectPanelSignal(pass1Votes, stored);

  // ── Rule 1: R&W → always Opus (reasoning-heavy) ──
  if (subject === "reading") {
    return {
      dispute_category: DISPUTE_CATEGORIES.RW_REASONING_DISPUTE,
      escalation_path: ESCALATION_PATHS.OPUS,
      reason: "Reading/Writing dispute → Claude Opus (reasoning arbiter).",
    };
  }

  // ── Rule 4: Open-ended numeric → SymPy first ──
  // Done before Rule 2 because a math question with both numeric_entry
  // AND a visual element should still try SymPy first — equivalence
  // is the cheaper check.
  if (subject === "math" && fmt === "numeric_entry") {
    return {
      dispute_category: DISPUTE_CATEGORIES.MATH_EQUIVALENCE_DISPUTE,
      escalation_path: ESCALATION_PATHS.SYMPY_FIRST,
      reason: "Math numeric_entry — SymPy equivalence first.",
    };
  }

  // ── Rule 3: Math notation flag from Phase 5 ──
  if (subject === "math" && questionHasMathNotationFlag(question)) {
    return {
      dispute_category: DISPUTE_CATEGORIES.MATH_NOTATION_DISPUTE,
      escalation_path: ESCALATION_PATHS.SYMPY_FIRST,
      reason: `Math notation flag (${question.math_notation_status}) → SymPy first, escalate to Pro on disagreement.`,
    };
  }

  // ── Rule 2: Math + visual element → Gemini Pro ──
  if (
    subject === "math" &&
    (questionHasRequiredVisual(question) || questionMentionsVisual(question))
  ) {
    // ALSO: if Phase 1 visual checker (Flash) disagreed with the text
    // solvers, that strongly suggests a visual-side issue. Keep Pro.
    return {
      dispute_category: DISPUTE_CATEGORIES.VISUAL_DISPUTE,
      escalation_path: ESCALATION_PATHS.PRO,
      reason: panel.flash_agrees_with_text
        ? "Math visual question — Pro for visual escalation."
        : "Math visual question + Flash disagrees with text solvers → Pro.",
    };
  }

  // ── Answer-key already disputed (Phase 2) ──
  // The key itself is suspect; this isn't really about the model
  // panel. Route to BOTH so Pro + Opus can independently weigh in
  // on whether the panel consensus or the key is right.
  if (answerKeyIsDisputed(question)) {
    return {
      dispute_category: DISPUTE_CATEGORIES.ANSWER_KEY_DISPUTE,
      escalation_path: ESCALATION_PATHS.BOTH,
      reason: `Answer key already disputed (answer_key_status=${question.answer_key_status}) → run Pro AND Opus.`,
    };
  }

  // ── Rule 5: Pure math reasoning, no visual or notation issue ──
  if (subject === "math") {
    return {
      dispute_category: DISPUTE_CATEGORIES.MATH_EQUIVALENCE_DISPUTE,
      escalation_path: ESCALATION_PATHS.PRO,
      reason: "Pure math reasoning dispute, no visual — Pro first.",
    };
  }

  // ── Rule 6: Ambiguous — run both ──
  // Fallback for subjects we don't recognize, or weird combinations.
  return {
    dispute_category: DISPUTE_CATEGORIES.ANSWER_KEY_DISPUTE,
    escalation_path: ESCALATION_PATHS.BOTH,
    reason: "Dispute type ambiguous — run BOTH Pro and Opus for safety.",
  };
}

// ── Post-Pass-2 reconciliation ───────────────────────────────

/**
 * After Pass 2 (escalation) runs, decide the final verifier
 * status. Inputs are intentionally explicit so the caller can
 * stage every combination in tests.
 *
 * @param {object} args
 * @param {string} args.escalationPath        — what we ran (PRO/OPUS/BOTH/SYMPY_FIRST/HUMAN_REVIEW_ONLY)
 * @param {string|null} args.storedAnswer
 * @param {string|null} args.proAnswer
 * @param {string|null} args.opusAnswer
 * @param {"equivalent"|"not_equivalent"|"inconclusive"|null} args.sympyResult
 * @param {string|null} args.pass1Consensus    — the Pass 1 majority answer (if any)
 *
 * @returns {{
 *   verifier_status: string,
 *   suggested_verified_answer: string | null,
 *   reason: string,
 * }}
 */
export function reconcileVerdict({
  escalationPath,
  storedAnswer,
  proAnswer,
  opusAnswer,
  sympyResult,
  pass1Consensus,
}) {
  const stored = storedAnswer ? String(storedAnswer).trim() : null;

  // HUMAN_REVIEW_ONLY hard-stop paths route as a dispute category
  // upstream; no model verdict expected here. Caller short-circuits.

  // SymPy-first path: SymPy alone is enough when it returns a clear answer.
  if (escalationPath === ESCALATION_PATHS.SYMPY_FIRST) {
    if (sympyResult === "equivalent") {
      return {
        verifier_status: "verified_sympy",
        suggested_verified_answer: null,
        reason: "SymPy confirmed the panel answer is equivalent to the stored key.",
      };
    }
    if (sympyResult === "not_equivalent") {
      // Numeric answers DIFFER — escalate to Pro (visual notation
      // could be at fault) or block.
      return {
        verifier_status: "model_consensus_disagrees_with_key",
        suggested_verified_answer: pass1Consensus ?? null,
        reason: "SymPy proved the panel consensus differs from the stored key.",
      };
    }
    // Inconclusive → caller decides whether to escalate to Pro.
    return {
      verifier_status: "sympy_inconclusive",
      suggested_verified_answer: pass1Consensus ?? null,
      reason: "SymPy couldn't decide equivalence; awaiting model escalation.",
    };
  }

  // PRO path: a single Pro vote settles it.
  if (escalationPath === ESCALATION_PATHS.PRO) {
    if (!proAnswer) {
      return {
        verifier_status: "verifier_error",
        suggested_verified_answer: pass1Consensus ?? null,
        reason: "Pro escalation produced no answer.",
      };
    }
    if (stored && String(proAnswer).trim() === stored) {
      return {
        verifier_status: "verified_pro",
        suggested_verified_answer: null,
        reason: "Pro agreed with the stored key after Pass 1 dispute.",
      };
    }
    return {
      verifier_status: "model_consensus_disagrees_with_key",
      suggested_verified_answer: String(proAnswer).trim(),
      reason: "Pro disagrees with stored key.",
    };
  }

  // OPUS path: single Opus vote.
  if (escalationPath === ESCALATION_PATHS.OPUS) {
    if (!opusAnswer) {
      return {
        verifier_status: "verifier_error",
        suggested_verified_answer: pass1Consensus ?? null,
        reason: "Opus escalation produced no answer.",
      };
    }
    if (stored && String(opusAnswer).trim() === stored) {
      return {
        verifier_status: "verified_opus",
        suggested_verified_answer: null,
        reason: "Opus agreed with the stored key after Pass 1 dispute.",
      };
    }
    return {
      verifier_status: "model_consensus_disagrees_with_key",
      suggested_verified_answer: String(opusAnswer).trim(),
      reason: "Opus disagrees with stored key.",
    };
  }

  // BOTH path: Pro and Opus must agree for a verdict.
  if (escalationPath === ESCALATION_PATHS.BOTH) {
    if (!proAnswer || !opusAnswer) {
      return {
        verifier_status: "verifier_error",
        suggested_verified_answer: pass1Consensus ?? null,
        reason: "BOTH escalation missing Pro and/or Opus answer.",
      };
    }
    const proStr = String(proAnswer).trim();
    const opusStr = String(opusAnswer).trim();
    if (proStr !== opusStr) {
      return {
        verifier_status: "escalation_disagrees",
        suggested_verified_answer: null,
        reason: "Pro and Opus disagree — route to human review.",
      };
    }
    // Pro + Opus agree.
    if (stored && proStr === stored) {
      // They both agree with the key — closest equivalent of
      // "verified_pro" + "verified_opus". Surface as verified_opus
      // (the stronger signal of the two).
      return {
        verifier_status: "verified_opus",
        suggested_verified_answer: null,
        reason: "Pro and Opus both agreed with the stored key.",
      };
    }
    return {
      verifier_status: "model_consensus_disagrees_with_key",
      suggested_verified_answer: proStr,
      reason: "Pro and Opus agree on an answer that differs from the stored key.",
    };
  }

  return {
    verifier_status: "verifier_error",
    suggested_verified_answer: pass1Consensus ?? null,
    reason: `Unknown escalation path: ${escalationPath}`,
  };
}
