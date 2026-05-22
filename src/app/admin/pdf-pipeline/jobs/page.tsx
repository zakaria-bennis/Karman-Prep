// ============================================================
// /admin/pdf-pipeline/jobs — list of all PDF processing jobs.
// Pulls from pdf_processing_jobs, newest first.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Upload, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { selectRecentPdfJobs, selectPdfJobCounts } from "@/lib/supabase/queries/pdf-jobs";
import { STAGE_LABEL } from "@/types/pdf-job";

export const metadata: Metadata = { title: "Admin — PDF jobs | Karman" };
export const dynamic = "force-dynamic";

const STATUS_TONE = {
  queued: "border-slate-700 bg-slate-800/40 text-slate-300",
  running: "border-indigo-700 bg-indigo-950/40 text-indigo-200",
  partial: "border-amber-800 bg-amber-950/40 text-amber-200",
  complete: "border-emerald-800 bg-emerald-950/40 text-emerald-200",
  failed: "border-rose-800 bg-rose-950/40 text-rose-200",
} as const;

function statusIcon(status: string) {
  if (status === "complete") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5" />;
  if (status === "running") return <Activity className="h-3.5 w-3.5 animate-pulse" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function formatBytes(b: number | null): string {
  if (!b) return "—";
  const mb = b / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const min = ms / 60_000;
  if (min < 1) return "just now";
  if (min < 60) return `${Math.floor(min)}m ago`;
  const hr = min / 60;
  if (hr < 24) return `${Math.floor(hr)}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default async function PdfJobsPage() {
  const [jobs, counts] = await Promise.all([selectRecentPdfJobs(50), selectPdfJobCounts()]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/curriculum"
            className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
          >
            <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
          </Link>
          <h1 className="text-2xl font-bold text-white">PDF processing jobs</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every PDF uploaded for the automated pipeline. Click a row for live progress.
          </p>
        </div>
        <Link
          href="/admin/questions/import"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Upload className="h-4 w-4" /> Upload PDF
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["queued", counts.queued],
            ["running", counts.running],
            ["complete", counts.complete],
            ["failed", counts.failed],
            ["total", counts.total],
          ] as const
        ).map(([k, n]) => (
          <div key={k} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{k}</div>
            <div className="text-lg font-bold text-white">{n}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-800 bg-slate-950/40 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">PDF</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Stage</th>
              <th className="px-4 py-2 font-medium">Progress</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No PDF jobs yet. Upload one at{" "}
                  <Link
                    href="/admin/questions/import"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    /admin/questions/import
                  </Link>
                  .
                </td>
              </tr>
            )}
            {jobs.map((job) => {
              const tone =
                STATUS_TONE[job.status as keyof typeof STATUS_TONE] ?? STATUS_TONE.queued;
              const stage = job.progress?.stage ?? "queued";
              const stageLabel = job.progress?.stage_label ?? STAGE_LABEL[stage] ?? stage;
              const percent = job.progress?.percent ?? 0;
              return (
                <tr
                  key={job.id}
                  className="border-b border-slate-900 last:border-b-0 hover:bg-slate-900/60"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/pdf-pipeline/jobs/${job.id}`}
                      className="font-medium text-slate-200 hover:text-white"
                    >
                      {job.source_pdf}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}
                    >
                      {statusIcon(job.status)}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{stageLabel}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            job.status === "failed"
                              ? "bg-rose-500"
                              : job.status === "complete"
                                ? "bg-emerald-500"
                                : "bg-indigo-500"
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-slate-400">{percent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {formatBytes(job.pdf_size_bytes)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {formatAgo(job.uploaded_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
