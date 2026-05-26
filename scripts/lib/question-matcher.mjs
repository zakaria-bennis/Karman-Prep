// ============================================================
// question-matcher — pure 7-step matching hierarchy that pairs
// a Gemini-detected question (from an answer-key page render)
// with its quiz_questions row.
//
// Spec: docs/ingestion/pipeline-v2-redesign-plan.md §3.4
// (Phase 3, "Matching hierarchy").
//
// Walks each detection through 6 progressively-cheaper signals
// plus an orphan terminal state. Returns
//   { matched: row | null, method: string, confidence: number }
// so the caller can write source_assets rows with the metadata.
//
// Pure JS, unit-tested in
// src/lib/pipeline-v2/question-matcher.test.ts.
// ============================================================

export const MATCH_CONFIDENCE = {
  page_question_number: 0.95,
  page_passage_snippet: 0.9,
  page_choice_snippets: 0.85,
  page_stem_snippet: 0.75,
  ordered_fallback: 0.6,
  orphan: 0.0,
};

// Two strings overlap if EITHER one contains the other at the
// start (after trim+lowercase) with a minimum useful length.
// Used by Steps 3, 4, 5.
function prefixOverlap(a, b, minLen = 40) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const la = a.trim().toLowerCase();
  const lb = b.trim().toLowerCase();
  if (la.length < minLen || lb.length < minLen) return false;
  return la.startsWith(lb) || lb.startsWith(la);
}

// Two stems "match" if the first N characters line up.
function stemMatches(detectedSnippet, rowQuestionText) {
  return prefixOverlap(detectedSnippet, rowQuestionText, 40);
}

// Two passages match if any of the row's passage fields share
// a 40+ char prefix with the detected passage_snippet.
function passageMatches(detectedSnippet, row) {
  if (!detectedSnippet) return false;
  for (const f of ["passage", "passage_a", "passage_b", "passage_intro"]) {
    if (prefixOverlap(detectedSnippet, row[f], 40)) return true;
  }
  return false;
}

// Choice snippets match if at least 3 of the 4 detected snippets
// match a row's answer_choices[i].choice_text.
function choiceMatches(detectedChoiceSnippets, row) {
  if (!detectedChoiceSnippets) return false;
  const rowChoices = row.answer_choices ?? [];
  if (rowChoices.length < 4) return false;
  let hits = 0;
  for (const letter of ["A", "B", "C", "D"]) {
    const det = detectedChoiceSnippets[letter];
    const rowChoice = rowChoices.find((c) => c.letter === letter);
    if (!det || !rowChoice) continue;
    // Choice snippets are shorter than passage prefixes; use a
    // smaller overlap threshold.
    if (prefixOverlap(det, rowChoice.choice_text, 20)) hits++;
  }
  return hits >= 3;
}

/**
 * Match ONE detected question against the candidate quiz_questions
 * rows that live on the same source page.
 *
 * @param {object} detected - the Gemini detection: { source_question_number,
 *   stem_snippet, passage_snippet, choice_snippets, bbox, confidence, ... }
 * @param {object[]} candidates - all quiz_questions rows for the
 *   relevant source_pdf + source_page combination. Caller has
 *   already filtered to the correct page.
 * @param {object[]} alreadyMatchedRowIds - row.id values already
 *   claimed by earlier matches on this page (so step 6 doesn't
 *   double-count).
 * @returns {{ matched: object|null, method: string, confidence: number }}
 */
export function matchOneDetection(detected, candidates, alreadyMatchedRowIds = new Set()) {
  const remaining = candidates.filter((c) => !alreadyMatchedRowIds.has(c.id));

  // Step 2 — visible source_question_number.
  // quiz_questions doesn't store question_number directly (yet),
  // but the answer_key_entries seeded by Phase 1 + 2 carry it.
  // For Phase 3, we accept it if the caller has hydrated rows
  // with a source_question_number field; otherwise skip.
  if (typeof detected.source_question_number === "number") {
    const hit = remaining.find(
      (c) =>
        typeof c.source_question_number === "number" &&
        c.source_question_number === detected.source_question_number
    );
    if (hit) return success(hit, "page_question_number");
  }

  // Step 3 — passage snippet (best for R&W).
  if (detected.passage_snippet) {
    const hit = remaining.find((c) => passageMatches(detected.passage_snippet, c));
    if (hit) return success(hit, "page_passage_snippet");
  }

  // Step 4 — choice snippets (best for MC math/R&W).
  if (detected.choice_snippets) {
    const hit = remaining.find((c) => choiceMatches(detected.choice_snippets, c));
    if (hit) return success(hit, "page_choice_snippets");
  }

  // Step 5 — stem snippet.
  if (detected.stem_snippet) {
    const hit = remaining.find((c) => stemMatches(detected.stem_snippet, c.question_text));
    if (hit) return success(hit, "page_stem_snippet");
  }

  // Step 6 + 7 handled by the caller — needs the page-level
  // detection count + DB count to decide between ordered_fallback
  // and orphan. Return a hint that "no semantic match found".
  return { matched: null, method: "no_semantic_match", confidence: 0 };
}

function success(row, method) {
  return { matched: row, method, confidence: MATCH_CONFIDENCE[method] };
}

/**
 * Match a PAGE's worth of detections in one pass. Applies steps 2-5
 * per-detection via matchOneDetection, then runs steps 6-7:
 *
 *   Step 6: ordered_fallback — ONLY if the count of unmatched
 *           detections equals the count of unmatched candidates
 *           on this page. Pairs them by detection-order vs
 *           candidate-order.
 *   Step 7: orphan — any detection still unmatched.
 *
 * Returns an array of { detected, matched, method, confidence }
 * objects, one per input detection, in the original order.
 *
 * @param {object[]} detections - the page's Gemini detections,
 *   ordered as Gemini returned them (typically top-to-bottom).
 * @param {object[]} candidates - quiz_questions rows for this page,
 *   ordered by id (caller's responsibility for deterministic order).
 */
export function matchPageDetections(detections, candidates) {
  const results = new Array(detections.length);
  const claimed = new Set();

  // First pass — semantic matches (steps 2-5).
  detections.forEach((det, i) => {
    const r = matchOneDetection(det, candidates, claimed);
    if (r.matched) {
      claimed.add(r.matched.id);
      results[i] = { detected: det, ...r };
    }
  });

  // Second pass — ordered fallback when counts allow it.
  const unmatched = detections.map((det, i) => ({ det, i })).filter(({ i }) => !results[i]);
  const unclaimed = candidates.filter((c) => !claimed.has(c.id));

  if (unmatched.length > 0 && unmatched.length === unclaimed.length) {
    // Pair by order — detection N to candidate N (both sorted).
    unmatched.forEach(({ i }, k) => {
      const row = unclaimed[k];
      claimed.add(row.id);
      results[i] = {
        detected: detections[i],
        matched: row,
        method: "ordered_fallback",
        confidence: MATCH_CONFIDENCE.ordered_fallback,
      };
    });
  }

  // Third pass — orphan terminal state.
  detections.forEach((det, i) => {
    if (!results[i]) {
      results[i] = {
        detected: det,
        matched: null,
        method: "orphan",
        confidence: MATCH_CONFIDENCE.orphan,
      };
    }
  });

  return results;
}

/** Helper exposed for the publish-gate's status-summarisation logic.
 *  Given the match outcome AND the detection's completeness flags,
 *  collapse to one of the four coarse processed_status values. */
export function processedStatusFromMatch(matchResult, detected) {
  if (!matchResult || matchResult.method === "orphan") {
    return "partial"; // orphan from this row's perspective is partial
  }
  if (matchResult.method === "ordered_fallback") return "partial";
  if (matchResult.confidence < 0.75) return "partial";

  const cropComplete =
    detected.contains_full_question_stem &&
    detected.contains_passage_if_present &&
    detected.contains_answer_choices_if_mcq &&
    detected.contains_embedded_visual_if_present;
  if (!cropComplete) return "partial";

  return "complete";
}
