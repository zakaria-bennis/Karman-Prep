// ============================================================
// findings — Phase 8.3 shared helpers for question_findings.
//
// question_findings is the project-wide audit/grader finding store
// (created in migration 20260518130917). Phase 8.3 introduces four
// new audit modules that write here:
//   · check-well-formedness
//   · check-slug-alignment
//   · check-figure-coherence
//   · check-explanation-consistency
//
// All four modules + the publish-gate hydrator import from this
// file so there's exactly one source of truth for the severity
// enum, category strings, and the upsert call shape.
//
// The DB table enforces UNIQUE(question_id, source, code) — that
// means re-running an audit module on a question UPSERTs the
// existing finding rather than appending. Each module's `code`
// must be stable across runs.
// ============================================================

// Mirror of the migration's CHECK on question_findings.severity.
export const SEVERITY = Object.freeze({
  BLOCKING: "BLOCKING",
  WARNING: "WARNING",
  NOTICE: "NOTICE",
});

// Source enum — mirror of the migration's CHECK on
// question_findings.source. Phase 8.3 modules all use 'auditor'.
export const SOURCE = Object.freeze({
  AUDITOR: "auditor",
  GRADER: "grader",
});

// The 4 Phase 8.3 audit modules. `category` field on
// question_findings carries this string so admins can filter by
// audit type in the Inspector UI.
export const AUDIT_MODULES = Object.freeze({
  WELL_FORMEDNESS: "well_formedness",
  SLUG_ALIGNMENT: "slug_alignment",
  FIGURE_COHERENCE: "figure_coherence",
  EXPLANATION_CONSISTENCY: "explanation_consistency",
});

// ── Eligibility guards (per the user's policy) ────────────────

/**
 * well-formedness runs broadly — basically every row that exists.
 * The deterministic-first stage is cheap, so we always run it.
 */
export function isEligibleForWellFormedness(q) {
  return !!q?.id;
}

/**
 * slug-alignment runs only when concept_slug is set. Rows with no
 * assigned slug have nothing to align against.
 */
export function isEligibleForSlugAlignment(q) {
  return !!q?.id && typeof q?.concept_slug === "string" && q.concept_slug.length > 0;
}

/**
 * figure-coherence runs only when the question has an attached
 * image OR a required source visual. Otherwise there's no figure
 * to check coherence against.
 */
export function isEligibleForFigureCoherence(q) {
  if (!q?.id) return false;
  if (q.image_url) return true;
  if ((q.required_visual_asset_count ?? 0) > 0) return true;
  return false;
}

/**
 * explanation-consistency runs only when explanation_v2 exists.
 * Rows without Phase 7 explanations can't be audited for content
 * consistency yet.
 */
export function isEligibleForExplanationConsistency(q) {
  if (!q?.id) return false;
  const v2 = q.explanation_v2;
  return v2 != null && typeof v2 === "object" && typeof v2.correct_reasoning === "string";
}

// ── DB writer ────────────────────────────────────────────────

/**
 * Upsert one finding. The (question_id, source, code) unique
 * constraint means re-running the same audit on the same question
 * updates the prior row rather than piling up duplicates.
 *
 * @param {object} args
 * @param {object} args.supabase            — admin client
 * @param {string} args.questionId
 * @param {string} args.category             — one of AUDIT_MODULES
 * @param {string} args.code                  — stable identifier (e.g. "missing_evidence")
 * @param {string} args.severity              — SEVERITY enum value
 * @param {string} args.message               — one-sentence summary (admin-facing)
 * @param {string|null} [args.value]         — offending value snippet
 * @param {object|null} [args.detail]        — structured detail; may include
 *                                              suggested_publish_status to drive
 *                                              the publish-gate's routing.
 * @param {boolean} [args.dryRun=false]
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function upsertFinding({
  supabase,
  questionId,
  category,
  code,
  severity,
  message,
  value = null,
  detail = null,
  dryRun = false,
}) {
  const row = {
    question_id: questionId,
    source: SOURCE.AUDITOR,
    severity,
    category,
    code,
    message,
    value,
    detail,
    // resolved_at intentionally left null on insert. Re-running the
    // audit doesn't auto-resolve — admin acknowledges in the UI.
  };
  if (dryRun) {
    console.log(
      `  [dry-run] upsert finding ${questionId.slice(0, 8)} ${category}/${code} ${severity}`
    );
    return { ok: true };
  }
  const { error } = await supabase
    .from("question_findings")
    .upsert(row, { onConflict: "question_id,source,code" });
  if (error) {
    console.warn(`  ✗ finding upsert ${questionId.slice(0, 8)} ${code}: ${error.message}`);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Clear a previously-written finding (used when a re-audit
 * determines the issue no longer applies — e.g. operator fixed
 * the figure and a fresh run finds no problem). Marks the finding
 * resolved with a synthetic note rather than deleting; preserves
 * audit history.
 */
export async function clearFinding({
  supabase,
  questionId,
  category,
  code,
  resolvedNote = "auto-cleared by re-audit",
  dryRun = false,
}) {
  if (dryRun) {
    console.log(
      `  [dry-run] clear finding ${questionId.slice(0, 8)} ${category}/${code} (${resolvedNote})`
    );
    return { ok: true };
  }
  void category; // category is on the row, not the where clause
  const { error } = await supabase
    .from("question_findings")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: "audit_re_run",
      resolved_note: resolvedNote,
    })
    .eq("question_id", questionId)
    .eq("source", SOURCE.AUDITOR)
    .eq("code", code)
    .is("resolved_at", null);
  if (error) {
    console.warn(`  ✗ finding clear ${questionId.slice(0, 8)} ${code}: ${error.message}`);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ── Reader for the publish-gate ──────────────────────────────

/**
 * Hydrate per-question unresolved-blocking-finding signals for
 * publish-gate. Returns a Map(questionId → {count, firstSuggestedStatus}).
 *
 * Called once at publish-gate startup for the whole row batch so
 * the per-row gate stays a pure function.
 */
export async function hydrateBlockingFindings(supabase, questionIds) {
  const out = new Map();
  if (!questionIds || questionIds.length === 0) return out;
  const CHUNK = 200;
  for (let i = 0; i < questionIds.length; i += CHUNK) {
    const slice = questionIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("question_findings")
      .select("question_id, code, detail, message, category")
      .in("question_id", slice)
      .eq("source", SOURCE.AUDITOR)
      .eq("severity", SEVERITY.BLOCKING)
      .is("resolved_at", null);
    if (error) {
      console.warn(`  ✗ hydrateBlockingFindings: ${error.message}`);
      continue;
    }
    for (const f of data ?? []) {
      const entry = out.get(f.question_id) ?? {
        count: 0,
        firstSuggestedStatus: null,
        firstMessage: null,
        firstCategory: null,
      };
      entry.count++;
      if (!entry.firstSuggestedStatus) {
        const sugg = f.detail?.suggested_publish_status;
        if (typeof sugg === "string") entry.firstSuggestedStatus = sugg;
        entry.firstMessage = f.message;
        entry.firstCategory = f.category;
      }
      out.set(f.question_id, entry);
    }
  }
  return out;
}
