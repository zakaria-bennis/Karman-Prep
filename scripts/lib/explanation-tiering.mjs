// ============================================================
// explanation-tiering — Phase 7 model escalation policy.
//
// Pure function. Given a question + Phase 6 context + retry flag,
// decides which Claude model handles GENERATION and which handles
// CRITIQUE.
//
// Per user policy:
//   Generator: Sonnet by default, Opus on escalation.
//   Critic:    Sonnet by default, Opus only when Sonnet critic
//              is inconclusive.
//
// Escalation triggers (any one → Opus generator):
//   · Reading/Writing dispute (subject='reading' + Phase 6
//     produced a dispute or used Opus arbitration)
//   · Phase 6 reached its verdict via Opus arbitration
//     (answer_verifier_version produced 'verified_opus' or
//      'escalation_disagrees')
//   · Subtle passage-reasoning question (R&W with multi-paragraph
//     passage — Sonnet sometimes misses cross-paragraph evidence)
//   · Retry pass after Sonnet's first explanation failed QA
//
// SHAPE:
//   { generator_model, generator_role, critic_model, critic_role,
//     escalation_reason }
// ============================================================

export const TIERING_MODELS = Object.freeze({
  SONNET: "claude-sonnet-4-6",
  OPUS: "claude-opus-4-7",
});

export const TIERING_ROLES = Object.freeze({
  GENERATOR_SONNET: "explanation_v2_generator_sonnet",
  GENERATOR_OPUS: "explanation_v2_generator_opus",
  CRITIC_SONNET: "explanation_v2_critic_sonnet",
  CRITIC_OPUS: "explanation_v2_critic_opus",
});

// ── Helpers ──────────────────────────────────────────────────

function isRwDispute(question) {
  if (question?.subject !== "reading") return false;
  const verStatus = question?.answer_verification_status;
  if (
    verStatus === "model_consensus_disagrees_with_key" ||
    verStatus === "escalation_disagrees" ||
    verStatus === "verified_opus"
  ) {
    return true;
  }
  // Phase 6 dispute_category can also indicate R&W escalation.
  if (question?.dispute_category === "rw_reasoning_dispute") return true;
  return false;
}

function isPhase6UsedOpus(question) {
  const v = question?.answer_verification_status;
  return v === "verified_opus" || v === "escalation_disagrees";
}

function isSubtlePassage(question) {
  if (question?.subject !== "reading") return false;
  // Heuristic: a "subtle" R&W question has dual passages (passage_a +
  // passage_b) OR a long passage (>800 chars) where cross-paragraph
  // reasoning is likely. Sonnet often does fine on single-paragraph
  // R&W; the leverage of Opus is on multi-paragraph synthesis.
  if (question?.passage_a && question?.passage_b) return true;
  const passageLen = String(question?.passage ?? "").length;
  return passageLen > 800;
}

// ── Generator tier ───────────────────────────────────────────

/**
 * Decide which Claude model generates the explanation_v2 bundle.
 *
 * @param {object} args
 * @param {object} args.question      — hydrated quiz_questions row
 * @param {boolean} [args.isRetry]    — true on the post-QA repair attempt
 * @returns {{model: string, role: string, reason: string}}
 */
export function pickGeneratorTier({ question, isRetry = false }) {
  if (isRetry) {
    return {
      model: TIERING_MODELS.OPUS,
      role: TIERING_ROLES.GENERATOR_OPUS,
      reason: "Retry after attempt-1 QA failure — escalate to Opus.",
    };
  }
  if (isRwDispute(question)) {
    return {
      model: TIERING_MODELS.OPUS,
      role: TIERING_ROLES.GENERATOR_OPUS,
      reason: "R&W question with active Phase 6 dispute — escalate to Opus.",
    };
  }
  if (isPhase6UsedOpus(question)) {
    return {
      model: TIERING_MODELS.OPUS,
      role: TIERING_ROLES.GENERATOR_OPUS,
      reason:
        "Phase 6 reached verdict via Opus arbitration — explanation should match arbiter strength.",
    };
  }
  if (isSubtlePassage(question)) {
    return {
      model: TIERING_MODELS.OPUS,
      role: TIERING_ROLES.GENERATOR_OPUS,
      reason: "R&W with long or dual passage — Opus handles cross-paragraph reasoning better.",
    };
  }
  return {
    model: TIERING_MODELS.SONNET,
    role: TIERING_ROLES.GENERATOR_SONNET,
    reason: "Default tier: Sonnet is strong enough for routine explanations.",
  };
}

// ── Critic tier ──────────────────────────────────────────────

/**
 * Decide which Claude model runs the critic.
 *
 * Per user policy: Sonnet by default; Opus only when Sonnet's
 * findings are inconclusive (e.g. Sonnet returned no clear pass/
 * fail signal, or the explanation under review is itself Opus-
 * generated and we want a strong second opinion).
 *
 * @param {object} args
 * @param {object} args.question
 * @param {string} args.generatorModel  — which model generated the
 *                                          explanation being reviewed
 * @param {boolean} [args.escalate]     — caller forces Opus (e.g.
 *                                          Sonnet critic was inconclusive)
 */
export function pickCriticTier({ question, generatorModel, escalate = false }) {
  if (escalate) {
    return {
      model: TIERING_MODELS.OPUS,
      role: TIERING_ROLES.CRITIC_OPUS,
      reason: "Sonnet critic was inconclusive — escalate to Opus critic.",
    };
  }
  if (generatorModel === TIERING_MODELS.OPUS && isRwDispute(question)) {
    // High-stakes R&W: an Opus-generated explanation in a disputed
    // R&W context deserves an Opus second-read.
    return {
      model: TIERING_MODELS.OPUS,
      role: TIERING_ROLES.CRITIC_OPUS,
      reason: "Opus-generated explanation on a disputed R&W row — Opus critic for second opinion.",
    };
  }
  return {
    model: TIERING_MODELS.SONNET,
    role: TIERING_ROLES.CRITIC_SONNET,
    reason: "Default tier: Sonnet critic.",
  };
}

// ── Cost estimates (USD per question, rough) ─────────────────
// Used by the runner to populate generator_cost_estimate +
// critic_cost_estimate in explanation_qa_records. Not perfectly
// accurate — actual cost depends on token count — but a fixed
// per-call estimate is sufficient for budget visibility.
export const COST_PER_CALL = Object.freeze({
  [TIERING_MODELS.SONNET]: 0.02,
  [TIERING_MODELS.OPUS]: 0.08,
});
