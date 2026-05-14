"use client";

// ============================================================
// JobsClient — renders the PDF-job table with auto-refresh.
//
// Polls /admin/jobs (via router.refresh) every 10s while the
// page is open so admins see status changes pushed by the local
// runner without a manual refresh.
// ============================================================

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Download,
  Sparkles,
  Upload as UploadIcon,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PDF_MODULE_KEYS,
  PDF_MODULE_LABELS,
  STAGE_LABEL,
  STAGE_PERCENT,
  type PdfJobStatus,
  type PdfJobStage,
  type PdfModuleStatus,
  type PdfModuleKey,
  type PdfProcessingJob,
} from "@/types/pdf-job";

const REFRESH_INTERVAL_MS = 10_000;
// Heartbeat for the elapsed-time display so it ticks live without
// hitting the server every second. Re-renders are essentially free.
const ELAPSED_TICK_MS = 1_000;

export default function JobsClient({ initialJobs }: { initialJobs: PdfProcessingJob[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh while there are non-terminal jobs to watch.
  const hasActiveJobs = initialJobs.some((j) => j.status === "queued" || j.status === "running");

  useEffect(() => {
    if (!autoRefresh || !hasActiveJobs) return;
    const t = setInterval(() => {
      startTransition(() => router.refresh());
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [autoRefresh, hasActiveJobs, router]);

  if (initialJobs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-500">
        <FileText className="mx-auto mb-2 h-6 w-6 text-slate-600" />
        No PDFs uploaded yet. Upload one from{" "}
        <a
          href="/admin/questions/import"
          className="text-indigo-300 underline hover:text-indigo-200"
        >
          /admin/questions/import
        </a>
        .
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-3 text-xs">
        <button
          onClick={() => startTransition(() => router.refresh())}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-slate-500">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-indigo-500"
          />
          Auto-refresh while jobs are running
        </label>
      </div>

      {/* Job rows */}
      <div className="space-y-2">
        {initialJobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>
    </>
  );
}

function JobRow({ job }: { job: PdfProcessingJob }) {
  const totalImported = Object.values(job.imported_counts).reduce((sum, n) => sum + (n ?? 0), 0);
  // Derive the visible stage. `progress` arrives populated for jobs
  // run by the new daemon; older rows fall back to the status enum.
  const stage = deriveStage(job);
  const stagePercent = STAGE_PERCENT[stage];
  const isActive = stage !== "complete" && stage !== "failed" && stage !== "queued";

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <div className="min-w-0 flex-1">
          {/* ── Title row ───────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-100">{job.source_pdf}</span>
            <JobStatusBadge status={job.status} />
            <span className="text-[11px] text-slate-500">
              {new Date(job.uploaded_at).toLocaleString()}
            </span>
            {job.pdf_size_bytes != null && (
              <span className="text-[11px] text-slate-500">
                {(job.pdf_size_bytes / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
            {job.pdf_page_count != null && (
              <span className="text-[11px] text-slate-500">{job.pdf_page_count} pages</span>
            )}
            {totalImported > 0 && (
              <span className="text-[11px] text-emerald-400">
                {totalImported} questions imported
              </span>
            )}
          </div>

          {/* ── Live progress bar + stage chip ───────────────── */}
          <div className="mt-2.5">
            <div className="mb-1 flex items-center gap-2 text-[11px]">
              <StageIcon stage={stage} />
              <span className="font-medium text-slate-300">{STAGE_LABEL[stage]}</span>
              {isActive && job.started_at && <ElapsedTime startedAt={job.started_at} />}
              {job.progress?.message && (
                <span className="truncate text-slate-500">— {job.progress.message}</span>
              )}
              {job.progress?.updated_at && (
                <span className="ml-auto shrink-0 text-slate-600">
                  updated {timeAgo(job.progress.updated_at)}
                </span>
              )}
            </div>
            <ProgressBar percent={stagePercent} stage={stage} />
          </div>

          {/* ── Per-module pills (collapsed by default for now;
                useful when Hybrid-Full multi-session lands) ──── */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PDF_MODULE_KEYS.map((m) => (
              <ModulePill
                key={m}
                label={PDF_MODULE_LABELS[m]}
                status={job.module_status[m] ?? "pending"}
                imported={job.imported_counts[m]}
              />
            ))}
          </div>

          {job.error_message && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-rose-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {job.error_message}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/** Map (status, progress.stage) → the stage we display. Falls back
 *  cleanly for rows written by the old daemon that don't have a
 *  populated `progress` blob. */
function deriveStage(job: PdfProcessingJob): PdfJobStage {
  const fromProgress = job.progress?.stage;
  if (fromProgress) return fromProgress;
  // Legacy fallback: derive from status + module_status.
  if (job.status === "complete") return "complete";
  if (job.status === "failed") return "failed";
  if (job.status === "queued") return "queued";
  // status === "running" or "partial" — best guess
  if (job.csv_storage_paths && Object.keys(job.csv_storage_paths).length > 0) {
    return "ingesting";
  }
  if (job.module_status?.key === "in_progress") return "processing";
  return "pulled";
}

function StageIcon({ stage }: { stage: PdfJobStage }) {
  const map: Record<
    PdfJobStage,
    { icon: React.ComponentType<{ className?: string }>; className: string; spin?: boolean }
  > = {
    queued: { icon: Clock, className: "text-slate-500" },
    pulled: { icon: Download, className: "text-slate-400" },
    processing: { icon: Sparkles, className: "text-indigo-400", spin: false },
    finalizing: { icon: UploadIcon, className: "text-sky-400" },
    ingesting: { icon: Database, className: "text-violet-400" },
    complete: { icon: CheckCircle2, className: "text-emerald-400" },
    failed: { icon: XCircle, className: "text-rose-400" },
  };
  const entry = map[stage];
  const { icon: Icon, className } = entry;
  // Active stages get a soft pulse so the eye catches motion at a glance.
  const active = stage === "processing" || stage === "finalizing" || stage === "ingesting";
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", className, active && "animate-pulse")} />;
}

function ProgressBar({ percent, stage }: { percent: number; stage: PdfJobStage }) {
  const barColor =
    stage === "failed"
      ? "bg-rose-500/70"
      : stage === "complete"
        ? "bg-emerald-500/70"
        : stage === "queued"
          ? "bg-slate-700"
          : "bg-indigo-500/70";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className={cn("h-full transition-all duration-700 ease-out", barColor)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** Live-ticking elapsed-time chip ("running for 12m 34s"). */
function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS);
    return () => clearInterval(t);
  }, []);
  const elapsedSec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return <span className="font-mono text-slate-500">({formatDuration(elapsedSec)})</span>;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
}

function timeAgo(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function JobStatusBadge({ status }: { status: PdfJobStatus }) {
  const map: Record<
    PdfJobStatus,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    queued: { label: "Queued", className: "bg-slate-800 text-slate-300", icon: Clock },
    running: { label: "Running", className: "bg-indigo-500/20 text-indigo-200", icon: Loader2 },
    partial: { label: "Partial", className: "bg-amber-500/20 text-amber-200", icon: AlertTriangle },
    complete: {
      label: "Complete",
      className: "bg-emerald-500/20 text-emerald-200",
      icon: CheckCircle2,
    },
    failed: { label: "Failed", className: "bg-rose-500/20 text-rose-200", icon: XCircle },
  };
  const { label, className, icon: Icon } = map[status];
  const isAnimated = status === "running";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold",
        className
      )}
    >
      <Icon className={cn("h-3 w-3", isAnimated && "animate-spin")} /> {label}
    </span>
  );
}

function ModulePill({
  label,
  status,
  imported,
}: {
  label: string;
  status: PdfModuleStatus;
  imported?: number;
}) {
  const cls = {
    pending: "border-slate-700 text-slate-500",
    in_progress: "border-indigo-500/50 text-indigo-200 bg-indigo-500/10",
    complete: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
    failed: "border-rose-500/40 text-rose-200 bg-rose-500/10",
  }[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium",
        cls
      )}
    >
      {label}
      {imported != null && status === "complete" && (
        <span className="text-emerald-400/80">· {imported}</span>
      )}
    </span>
  );
}
