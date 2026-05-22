"use client";

// ============================================================
// JobDetailClient — live status for one pdf_processing_jobs row.
// Polls /api/admin/pdf-pipeline/jobs/[id] every 3 seconds while
// status is queued or running. Stops polling once status is
// complete/failed.
//
// Why polling vs Supabase Realtime: polling works without any
// websocket setup, survives connection drops gracefully, and the
// volume here is tiny (one admin watching one job at a time).
// Easy to swap to realtime later if needed.
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  FileText,
  Database,
  Sparkles,
  Image as ImageIcon,
  FileSearch,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { PdfProcessingJob } from "@/types/pdf-job";
import { STAGE_LABEL } from "@/types/pdf-job";

// ── Pipeline stage definitions for the v2 (Gemini) flow ──
//   Order matters: rendered top-to-bottom as a vertical checklist.
const V2_STAGES = [
  { key: "extracting", icon: FileSearch, label: "Extract questions" },
  { key: "figures", icon: ImageIcon, label: "Crop figures" },
  { key: "csv", icon: FileText, label: "Generate CSV" },
  { key: "importing", icon: Database, label: "Write to database" },
  { key: "filling", icon: Sparkles, label: "Generate explanations" },
  { key: "grading", icon: CheckCircle2, label: "Validate answer keys" },
] as const;

const V2_STAGE_ORDER = V2_STAGES.map((s) => s.key) as readonly string[];

function stageStatus(
  rowStage: string,
  rowStatus: string,
  targetStage: string
): "pending" | "active" | "complete" | "failed" {
  if (rowStatus === "failed" && rowStage === targetStage) return "failed";
  if (rowStatus === "complete" || rowStage === "done") return "complete";
  const rowIdx = V2_STAGE_ORDER.indexOf(rowStage);
  const tgtIdx = V2_STAGE_ORDER.indexOf(targetStage);
  if (rowIdx < 0) return "pending";
  if (tgtIdx < rowIdx) return "complete";
  if (tgtIdx === rowIdx) return "active";
  return "pending";
}

function StageRow({
  stage,
  rowStage,
  rowStatus,
  job,
}: {
  stage: (typeof V2_STAGES)[number];
  rowStage: string;
  rowStatus: string;
  job: PdfProcessingJob;
}) {
  const s = stageStatus(rowStage, rowStatus, stage.key);
  const Icon = stage.icon;
  const tone =
    s === "complete"
      ? "border-emerald-700 bg-emerald-950/30 text-emerald-300"
      : s === "active"
        ? "border-indigo-700 bg-indigo-950/30 text-indigo-200"
        : s === "failed"
          ? "border-rose-700 bg-rose-950/30 text-rose-200"
          : "border-slate-800 bg-slate-900/30 text-slate-500";
  const dot =
    s === "complete" ? (
      <CheckCircle2 className="h-4 w-4" />
    ) : s === "active" ? (
      <Activity className="h-4 w-4 animate-pulse" />
    ) : s === "failed" ? (
      <XCircle className="h-4 w-4" />
    ) : (
      <Clock className="h-4 w-4" />
    );

  // Stats lookup based on stage.
  let detail: string | null = null;
  const stats = job.progress?.stats ?? {};
  if (stage.key === "extracting" && typeof stats.questions_extracted === "number") {
    detail = `${stats.questions_extracted} questions`;
  }
  if (stage.key === "figures" && typeof stats.figures_extracted === "number") {
    detail = `${stats.figures_extracted} figures`;
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${tone}`}>
      <div className="border-current/30 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border">
        {dot}
      </div>
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <div className="flex-1 text-sm font-medium">{stage.label}</div>
      {detail && <div className="text-xs tabular-nums opacity-80">{detail}</div>}
      {s === "active" && job.progress?.message && (
        <div className="hidden text-xs italic opacity-70 sm:block">{job.progress.message}</div>
      )}
    </div>
  );
}

export default function JobDetailClient({ initialJob }: { initialJob: PdfProcessingJob }) {
  const [job, setJob] = useState<PdfProcessingJob>(initialJob);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!polling) return;
    if (job.status === "complete" || job.status === "failed") {
      setPolling(false);
      return;
    }
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/pdf-pipeline/jobs/${job.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const fresh = await res.json();
        if (fresh?.job) setJob(fresh.job);
      } catch {
        /* swallow — next tick will retry */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [polling, job.id, job.status]);

  const percent = job.progress?.percent ?? 0;
  const rowStage = job.progress?.stage ?? "queued";

  return (
    <div className="space-y-5">
      {/* Top: status badge + progress bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                job.status === "complete"
                  ? "border-emerald-800 bg-emerald-950/40 text-emerald-200"
                  : job.status === "failed"
                    ? "border-rose-800 bg-rose-950/40 text-rose-200"
                    : "border-indigo-800 bg-indigo-950/40 text-indigo-200"
              }`}
            >
              {job.status === "complete" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : job.status === "failed" ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <Activity className="h-3.5 w-3.5 animate-pulse" />
              )}
              {job.status}
            </span>
            <span className="text-xs text-slate-400">{STAGE_LABEL[rowStage] ?? rowStage}</span>
          </div>
          <div className="text-xl font-bold tabular-nums text-white">{percent}%</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all duration-500 ${
              job.status === "failed"
                ? "bg-rose-500"
                : job.status === "complete"
                  ? "bg-emerald-500"
                  : "bg-indigo-500"
            }`}
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          />
        </div>
        {job.progress?.message && (
          <div className="mt-2 text-xs text-slate-400">{job.progress.message}</div>
        )}
      </div>

      {/* Error panel */}
      {job.status === "failed" && job.error_message && (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" /> Failed at stage:{" "}
            <code className="rounded bg-rose-950 px-1.5 py-0.5 text-xs">
              {job.progress?.error_stage ?? job.progress?.stage ?? "unknown"}
            </code>
          </div>
          <div className="whitespace-pre-wrap font-mono text-xs text-rose-100/90">
            {job.error_message}
          </div>
          {job.progress?.github_run_url && (
            <a
              href={job.progress.github_run_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rose-300 hover:text-rose-100"
            >
              View full logs on GitHub Actions <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Pipeline stage checklist */}
      <div className="space-y-2">
        {V2_STAGES.map((s) => (
          <StageRow key={s.key} stage={s} rowStage={rowStage} rowStatus={job.status} job={job} />
        ))}
      </div>

      {/* Footer: result links when complete */}
      {job.status === "complete" && (
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> Pipeline complete
          </div>
          <div className="space-y-1 text-xs text-emerald-100/90">
            {typeof job.progress?.stats?.questions_extracted === "number" && (
              <div>
                {job.progress.stats.questions_extracted} questions extracted,{" "}
                {job.progress?.stats?.figures_extracted ?? 0} figures.
              </div>
            )}
            <Link
              href={`/admin/questions/review?source_pdf=${encodeURIComponent(job.source_pdf)}`}
              className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-emerald-100"
            >
              View extracted questions in review queue →
            </Link>
          </div>
        </div>
      )}

      {/* Footer: live run link */}
      {polling && job.progress?.github_run_url && (
        <div className="text-center text-xs text-slate-500">
          <a
            href={job.progress.github_run_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-slate-300"
          >
            Watching GitHub Actions run <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
