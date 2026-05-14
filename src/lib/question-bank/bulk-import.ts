// ============================================================
// bulk-import — core CSV-row → quiz_questions logic.
//
// Exists as a separate helper (not a server action) so it can be
// called from non-Clerk contexts: the CRON_SECRET-authed
// /api/cron/ingest-csv-inbox route in particular. Server-action
// callers (actionBulkImport in admin/actions.ts) wrap this with
// guardAdmin() and revalidatePath(); this helper does neither.
//
// Behavior matches the previous inline implementation in actions.ts
// — the move is purely structural (extract for reuse).
// ============================================================

import {
  insertQuestion,
} from "@/lib/supabase/queries/quiz";
import type {
  AnswerLetter,
  AnswerSource,
  ImportFlagType,
  ImportStatus,
} from "@/types/quiz";
import {
  isValidSlug,
  isValidDomain,
  clusterFromSlug,
  CLUSTER_BY_DOMAIN,
  type SATDomain,
} from "@/lib/question-bank/taxonomy";
import { levelToLegacyDifficulty, type QuizDifficulty, type QuizDifficultyLevel } from "@/types/quiz";
import { uploadToR2 } from "@/lib/storage/r2";
import crypto from "node:crypto";

export interface BulkImportRow {
  question_text: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  correct_answer: string;
  difficulty: string;
  topic_cluster?: string;
  hint?: string;
  explanation_text: string;
  explanation_a?: string;
  explanation_b?: string;
  explanation_c?: string;
  explanation_d?: string;
  desmos_strategy?: string;
  passage_intro?: string;
  passage?: string;
  passage_a?: string;
  passage_b?: string;
  question_format?: "multiple_choice" | "numeric_entry";
  numeric_tolerance?: string;
  domain?: string;
  concept_slug?: string;
  answer_source?: AnswerSource;
  source_pdf?: string;
  source_page?: string | number;
  content_hash?: string;
  import_status?: ImportStatus;
  import_flag_type?: ImportFlagType;
  import_flag_reason?: string;
  /** Either a regular https URL OR a base64 data URL
   *  ("data:image/png;base64,..."). Data URLs get decoded and
   *  uploaded to R2 during import; the row's image_url is then
   *  rewritten to the resulting public URL. */
  image_url?: string;
  image_alt?: string;
}

export interface BulkImportResult {
  inserted: number;
  skipped_duplicates: number;
  flagged_for_review: number;
  errored: number;
  errors: Array<{ row: number; message: string }>;
}

const LEGACY_LEVEL_MAP = {
  foundational: 2,
  intermediate: 4,
  advanced: 5,
  mastery: 6,
} as const;

const MATH_DOMAINS = new Set<SATDomain>([
  "algebra", "advanced_math", "geometry", "data_analysis",
]);

function subjectFromDomain(domain: SATDomain): "reading" | "math" {
  return MATH_DOMAINS.has(domain) ? "math" : "reading";
}

/** If `image_url` is a `data:image/...;base64,...` URL, decode the
 *  bytes, upload to R2 under a deterministic key, and return the
 *  resulting public URL plus storage path. If it's already a regular
 *  URL (https / http), return as-is with no upload. Empty/null
 *  passes through. Errors propagate to the caller, which records
 *  them in `errors[]` and continues with the next row. */
async function materializeImage(
  imageUrl: string | undefined,
  sourcePdf: string | undefined,
  contentHash: string | undefined,
): Promise<{ url: string | null; storagePath: string | null }> {
  if (!imageUrl) return { url: null, storagePath: null };
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith("data:image/")) {
    // Already an external URL — keep as-is, no storage path.
    return { url: trimmed, storagePath: null };
  }
  // data:<mime>;base64,<payload>
  const m = trimmed.match(/^data:(image\/[\w.+-]+);base64,([\s\S]+)$/);
  if (!m) throw new Error("malformed image_url data URL");
  const mime = m[1];
  const ext = (mime.split("/")[1] || "png").replace("+xml", "").toLowerCase();
  const bytes = Buffer.from(m[2], "base64");
  // Hash the bytes so the same image (e.g. shared whole-page render
  // across questions) dedupes to one R2 object.
  const sha = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const stem = (sourcePdf?.replace(/\.pdf$/i, "") || "unknown")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  // Include content_hash in the key so re-runs with a tweaked CSV
  // overwrite cleanly while still benefiting from the sha dedup
  // across rows of the same PDF.
  const tag = (contentHash || sha).slice(0, 12);
  const key = `question-images/bulk/${stem}/${sha}-${tag}.${ext}`;
  const { publicUrl, storagePath } = await uploadToR2({
    key,
    body: bytes,
    contentType: mime,
  });
  return { url: publicUrl, storagePath };
}

function parseDifficulty(value: string | undefined): {
  level: QuizDifficultyLevel;
  legacy: QuizDifficulty;
} {
  if (!value) return { level: 4, legacy: levelToLegacyDifficulty(4) };
  const trimmed = value.trim();
  const asInt = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(asInt) && asInt >= 1 && asInt <= 7) {
    const lvl = asInt as QuizDifficultyLevel;
    return { level: lvl, legacy: levelToLegacyDifficulty(lvl) };
  }
  if (trimmed in LEGACY_LEVEL_MAP) {
    const legacy = trimmed as QuizDifficulty;
    return { level: LEGACY_LEVEL_MAP[legacy] as QuizDifficultyLevel, legacy };
  }
  return { level: 4, legacy: levelToLegacyDifficulty(4) };
}

/** Pure bulk-import — no auth, no path-revalidation. */
export async function bulkImportRows(
  nodeId: string | null,
  subject: "reading" | "math" | null,
  rows: BulkImportRow[]
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    inserted: 0,
    skipped_duplicates: 0,
    flagged_for_review: 0,
    errored: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (r.domain && !isValidDomain(r.domain)) {
        throw new Error(`unknown domain "${r.domain}"`);
      }
      if (r.concept_slug && !isValidSlug(r.concept_slug)) {
        throw new Error(`unknown concept_slug "${r.concept_slug}"`);
      }

      // ── Auto-flag every image-bearing row ────────────────
      // Image extraction is the failure-prone step in the GPT
      // pipeline (vision crops can clip, embedded extracts can
      // pick up logos). Flag every image row so it lands in
      // /admin/questions/review for a quick visual sanity check
      // before going live in Learn. If the GPT already flagged
      // for a different reason (e.g. inferred answer key), keep
      // the original reason — we just need it in the review
      // queue, not necessarily for image-specific reasons.
      if (r.image_url?.trim()) {
        if (r.import_status !== "needs_review") {
          r.import_status = "needs_review";
          r.import_flag_type = r.import_flag_type ?? "partial_emit";
          const where = [
            r.source_pdf,
            r.source_page !== undefined && r.source_page !== ""
              ? `page ${r.source_page}`
              : null,
          ].filter(Boolean).join(" · ");
          r.import_flag_reason = where
            ? `Image attached — verify the figure was extracted correctly (${where}).`
            : "Image attached — verify the figure was extracted correctly.";
        }
      }

      if (r.import_status === "needs_review" && !r.import_flag_reason?.trim()) {
        throw new Error("needs_review row missing import_flag_reason");
      }

      let rowSubject: "reading" | "math";
      if (subject) {
        rowSubject = subject;
      } else if (r.domain) {
        rowSubject = subjectFromDomain(r.domain as SATDomain);
      } else {
        throw new Error("row has no domain and no panel-level subject — cannot derive subject");
      }

      const { level, legacy } = parseDifficulty(r.difficulty);
      const format = r.question_format ?? "multiple_choice";
      const question_type =
        rowSubject === "reading" ? "evidence_based" : "math_computation";

      const cluster =
        (r.concept_slug && clusterFromSlug(r.concept_slug)) ||
        r.topic_cluster ||
        (r.domain && CLUSTER_BY_DOMAIN[r.domain as SATDomain]) ||
        "";

      const hasAnyChoiceExpl =
        r.explanation_a || r.explanation_b || r.explanation_c || r.explanation_d;
      const explanation_per_choice = hasAnyChoiceExpl
        ? {
            A: r.explanation_a,
            B: r.explanation_b,
            C: r.explanation_c,
            D: r.explanation_d,
          }
        : null;

      const choices =
        format === "multiple_choice"
          ? [
              { letter: "A" as AnswerLetter, choice_text: r.choice_a ?? "" },
              { letter: "B" as AnswerLetter, choice_text: r.choice_b ?? "" },
              { letter: "C" as AnswerLetter, choice_text: r.choice_c ?? "" },
              { letter: "D" as AnswerLetter, choice_text: r.choice_d ?? "" },
            ]
          : [];

      const numericTol =
        r.numeric_tolerance && r.numeric_tolerance.trim() !== ""
          ? Number.parseFloat(r.numeric_tolerance)
          : null;
      const sourcePage =
        r.source_page === undefined || r.source_page === ""
          ? null
          : typeof r.source_page === "number"
            ? r.source_page
            : Number.parseInt(r.source_page, 10);

      // Materialize image_url. If it's a data URL, this uploads
      // bytes to R2 and returns the new https URL + storage path.
      // If it's already https, this is a no-op pass-through.
      const { url: resolvedImageUrl, storagePath: resolvedImagePath } =
        await materializeImage(r.image_url, r.source_pdf, r.content_hash);

      const { duplicateSkipped } = await insertQuestion({
        node_id: nodeId,
        question_text: r.question_text,
        question_type,
        difficulty: legacy,
        difficulty_level: level,
        answer_format: format,
        correct_answer: r.correct_answer,
        numeric_tolerance: numericTol,
        explanation_text: r.explanation_text,
        explanation_per_choice,
        hint: r.hint?.trim() || null,
        subject: rowSubject,
        topic_cluster: cluster,
        desmos_strategy: r.desmos_strategy?.trim() || null,
        choices,
        passage_intro: r.passage_intro || null,
        passage: r.passage || null,
        passage_a: r.passage_a || null,
        passage_b: r.passage_b || null,
        domain: r.domain || null,
        concept_slug: r.concept_slug || null,
        answer_source: r.answer_source ?? null,
        source_pdf: r.source_pdf || null,
        source_page: Number.isFinite(sourcePage as number) ? (sourcePage as number) : null,
        content_hash: r.content_hash || null,
        import_status: r.import_status ?? null,
        import_flag_type: r.import_flag_type ?? null,
        import_flag_reason: r.import_flag_reason || null,
        image_url: resolvedImageUrl,
        image_storage_path: resolvedImagePath,
        image_alt: r.image_alt?.trim() || null,
      });

      if (duplicateSkipped) {
        result.skipped_duplicates++;
      } else if (r.import_status === "needs_review") {
        result.flagged_for_review++;
      } else {
        result.inserted++;
      }
    } catch (err) {
      result.errored++;
      result.errors.push({
        row: i + 2,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
