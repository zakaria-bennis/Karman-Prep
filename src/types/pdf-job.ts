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

/** Pipeline stages the runner writes into `progress`. Distinct
 *  from the top-level `status` enum: status is "queued/running/
 *  partial/complete/failed" for queue ordering; `progress.stage` is
 *  the fine-grained pipeline phase used by the UI for live tracking.
 *
 *  Two generations of stages coexist:
 *  - v1 (deprecated, dead daemon): pulled, processing, finalizing, ingesting
 *  - v2 (current, GitHub Actions Gemini pipeline): extracting, figures,
 *    csv, importing, filling, grading
 *
 *  `complete` + `failed` are shared between both. The UI renders
 *  STAGE_LABEL for whichever stage name a row carries. */
export type PdfJobStage =
  | "queued"
  // v2 — Gemini pipeline (current)
  | "extracting" // Gemini Flash → structured JSON
  | "figures" // page render + bbox + R2 upload
  | "csv" // JSON → 32-column CSV
  | "importing" // CSV → quiz_questions + answer_choices
  | "filling" // Sonnet + Haiku post-import explanations
  | "grading" // multi-vote answer-key audit
  // v1 — old Claude daemon (deprecated, present in historical rows only)
  | "pulled"
  | "processing"
  | "finalizing"
  | "ingesting"
  // terminal
  | "complete"
  | "failed"
  | "done"; // v2 alias for "complete"

export interface PdfJobProgress {
  stage: PdfJobStage;
  /** Human label for the stage, e.g. "Extracting questions". */
  stage_label?: string;
  message: string | null;
  /** Overall pipeline progress 0-100. */
  percent?: number;
  /** Progress within the current stage 0-100. */
  stage_percent?: number;
  /** Per-stage cumulative counters. */
  stats?: Record<string, number | string>;
  /** ISO timestamp of when this job was started. */
  started_at?: string | null;
  updated_at: string | null; // ISO timestamp of last stage transition
  /** GitHub Actions run id + URL when v2 pipeline ran. */
  github_run_id?: string | null;
  github_run_url?: string | null;
  /** Stage where failure happened (if status=failed). */
  error_stage?: PdfJobStage | null;
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
  // v2 — Gemini pipeline
  extracting: "Extracting questions",
  figures: "Extracting figures",
  csv: "Generating CSV",
  importing: "Writing to database",
  filling: "Generating explanations",
  grading: "Validating answer keys",
  done: "Complete",
  // v1 — old daemon (historical)
  pulled: "Downloaded",
  processing: "Claude processing",
  finalizing: "Uploading CSVs",
  ingesting: "Importing into bank",
  // terminal
  complete: "Complete",
  failed: "Failed",
};

/** Stage progression as a percentage for the v1 progress bar.
 *  v2 progress is computed by the runner and stored in
 *  progress.percent — UI prefers that when present. */
export const STAGE_PERCENT: Record<PdfJobStage, number> = {
  queued: 0,
  // v2
  extracting: 0,
  figures: 8,
  csv: 20,
  importing: 21,
  filling: 25,
  grading: 85,
  done: 100,
  // v1
  pulled: 5,
  processing: 70,
  finalizing: 90,
  ingesting: 95,
  // terminal
  complete: 100,
  failed: 100,
};
