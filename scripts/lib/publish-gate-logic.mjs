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

// Strictness order: first match wins.
// blocked_* (corrupt > katex > answer > slug > visual) before
// needs_human_review (import_status > explanation).
export const ALL_GATES = [
  gateRequiredFields, // → corrupt_question on missing q_text
  gateKaTeX, // → blocked_katex_error
  gateGraderVotes, // → blocked_answer_dispute
  (q, slugs) => gateSlug(q, slugs), // → blocked_slug_uncertain
  gateMissingVisual, // → blocked_missing_visual
  gateImportStatus, // → needs_human_review (specific reason)
  gateExplanation, // → needs_human_review (softer)
];

export function computePublishStatus(q, validSlugs) {
  for (const gate of ALL_GATES) {
    const r = gate(q, validSlugs);
    if (r) return r;
  }
  return { reason: "all_gates_pass", suggestedStatus: "publish_ready" };
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
