// ============================================================
// Selectors for /admin/pdf-pipeline/jobs and /jobs/[id].
//
// Pulls rows from pdf_processing_jobs. The list page sorts by
// uploaded_at desc (newest first); the detail page fetches a
// single row by id.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { PdfProcessingJob } from "@/types/pdf-job";

const SELECT_COLUMNS = `
  id, source_pdf, pdf_storage_path, pdf_size_bytes, pdf_page_count,
  uploaded_by_user_id, uploaded_at, status, module_status, csv_storage_paths,
  imported_counts, error_message, started_at, completed_at, progress
`.trim();

/** Most recent N jobs, newest first. */
export async function selectRecentPdfJobs(limit = 100): Promise<PdfProcessingJob[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pdf_processing_jobs")
    .select(SELECT_COLUMNS)
    .order("uploaded_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PdfProcessingJob[];
}

/** Counts for the page header — running/complete/failed split. */
export async function selectPdfJobCounts(): Promise<{
  total: number;
  running: number;
  complete: number;
  failed: number;
  queued: number;
}> {
  const supabase = createAdminClient();
  const [totalRes, runningRes, completeRes, failedRes, queuedRes] = await Promise.all([
    supabase.from("pdf_processing_jobs").select("id", { count: "exact", head: true }),
    supabase
      .from("pdf_processing_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "running"),
    supabase
      .from("pdf_processing_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "complete"),
    supabase
      .from("pdf_processing_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("pdf_processing_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued"),
  ]);
  for (const r of [totalRes, runningRes, completeRes, failedRes, queuedRes]) {
    if (r.error) throw r.error;
  }
  return {
    total: totalRes.count ?? 0,
    running: runningRes.count ?? 0,
    complete: completeRes.count ?? 0,
    failed: failedRes.count ?? 0,
    queued: queuedRes.count ?? 0,
  };
}

/** Single job by id. Returns null for not-found. */
export async function selectPdfJob(jobId: string): Promise<PdfProcessingJob | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pdf_processing_jobs")
    .select(SELECT_COLUMNS)
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as PdfProcessingJob | null;
}
