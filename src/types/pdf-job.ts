// ============================================================
// PDF processing job types — shared between admin UI, server
// actions, the upload API route, and the local CLI runner.
// ============================================================

export type PdfJobStatus = "queued" | "running" | "partial" | "complete" | "failed";

export type PdfModuleStatus = "pending" | "in_progress" | "complete" | "failed";

/** The five sub-tasks per PDF: one answer-key extraction + four
 *  module-content extractions. Mirror the SAT digital test order. */
export type PdfModuleKey = "key" | "m1" | "m2" | "m3" | "m4";

export const PDF_MODULE_KEYS: PdfModuleKey[] = ["key", "m1", "m2", "m3", "m4"];

export const PDF_MODULE_LABELS: Record<PdfModuleKey, string> = {
  key: "Answer key",
  m1: "R&W Module 1",
  m2: "R&W Module 2",
  m3: "Math Module 1",
  m4: "Math Module 2",
};

/** Pipeline stages the daemon writes into `progress` (migration 022).
 *  Distinct from the top-level `status` enum: status is "queued/running/
 *  partial/complete/failed" for queue ordering; `progress.stage` is the
 *  fine-grained pipeline phase used by the UI for live tracking. */
export type PdfJobStage =
  | "queued"
  | "pulled" // PDF downloaded to local incoming/, awaiting claude
  | "processing" // claude --print is running on the PDF
  | "finalizing" // CSVs being uploaded to R2
  | "ingesting" // CSVs being imported into quiz_questions
  | "complete"
  | "failed";

export interface PdfJobProgress {
  stage: PdfJobStage;
  message: string | null;
  updated_at: string | null; // ISO timestamp of last stage transition
}

export interface PdfProcessingJob {
  id: string;
  source_pdf: string;
  pdf_storage_path: string;
  pdf_size_bytes: number | null;
  pdf_page_count: number | null;
  uploaded_by_user_id: string;
  uploaded_at: string; // ISO timestamp
  status: PdfJobStatus;
  module_status: Record<PdfModuleKey, PdfModuleStatus>;
  csv_storage_paths: Partial<Record<PdfModuleKey, string>>;
  imported_counts: Partial<Record<PdfModuleKey, number>>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  progress: PdfJobProgress;
}

export const STAGE_LABEL: Record<PdfJobStage, string> = {
  queued: "Queued",
  pulled: "Downloaded",
  processing: "Claude processing",
  finalizing: "Uploading CSVs",
  ingesting: "Importing into bank",
  complete: "Complete",
  failed: "Failed",
};

/** Stage progression as a percentage for a progress bar.
 *  Hand-tuned to match how long each stage typically takes. */
export const STAGE_PERCENT: Record<PdfJobStage, number> = {
  queued: 0,
  pulled: 5,
  processing: 70, // the long pole — 30-90 min of Claude
  finalizing: 90,
  ingesting: 95,
  complete: 100,
  failed: 100,
};
