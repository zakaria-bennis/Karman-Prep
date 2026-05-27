// ============================================================
// grader-persistence — Phase 6 DB writes.
//
// Shared between scripts/question-audit/verify-answers.mjs (new
// Phase 6 main path) and scripts/question-audit/multi-vote-grader.mjs
// (legacy fallback). Centralizes:
//
//   · writeGraderRunsAppendOnly  — append one row per (q, role, run)
//     INCLUDING failed voters (selected_answer=NULL + error in
//     raw_response_json). Phase 6 fixes the legacy bug of dropping
//     failed voters silently.
//   · writeGraderVotesSummary    — update quiz_questions.grader_votes
//     JSONB latest-summary that the admin UI reads.
//   · writeVerifierVerdict       — Phase 6 only. Set the new
//     answer_verified_at + answer_verifier_version +
//     answer_verification_status + dispute_category +
//     suggested_verified_answer columns.
//
// All writes accept an optional `dryRun: true` flag that logs the
// intended write but skips the DB call.
// ============================================================

import { PHASE6_VERIFIER_VERSION, ROLE_PROVIDERS, ROLE_MODELS } from "./grader-roles.mjs";

// ── grader_runs INSERT ───────────────────────────────────────

/**
 * Append one row per (question, role, run_group_id) capturing the
 * full LLM response — successful OR errored. Errored voters carry
 * selected_answer=NULL and the error string in raw_response_json.error.
 *
 * @param {object} args
 * @param {object} args.supabase                — supabase-js client (admin role)
 * @param {string} args.runGroupId              — shared across all voters in one sweep
 * @param {Array<{
 *   questionId: string,
 *   role: string,
 *   ok: boolean,
 *   selectedAnswer?: string | null,
 *   normalizedAnswer?: string | null,
 *   confidence?: number | null,
 *   answerKeyMatch?: boolean | null,
 *   isAnswerable?: boolean | null,
 *   reasoningSummary?: string | null,
 *   rawResponse?: object | null,
 *   error?: string | null,
 *   costEstimate?: number | null,
 * }>} args.voters
 * @param {boolean} [args.dryRun=false]
 * @returns {Promise<{inserted: number, errored: number}>}
 */
export async function writeGraderRunsAppendOnly({ supabase, runGroupId, voters, dryRun = false }) {
  const rows = voters.map((v) => ({
    question_id: v.questionId,
    run_group_id: runGroupId,
    grader_role: v.role,
    provider: ROLE_PROVIDERS[v.role] ?? "unknown",
    model: ROLE_MODELS[v.role] ?? "unknown",
    selected_answer: v.ok ? (v.selectedAnswer ?? null) : null,
    normalized_answer: v.ok ? (v.normalizedAnswer ?? null) : null,
    confidence: v.confidence ?? null,
    answer_key_match: v.answerKeyMatch ?? null,
    is_answerable: v.isAnswerable ?? null,
    suspected_formatting_issue: null,
    formatting_flags: {},
    visual_flags: {},
    reasoning_summary: v.reasoningSummary ?? null,
    raw_response_json: v.ok
      ? (v.rawResponse ?? null)
      : { error: v.error ?? "unknown_error", raw: v.rawResponse ?? null },
    cost_estimate: v.costEstimate ?? null,
  }));

  if (dryRun) {
    console.log(`  [dry-run] would insert ${rows.length} grader_runs rows`);
    return { inserted: 0, errored: 0 };
  }

  const CHUNK = 100;
  let inserted = 0;
  let errored = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from("grader_runs").insert(slice);
    if (error) {
      errored += slice.length;
      console.warn(`  ✗ grader_runs insert: ${error.message}`);
    } else {
      inserted += slice.length;
    }
  }
  return { inserted, errored };
}

// ── grader_votes JSONB summary ────────────────────────────────

/**
 * Update quiz_questions.grader_votes with the latest per-row summary
 * the admin UI reads. Shape mirrors what multi-vote-grader.mjs has
 * been writing — we keep it backward-compatible so existing UI badges
 * still render. Phase 6 ADDS the dispute_category + escalation_path
 * fields underneath.
 */
export async function writeGraderVotesSummary({ supabase, questionId, summary, dryRun = false }) {
  if (dryRun) {
    console.log(`  [dry-run] grader_votes for ${questionId.slice(0, 8)}: ${summary.verdict}`);
    return { ok: true };
  }
  const { error } = await supabase
    .from("quiz_questions")
    .update({ grader_votes: summary })
    .eq("id", questionId);
  if (error) {
    console.warn(`  ✗ grader_votes update ${questionId.slice(0, 8)}: ${error.message}`);
    return { ok: false };
  }
  return { ok: true };
}

// ── Phase 6 verdict write ────────────────────────────────────

/**
 * Set the Phase 6 columns on quiz_questions:
 *   answer_verified_at, answer_verifier_version,
 *   answer_verification_status, dispute_category,
 *   suggested_verified_answer.
 *
 * Phase 6 NEVER auto-flips selected_official_answer — the suggested
 * answer is a hint, not a mutation.
 */
export async function writeVerifierVerdict({
  supabase,
  questionId,
  verifierStatus,
  disputeCategory,
  suggestedVerifiedAnswer = null,
  verifierVersion = PHASE6_VERIFIER_VERSION,
  dryRun = false,
}) {
  const payload = {
    answer_verified_at: new Date().toISOString(),
    answer_verifier_version: verifierVersion,
    answer_verification_status: verifierStatus,
    dispute_category: disputeCategory,
    suggested_verified_answer: suggestedVerifiedAnswer,
  };
  if (dryRun) {
    console.log(`  [dry-run] verifier verdict ${questionId.slice(0, 8)}:`, payload);
    return { ok: true };
  }
  const { error } = await supabase.from("quiz_questions").update(payload).eq("id", questionId);
  if (error) {
    console.warn(`  ✗ verifier verdict ${questionId.slice(0, 8)}: ${error.message}`);
    return { ok: false };
  }
  return { ok: true };
}

// ── runGroupId helper ────────────────────────────────────────

export async function newRunGroupId() {
  // Modern Node 22 exposes crypto.randomUUID() as a global; fall
  // back to the import for older runners. Async return so this
  // module stays ESM-pure.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const { randomUUID } = await import("node:crypto");
  return randomUUID();
}
