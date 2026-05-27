// ============================================================
// import-core — Phase 8.1 shared question-import library.
//
// Single source of truth for the row-level logic both paths need:
//   · scripts/pdf-pipeline/import-json-direct.ts (orchestrator)
//   · src/lib/question-bank/bulk-import.ts       (admin upload)
//   · (future) scripts/pdf-pipeline/import-csv-direct.mjs is
//     DEPRECATED — kept in repo as a debug-only fallback that still
//     does its own thing.
//
// Why this exists (per Phase 8 / docs/ingestion/pipeline-v2-redesign-plan.md):
// the orchestrator path and the admin-upload path had diverged. Per
// the audit:
//   · orchestrator's import-csv-direct.mjs computes content_hash_v2,
//     seeds answer_key_entries, registers source_assets, mirrors
//     selected_official_answer + answer_key_status, and writes
//     raw_question_text / raw_choice_text.
//   · bulk-import.ts (via the older insertQuestion helper) does NONE
//     of those side effects.
//
// Both paths now go through importQuestion() here, so admin-uploaded
// rows get the same Phase 1/2/5 metadata as orchestrator-imported rows.
//
// DEPENDENCY INJECTION: the Supabase client is passed in. Web callers
// pass createAdminClient(); CLI callers pass their own service-role
// client. Pure functions (validateImportRow, computeContentHashV2)
// are exported separately for vitest without any DB plumbing.
// ============================================================

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  isValidSlug,
  isValidDomain,
  clusterFromSlug,
  nodeIdFromSlug,
  CLUSTER_BY_DOMAIN,
  type SATDomain,
} from "@/lib/question-bank/taxonomy";
import {
  levelToLegacyDifficulty,
  type AnswerLetter,
  type AnswerSource,
  type ImportFlagType,
  type ImportStatus,
  type QuizDifficulty,
  type QuizDifficultyLevel,
} from "@/types/quiz";

// ── Public types ─────────────────────────────────────────────

/**
 * The canonical input shape for ONE question being imported. Both
 * the admin upload (after CSV parsing) and the orchestrator JSON
 * runner (after gemini extraction) construct this shape.
 *
 * Optional fields default to null. Required fields throw at validation.
 */
export interface ImportQuestionInput {
  // ── Required ──
  question_text: string;
  correct_answer: string;
  domain: SATDomain;

  // ── MC choices (required when answer_format=multiple_choice) ──
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;

  // ── Difficulty + format ──
  difficulty?: string | number; // 1-7 or legacy label; defaults to 4 / "intermediate"
  question_format?: "multiple_choice" | "numeric_entry";
  numeric_tolerance?: string | number;

  // ── Source ──
  source_pdf?: string;
  source_page?: number | string;
  content_hash?: string; // v1 hash kept for back-compat; v2 is computed here

  // ── Curriculum routing ──
  concept_slug?: string;
  topic_cluster?: string;

  // ── Body ──
  passage_intro?: string;
  passage?: string;
  passage_a?: string;
  passage_b?: string;

  // ── Explanation (legacy fields — Phase 7's explanation_v2 lives elsewhere) ──
  explanation_text?: string;
  explanation_a?: string;
  explanation_b?: string;
  explanation_c?: string;
  explanation_d?: string;
  desmos_strategy?: string;
  hint?: string;

  // ── Provenance ──
  answer_source?: AnswerSource;
  import_status?: ImportStatus;
  import_flag_type?: ImportFlagType;
  import_flag_reason?: string;

  // ── Figure (admin path materializes data URLs upstream; orchestrator path passes the R2 URL) ──
  image_url?: string | null;
  image_storage_path?: string | null;
  image_alt?: string;
}

export interface ImportQuestionResult {
  inserted: boolean;
  question_id: string | null;
  duplicate_skipped: boolean;
  flagged_for_review: boolean;
  errors: string[];
}

export interface ImportBatchSummary {
  inserted: number;
  skipped_duplicates: number;
  flagged_for_review: number;
  errored: number;
  errors: Array<{ row: number; message: string }>;
}

// ── Pure helpers (no DB, no IO) ─────────────────────────────

const READING_DOMAINS = new Set<SATDomain>([
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
]);

export function subjectFromDomain(domain: SATDomain): "reading" | "math" {
  return READING_DOMAINS.has(domain) ? "reading" : "math";
}

const LEGACY_LEVEL_MAP: Record<QuizDifficulty, QuizDifficultyLevel> = {
  foundational: 2,
  intermediate: 4,
  advanced: 5,
  mastery: 6,
};

/**
 * Parse a difficulty value (either 1-7 integer, or legacy enum
 * "foundational" / "intermediate" / "advanced" / "mastery") into the
 * canonical pair { level, legacy }. Defaults to (4, "intermediate")
 * when the input is missing or unparseable.
 */
export function parseDifficulty(value: string | number | undefined | null): {
  level: QuizDifficultyLevel;
  legacy: QuizDifficulty;
} {
  if (value == null) return { level: 4, legacy: levelToLegacyDifficulty(4) };
  const asNumber = typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= 7) {
    const lvl = asNumber as QuizDifficultyLevel;
    return { level: lvl, legacy: levelToLegacyDifficulty(lvl) };
  }
  const trimmed = String(value).trim();
  if (trimmed in LEGACY_LEVEL_MAP) {
    const legacy = trimmed as QuizDifficulty;
    return { level: LEGACY_LEVEL_MAP[legacy], legacy };
  }
  return { level: 4, legacy: levelToLegacyDifficulty(4) };
}

/**
 * Compute the v2 content hash that drives duplicate detection.
 * Includes passage fields so two cross-text questions with identical
 * stems no longer collide (audit CRIT-4 from question-bank-audit-2026-05-17).
 *
 * Stable as long as the same canonical fields are passed; both callers
 * must compute it identically — that's what this helper ensures.
 */
export function computeContentHashV2(fields: {
  subject: string;
  domain: string;
  answer_format: string;
  passage_intro?: string;
  passage?: string;
  passage_a?: string;
  passage_b?: string;
  question_text: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
}): string {
  const normalized = [
    fields.subject,
    fields.domain,
    fields.answer_format,
    fields.passage_intro ?? "",
    fields.passage ?? "",
    fields.passage_a ?? "",
    fields.passage_b ?? "",
    fields.question_text,
    fields.choice_a ?? "",
    fields.choice_b ?? "",
    fields.choice_c ?? "",
    fields.choice_d ?? "",
  ]
    .map((p) => String(p).trim().toLowerCase())
    .join("|");
  return createHash("sha256").update(normalized, "utf-8").digest("hex");
}

/**
 * Validate an ImportQuestionInput for required fields + enum values.
 * Returns { ok: true } when the row is import-able; { ok: false, errors }
 * when something must be fixed before the row can be written.
 *
 * IMPORTANT: validation is NOT the same as "questions that will
 * publish" — needs_review rows are still valid here (they just won't
 * pass the publish-gate later). This gate only rejects rows that
 * would corrupt the DB.
 */
export function validateImportRow(row: ImportQuestionInput): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!row.question_text || !row.question_text.trim()) {
    errors.push("missing question_text");
  }
  if (!row.correct_answer || !row.correct_answer.trim()) {
    errors.push("missing correct_answer");
  }
  if (!row.domain) {
    errors.push("missing domain");
  } else if (!isValidDomain(row.domain)) {
    errors.push(`unknown domain "${row.domain}"`);
  }
  if (row.concept_slug && !isValidSlug(row.concept_slug)) {
    errors.push(`unknown concept_slug "${row.concept_slug}"`);
  }

  const fmt = row.question_format ?? "multiple_choice";
  if (fmt === "multiple_choice") {
    // Empty strings are OK for individual choice texts (the rare
    // SAT question where one choice is just "0" or similar); but
    // NONE of them being set is an extraction error.
    const choices = [row.choice_a, row.choice_b, row.choice_c, row.choice_d];
    const haveAny = choices.some((c) => c != null && c !== "");
    if (!haveAny) {
      errors.push("multiple_choice row has no choice_a/b/c/d text");
    }
    // The correct_answer letter must be a valid A-D.
    if (row.correct_answer && !/^[A-Da-d]$/.test(row.correct_answer.trim())) {
      errors.push(`correct_answer "${row.correct_answer}" is not A/B/C/D`);
    }
  } else if (fmt === "numeric_entry") {
    if (row.numeric_tolerance != null && row.numeric_tolerance !== "") {
      const t =
        typeof row.numeric_tolerance === "number"
          ? row.numeric_tolerance
          : Number.parseFloat(String(row.numeric_tolerance));
      if (!Number.isFinite(t)) {
        errors.push(`numeric_tolerance "${row.numeric_tolerance}" is not numeric`);
      }
    }
  }

  if (row.import_status === "needs_review" && !row.import_flag_reason?.trim()) {
    errors.push("needs_review row missing import_flag_reason");
  }

  return { ok: errors.length === 0, errors };
}

// ── Main entry: import one question (pure DB writes) ────────

/**
 * Insert one question and its dependents into Supabase. Pure DB
 * writes — the caller is responsible for image materialization (R2
 * upload for data URLs) before calling.
 *
 * Side effects (all idempotent or scoped to this row):
 *   1. Insert quiz_questions (with content_hash_v2 + raw_question_text mirror)
 *   2. If MC: insert 4 answer_choices (with raw_choice_text mirror)
 *   3. Seed answer_key_entries from correct_answer (Phase 1)
 *   4. Mirror selected_official_answer + answer_key_status onto quiz_questions
 *   5. If image_url is set: insert one source_assets row (asset_type='figure_crop')
 *
 * Duplicate detection: relies on the (source_pdf, content_hash) UNIQUE
 * index. Postgres returns 23505 which we translate to
 * `duplicate_skipped: true` (NOT an error).
 */
export async function importQuestion(
  supabase: SupabaseClient<Database>,
  row: ImportQuestionInput
): Promise<ImportQuestionResult> {
  const validation = validateImportRow(row);
  if (!validation.ok) {
    return {
      inserted: false,
      question_id: null,
      duplicate_skipped: false,
      flagged_for_review: false,
      errors: validation.errors,
    };
  }

  const subject = subjectFromDomain(row.domain);
  const { level, legacy } = parseDifficulty(row.difficulty);
  const format = row.question_format ?? "multiple_choice";
  const question_type = subject === "reading" ? "evidence_based" : "math_computation";
  const cluster =
    (row.concept_slug && clusterFromSlug(row.concept_slug)) ||
    row.topic_cluster ||
    CLUSTER_BY_DOMAIN[row.domain] ||
    "";
  const node_id = row.concept_slug ? (nodeIdFromSlug(row.concept_slug) ?? null) : null;

  // Phase 1 publish_status: new rows land as 'draft' (or
  // 'needs_human_review' if pre-flagged). Only the publish-gate
  // promotes to publish_ready.
  const publish_status = row.import_status === "needs_review" ? "needs_human_review" : "draft";

  const hasAnyChoiceExpl =
    row.explanation_a || row.explanation_b || row.explanation_c || row.explanation_d;
  const explanation_per_choice = hasAnyChoiceExpl
    ? {
        A: row.explanation_a ?? "",
        B: row.explanation_b ?? "",
        C: row.explanation_c ?? "",
        D: row.explanation_d ?? "",
      }
    : null;

  const numeric_tolerance =
    row.numeric_tolerance != null && row.numeric_tolerance !== ""
      ? Number.parseFloat(String(row.numeric_tolerance))
      : null;
  const source_page =
    row.source_page == null || row.source_page === ""
      ? null
      : typeof row.source_page === "number"
        ? row.source_page
        : Number.parseInt(String(row.source_page), 10);

  const content_hash_v2 = computeContentHashV2({
    subject,
    domain: row.domain,
    answer_format: format,
    passage_intro: row.passage_intro,
    passage: row.passage,
    passage_a: row.passage_a,
    passage_b: row.passage_b,
    question_text: row.question_text,
    choice_a: row.choice_a,
    choice_b: row.choice_b,
    choice_c: row.choice_c,
    choice_d: row.choice_d,
  });

  // ── 1. Insert quiz_questions ──
  const insertPayload = {
    node_id,
    question_text: row.question_text,
    // v2 phase 5: raw_question_text mirrors question_text at import.
    // Phase 5 math repair may later diverge them; this column is
    // the immutable original.
    raw_question_text: row.question_text,
    question_type,
    difficulty: legacy,
    difficulty_level: level,
    answer_format: format,
    correct_answer: row.correct_answer,
    numeric_tolerance,
    explanation_text: row.explanation_text ?? "",
    explanation_per_choice,
    hint: row.hint?.trim() || null,
    subject,
    topic_cluster: cluster,
    desmos_strategy: row.desmos_strategy?.trim() || null,
    passage_intro: row.passage_intro || null,
    passage: row.passage || null,
    passage_a: row.passage_a || null,
    passage_b: row.passage_b || null,
    domain: row.domain,
    concept_slug: row.concept_slug || null,
    answer_source: row.answer_source ?? null,
    source_pdf: row.source_pdf || null,
    source_page: Number.isFinite(source_page as number) ? (source_page as number) : null,
    content_hash: row.content_hash || null,
    content_hash_v2,
    import_status: row.import_status ?? null,
    import_flag_type: row.import_flag_type ?? null,
    import_flag_reason: row.import_flag_reason || null,
    publish_status,
    image_url: row.image_url ?? null,
    image_storage_path: row.image_storage_path ?? null,
    image_alt: row.image_alt?.trim() || null,
  } as Database["public"]["Tables"]["quiz_questions"]["Insert"];

  const { data: inserted, error: qErr } = await supabase
    .from("quiz_questions")
    .insert(insertPayload)
    .select("id")
    .single();

  if (qErr) {
    // Postgres UNIQUE violation on (source_pdf, content_hash) →
    // duplicate_skipped (not an error).
    if (qErr.code === "23505" || /duplicate/i.test(qErr.message)) {
      return {
        inserted: false,
        question_id: null,
        duplicate_skipped: true,
        flagged_for_review: false,
        errors: [],
      };
    }
    return {
      inserted: false,
      question_id: null,
      duplicate_skipped: false,
      flagged_for_review: false,
      errors: [`quiz_questions insert: ${qErr.message}`],
    };
  }

  const question_id = inserted.id;
  const errors: string[] = [];

  // ── 2. Insert answer_choices (MC only) ──
  if (format === "multiple_choice") {
    const correctLetter = row.correct_answer.trim().toUpperCase();
    const choiceRows = (["A", "B", "C", "D"] as const).map((letter) => {
      const choice_text =
        letter === "A"
          ? (row.choice_a ?? "")
          : letter === "B"
            ? (row.choice_b ?? "")
            : letter === "C"
              ? (row.choice_c ?? "")
              : (row.choice_d ?? "");
      return {
        question_id,
        letter: letter as AnswerLetter,
        choice_text,
        // v2 phase 5: mirror raw_choice_text.
        raw_choice_text: choice_text,
        is_correct: letter === correctLetter,
      };
    });
    const { error: cErr } = await supabase.from("answer_choices").insert(choiceRows);
    if (cErr) errors.push(`answer_choices insert: ${cErr.message}`);
  }

  // ── 3. Seed answer_key_entries (Phase 1) ──
  const correctLetter = row.correct_answer.trim();
  if (correctLetter) {
    const { error: akeErr } = await supabase.from("answer_key_entries").insert({
      question_id,
      printed_answer: correctLetter,
      printed_answer_crossed_out: false,
      manual_correction_present: false,
      selected_official_answer: correctLetter,
      selection_reason: "phase1_seed_from_printed_correct_answer",
      status: "printed_key_used_no_correction",
    });
    // Non-fatal: a missing answer_key_entries row just means the
    // publish-gate's Phase 2 check will flag it.
    if (akeErr) errors.push(`answer_key_entries insert (non-fatal): ${akeErr.message}`);

    // ── 4. Mirror selected_official_answer + answer_key_status ──
    const { error: mirrorErr } = await supabase
      .from("quiz_questions")
      .update({
        selected_official_answer: correctLetter,
        answer_key_status: "printed_key_used_no_correction",
      })
      .eq("id", question_id);
    if (mirrorErr) errors.push(`answer_key mirror (non-fatal): ${mirrorErr.message}`);
  }

  // ── 5. Register figure as source_asset (Phase 1) ──
  if (row.image_url) {
    const { error: saErr } = await supabase.from("source_assets").insert({
      question_id,
      source_pdf: row.source_pdf || null,
      page_number: Number.isFinite(source_page as number) ? (source_page as number) : null,
      asset_type: "figure_crop",
      asset_path: row.image_storage_path || row.image_url,
      public_url: row.image_url,
      crop_complete: true,
      relevance: "required",
      use_in_solving: true,
      validation_status: "imported_from_v1",
    });
    if (saErr) errors.push(`source_assets insert (non-fatal): ${saErr.message}`);
  }

  return {
    inserted: true,
    question_id,
    duplicate_skipped: false,
    flagged_for_review: row.import_status === "needs_review",
    errors,
  };
}

// ── Batch wrapper ─────────────────────────────────────────────

/**
 * Apply importQuestion to a list. Returns the summary the legacy
 * BulkImportResult shape expects, so callers can swap to this with
 * minimal change.
 */
export async function importQuestions(
  supabase: SupabaseClient<Database>,
  rows: ImportQuestionInput[]
): Promise<ImportBatchSummary> {
  const summary: ImportBatchSummary = {
    inserted: 0,
    skipped_duplicates: 0,
    flagged_for_review: 0,
    errored: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = await importQuestion(supabase, row);
    if (result.duplicate_skipped) {
      summary.skipped_duplicates++;
      continue;
    }
    if (!result.inserted) {
      summary.errored++;
      summary.errors.push({
        row: i + 2, // +2: 1 for the CSV header row, 1 for 0→1 index conversion
        message: result.errors.join("; ") || "unknown error",
      });
      continue;
    }
    if (result.flagged_for_review) summary.flagged_for_review++;
    else summary.inserted++;
    // Non-fatal errors from answer_key_entries / source_assets get
    // recorded but don't count as errored (the question itself is in).
    if (result.errors.length > 0) {
      summary.errors.push({
        row: i + 2,
        message: `non-fatal: ${result.errors.join("; ")}`,
      });
    }
  }
  return summary;
}
