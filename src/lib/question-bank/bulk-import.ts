// ============================================================
// bulk-import — admin-upload entry point for the question bank.
//
// As of Phase 8.1, the actual row→DB logic lives in
// src/lib/question-bank/import-core.ts. This file's responsibilities
// shrink to:
//   1. Materialize each row's image_url (data URL → R2 upload) before
//      handing the row to importQuestion. The orchestrator JSON
//      path doesn't need this (its images are already R2 URLs).
//   2. Auto-flag image-bearing rows as needs_review (admin-upload
//      heuristic — image extraction is the failure-prone step in
//      the ChatGPT-Plus / Code-Interpreter pipeline that produces
//      the admin's CSVs).
//   3. Surface the legacy BulkImportRow shape so existing callers
//      (action handlers, the cron-ingest route) keep their public
//      contract.
//
// Behavior matches the previous inline implementation — admin paths
// are NOT meant to see any change after this refactor.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/storage/r2";
import {
  importQuestion,
  type ImportBatchSummary,
  type ImportQuestionInput,
} from "@/lib/question-bank/import-core";
import type { AnswerSource, ImportFlagType, ImportStatus } from "@/types/quiz";
import { isValidDomain, type SATDomain } from "@/lib/question-bank/taxonomy";
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

export type BulkImportResult = ImportBatchSummary;

/** Per-image size cap on the bulk-import pipeline. Decoded image
 *  bytes (post base64) that exceed this throw — the surrounding
 *  catch records the row as an error and processing continues.
 *
 *  Why 2 MB: a 200 DPI page screenshot through the polish helper
 *  (KarmanGPT.txt §14) lands at ~140 KB raw; a math-heavy PDF with
 *  every question carrying a figure rarely exceeds 5 MB total CSV.
 *  A single figure at 2 MB is generous — anything larger is almost
 *  certainly an un-cropped page or accidental high-res asset.
 *
 *  Audit MED-5 (docs/question-bank-audit-2026-05-17.md). The
 *  scheduled-import route runs without a human present, so without
 *  this cap a malformed (or malicious) CSV could quietly inflate
 *  R2 storage. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** If `image_url` is a `data:image/...;base64,...` URL, decode the
 *  bytes, check the size against MAX_IMAGE_BYTES, upload to R2
 *  under a deterministic key, and return the resulting public URL
 *  plus storage path. If it's already a regular URL (https / http),
 *  return as-is with no upload. Empty/null passes through. Errors
 *  propagate to the caller, which records them in `errors[]` and
 *  continues with the next row. */
async function materializeImage(
  imageUrl: string | undefined,
  sourcePdf: string | undefined,
  contentHash: string | undefined
): Promise<{ url: string | null; storagePath: string | null }> {
  if (!imageUrl) return { url: null, storagePath: null };
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith("data:image/")) {
    return { url: trimmed, storagePath: null };
  }
  const m = trimmed.match(/^data:(image\/[\w.+-]+);base64,([\s\S]+)$/);
  if (!m) throw new Error("malformed image_url data URL");
  const mime = m[1];
  const ext = (mime.split("/")[1] || "png").replace("+xml", "").toLowerCase();
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error(
      `image too large: ${bytes.length} bytes exceeds cap of ${MAX_IMAGE_BYTES} bytes (${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB)`
    );
  }
  const sha = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const stem = (sourcePdf?.replace(/\.pdf$/i, "") || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
  const tag = (contentHash || sha).slice(0, 12);
  const key = `question-images/bulk/${stem}/${sha}-${tag}.${ext}`;
  const { publicUrl, storagePath } = await uploadToR2({
    key,
    body: bytes,
    contentType: mime,
  });
  return { url: publicUrl, storagePath };
}

/**
 * Auto-flag image-bearing rows as needs_review. This is a heuristic
 * specific to the admin-upload path (the ChatGPT-Plus pipeline that
 * produces admin CSVs is known to occasionally clip figures). The
 * orchestrator JSON path does its own image flagging via Phase 4.
 */
function autoFlagImageRows(row: BulkImportRow): BulkImportRow {
  if (!row.image_url?.trim()) return row;
  if (row.import_status === "needs_review") return row;
  const where = [
    row.source_pdf,
    row.source_page !== undefined && row.source_page !== "" ? `page ${row.source_page}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    ...row,
    import_status: "needs_review",
    import_flag_type: row.import_flag_type ?? "partial_emit",
    import_flag_reason: where
      ? `Image attached — verify the figure was extracted correctly (${where}).`
      : "Image attached — verify the figure was extracted correctly.",
  };
}

/** Pure bulk-import — no auth, no path-revalidation. Server-action
 *  callers (actionBulkImport in admin/actions.ts) wrap this with
 *  guardAdmin() and revalidatePath(); this helper does neither. */
export async function bulkImportRows(
  nodeId: string | null,
  subject: "reading" | "math" | null,
  rows: BulkImportRow[]
): Promise<BulkImportResult> {
  // The legacy nodeId parameter is no longer used as an override —
  // import-core derives node_id from concept_slug via the canonical
  // taxonomy. We accept it for API compatibility but ignore it
  // (callers that relied on it for shimmed assignment should switch
  // to setting concept_slug on the row instead).
  void nodeId;

  const supabase = createAdminClient();
  const summary: BulkImportResult = {
    inserted: 0,
    skipped_duplicates: 0,
    flagged_for_review: 0,
    errored: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const raw = autoFlagImageRows(rows[i]);

    // Subject derivation: panel-level override OR derive from domain.
    let rowSubject: "reading" | "math" | null = subject;
    if (!rowSubject) {
      if (raw.domain && isValidDomain(raw.domain)) {
        rowSubject =
          raw.domain === "info_ideas" ||
          raw.domain === "craft_structure" ||
          raw.domain === "expression_ideas" ||
          raw.domain === "conventions"
            ? "reading"
            : "math";
      } else {
        summary.errored++;
        summary.errors.push({
          row: i + 2,
          message: "row has no domain and no panel-level subject — cannot derive subject",
        });
        continue;
      }
    }
    // If subject was given but domain isn't, we still need a domain
    // for import-core to compute subject correctly. Trust the caller
    // here — but a subject-only invocation without per-row domain is
    // unusual; the audit/admin UI always sets domain per row.
    if (!raw.domain) {
      summary.errored++;
      summary.errors.push({ row: i + 2, message: "row missing domain" });
      continue;
    }

    try {
      // Materialize image FIRST (the only side effect that lives in
      // bulk-import — import-core stays pure-DB).
      const { url: image_url, storagePath: image_storage_path } = await materializeImage(
        raw.image_url,
        raw.source_pdf,
        raw.content_hash
      );

      const input: ImportQuestionInput = {
        question_text: raw.question_text,
        correct_answer: raw.correct_answer,
        domain: raw.domain as SATDomain,
        choice_a: raw.choice_a,
        choice_b: raw.choice_b,
        choice_c: raw.choice_c,
        choice_d: raw.choice_d,
        difficulty: raw.difficulty,
        question_format: raw.question_format,
        numeric_tolerance: raw.numeric_tolerance,
        source_pdf: raw.source_pdf,
        source_page: raw.source_page,
        content_hash: raw.content_hash,
        concept_slug: raw.concept_slug,
        topic_cluster: raw.topic_cluster,
        passage_intro: raw.passage_intro,
        passage: raw.passage,
        passage_a: raw.passage_a,
        passage_b: raw.passage_b,
        explanation_text: raw.explanation_text,
        explanation_a: raw.explanation_a,
        explanation_b: raw.explanation_b,
        explanation_c: raw.explanation_c,
        explanation_d: raw.explanation_d,
        desmos_strategy: raw.desmos_strategy,
        hint: raw.hint,
        answer_source: raw.answer_source,
        import_status: raw.import_status,
        import_flag_type: raw.import_flag_type,
        import_flag_reason: raw.import_flag_reason,
        image_url,
        image_storage_path,
        image_alt: raw.image_alt,
      };
      const result = await importQuestion(supabase, input);
      if (result.duplicate_skipped) {
        summary.skipped_duplicates++;
      } else if (!result.inserted) {
        summary.errored++;
        summary.errors.push({
          row: i + 2,
          message: result.errors.join("; ") || "unknown error",
        });
      } else if (result.flagged_for_review) {
        summary.flagged_for_review++;
      } else {
        summary.inserted++;
      }
    } catch (err) {
      summary.errored++;
      summary.errors.push({
        row: i + 2,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}
