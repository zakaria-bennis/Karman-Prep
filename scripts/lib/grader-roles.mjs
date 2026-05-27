// ============================================================
// grader-roles — Phase 6 typed taxonomy.
//
// Pure module. Defines the typed solver roles, dispute categories,
// verifier-status enum, and visual-input fallback chain that
// verify-answers.mjs + grader-prompts.mjs + verifier-routing.mjs
// + grader-persistence.mjs all reference.
//
// SOURCE OF TRUTH for:
//   · grader_runs.grader_role string values (app-enforced)
//   · quiz_questions.dispute_category string values (app-enforced)
//   · quiz_questions.answer_verification_status NEW values
//     (Phase 2 added 'verified' / 'verified_pro' / 'verified_opus' /
//      'disputed' / 'unverifiable'; Phase 6 adds the ones below)
//   · quiz_questions.answer_verifier_version sentinel
// ============================================================

export const PHASE6_VERIFIER_VERSION = "phase6_answer_verification_v1";

// ── Typed solver roles (per user policy) ───────────────────────
//
// Replaces multi-vote-grader's untyped "voter" names. Each role
// has a specific job and a specific prompt template. Failed voters
// still get written to grader_runs with selected_answer=NULL and
// the error reason in raw_response_json — that's the difference
// from the legacy grader, which dropped failed voters silently.
export const GRADER_ROLES = Object.freeze({
  // Pass 1 — the default 3-voter panel.
  DEEPSEEK_PRIMARY: "deepseek_primary_solver",
  GROQ_INDEPENDENT: "groq_independent_solver",
  GEMINI_FLASH_VISUAL: "gemini_flash_visual_checker",
  // Pass 2 — typed escalation.
  GEMINI_PRO_VISUAL: "gemini_pro_visual_escalation",
  CLAUDE_OPUS_REASONING: "claude_opus_reasoning_arbiter",
  // SymPy bridge (CI-only; same script Phase 5 wired).
  SYMPY_EQUIVALENCE: "sympy_equivalence_checker",
});

export const PASS1_ROLES = Object.freeze([
  GRADER_ROLES.DEEPSEEK_PRIMARY,
  GRADER_ROLES.GROQ_INDEPENDENT,
  GRADER_ROLES.GEMINI_FLASH_VISUAL,
]);

// Provider strings written to grader_runs.provider alongside the role.
export const ROLE_PROVIDERS = Object.freeze({
  [GRADER_ROLES.DEEPSEEK_PRIMARY]: "openrouter",
  [GRADER_ROLES.GROQ_INDEPENDENT]: "groq",
  [GRADER_ROLES.GEMINI_FLASH_VISUAL]: "google",
  [GRADER_ROLES.GEMINI_PRO_VISUAL]: "google",
  [GRADER_ROLES.CLAUDE_OPUS_REASONING]: "anthropic",
  [GRADER_ROLES.SYMPY_EQUIVALENCE]: "sympy_local",
});

export const ROLE_MODELS = Object.freeze({
  [GRADER_ROLES.DEEPSEEK_PRIMARY]: "deepseek/deepseek-chat",
  [GRADER_ROLES.GROQ_INDEPENDENT]: "llama-3.3-70b-versatile",
  [GRADER_ROLES.GEMINI_FLASH_VISUAL]: "gemini-2.5-flash",
  [GRADER_ROLES.GEMINI_PRO_VISUAL]: "gemini-2.5-pro",
  [GRADER_ROLES.CLAUDE_OPUS_REASONING]: "claude-opus-4-7",
  [GRADER_ROLES.SYMPY_EQUIVALENCE]: "sympy-1.13.3",
});

// ── Typed dispute categories ──────────────────────────────────
//
// Written to quiz_questions.dispute_category. The verifier-routing
// classifier picks one of these based on (subject, answer_format,
// has_required_visual, Phase 5 math_notation_status, etc.).
//
// 'none' is the happy-path value — the panel agreed with the
// stored answer. Anything else routes through escalation.
export const DISPUTE_CATEGORIES = Object.freeze({
  NONE: "none",
  ANSWER_KEY_DISPUTE: "answer_key_dispute",
  VISUAL_DISPUTE: "visual_dispute",
  MATH_NOTATION_DISPUTE: "math_notation_dispute",
  MATH_EQUIVALENCE_DISPUTE: "math_equivalence_dispute",
  RW_REASONING_DISPUTE: "rw_reasoning_dispute",
  UNANSWERABLE_QUESTION: "unanswerable_question",
  EXTRACTION_ERROR: "extraction_error",
});

// ── Escalation paths (Pass 2) ─────────────────────────────────
//
// Output of verifier-routing.mjs — names the strategy verify-
// answers.mjs uses after Pass 1 produces a non-NONE dispute.
//
//   PRO              → only Gemini Pro
//   OPUS             → only Claude Opus
//   BOTH             → run BOTH Pro and Opus, then compare
//   SYMPY_FIRST      → run SymPy equivalence; only escalate if it
//                       returns 'inconclusive' or 'not_equivalent'
//   HUMAN_REVIEW_ONLY → don't escalate; route straight to review
//                       (used for EXTRACTION_ERROR / UNANSWERABLE
//                        — no model can help here)
export const ESCALATION_PATHS = Object.freeze({
  PRO: "pro",
  OPUS: "opus",
  BOTH: "both",
  SYMPY_FIRST: "sympy_first",
  HUMAN_REVIEW_ONLY: "human_review_only",
});

// ── Verifier-status enum (NEW Phase 6 values) ─────────────────
//
// Written to quiz_questions.answer_verification_status. Phase 2
// established the original set ('verified', 'verified_pro',
// 'verified_opus', 'disputed', 'unverifiable'); Phase 6 ADDS the
// values below for the typed-routing world. We keep the Phase 2
// values working — the publish-gate handles both old and new.
//
// 'verified_panel'        — Pass 1 panel agreed with stored answer
//                            (replaces the old 'verified' for new rows;
//                             Phase 2's 'verified' still works for legacy)
// 'verified_pro'          — Pro agreed with stored after Pass 1 dispute
// 'verified_opus'         — Opus agreed with stored after Pro dispute
// 'verified_sympy'        — SymPy proved open-ended answer equivalent
// 'panel_split'           — Pass 1 voters couldn't agree among themselves
// 'model_consensus_disagrees_with_key'
//                          — All 5 voters (panel + Pro + Opus) agree on
//                            an answer that differs from the stored key.
//                            suggested_verified_answer is populated.
// 'escalation_disagrees'  — Pro disagrees with Opus on a dispute.
// 'sympy_inconclusive'    — Open-ended; SymPy couldn't decide.
// 'unanswerable'          — Voters reported the question can't be solved
//                            from the text (missing visual / corrupt).
// 'verifier_error'        — All voters errored (transport / quota).
//                            Distinct from 'unverifiable' which means
//                            we have no key OR no answer to compare.
export const VERIFIER_STATUSES = Object.freeze({
  // Pass values (panel reached agreement with the key)
  VERIFIED_PANEL: "verified_panel",
  VERIFIED_PRO: "verified_pro",
  VERIFIED_OPUS: "verified_opus",
  VERIFIED_SYMPY: "verified_sympy",
  // Dispute / review values
  PANEL_SPLIT: "panel_split",
  MODEL_CONSENSUS_DISAGREES_WITH_KEY: "model_consensus_disagrees_with_key",
  ESCALATION_DISAGREES: "escalation_disagrees",
  SYMPY_INCONCLUSIVE: "sympy_inconclusive",
  UNANSWERABLE: "unanswerable",
  VERIFIER_ERROR: "verifier_error",
  // Phase 2 carry-overs (legacy rows may still have these)
  LEGACY_VERIFIED: "verified",
  LEGACY_DISPUTED: "disputed",
  LEGACY_UNVERIFIABLE: "unverifiable",
});

// ── Visual-input fallback chain (per user policy) ─────────────
//
// The Gemini Flash visual checker (and the Pro escalation) prefer
// the expanded crop because it keeps context (passage cue, choices)
// without page-wide noise. Resolved by grader-prompts.mjs at call
// time; this enum names the asset_type strings to look up in
// source_assets.
export const VISUAL_INPUT_PREFERENCE = Object.freeze([
  // Default per user policy: expanded crop wins.
  "expanded_question_crop",
  // Fallback: tight crop if expanded was never produced.
  "question_crop",
  // Last resort: full page image. Used only when both crops
  // are unavailable or visual relevance / missing-figure context
  // demands seeing surrounding content.
  "page_image",
]);

// Special-case override: for exact math-notation checks (the
// Phase 5 cross-talk path), prefer the TIGHT crop to minimize
// surrounding noise around the formula.
export const VISUAL_INPUT_PREFERENCE_NOTATION = Object.freeze([
  "question_crop",
  "expanded_question_crop",
  "page_image",
]);
