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
      <div className="rounded-xl border border-bronze bg-surface/40 px-6 py-12 text-center text-sm text-taupe">
        <FileText className="mx-auto mb-2 h-6 w-6 text-taupe" />
        No PDFs uploaded yet. Upload one from{" "}
        <a
          href="/admin/questions/import"
          className="text-gold-bright underline hover:text-gold-bright"
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
          className="inline-flex items-center gap-1 text-taupe hover:text-ivory"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-taupe">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-gold"
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
  // Prefer the runner-computed overall percent (v2 jobs always set it);
  // fall back to the static per-stage map, then 0 for any unknown stage.
  const stagePercent = job.progress?.percent ?? STAGE_PERCENT[stage] ?? 0;
  const isActive =
    stage !== "complete" && stage !== "failed" && stage !== "queued" && stage !== "done";

  return (
    <article className="rounded-lg border border-bronze bg-surface/60 px-4 py-3">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-taupe" />
        <div className="min-w-0 flex-1">
          {/* ── Title row ───────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-ivory">{job.source_pdf}</span>
            <JobStatusBadge status={job.status} />
            <span className="text-[11px] text-taupe">
              {new Date(job.uploaded_at).toLocaleString()}
            </span>
            {job.pdf_size_bytes != null && (
              <span className="text-[11px] text-taupe">
                {(job.pdf_size_bytes / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
            {job.pdf_page_count != null && (
              <span className="text-[11px] text-taupe">{job.pdf_page_count} pages</span>
            )}
            {totalImported > 0 && (
              <span className="text-[11px] text-success">{totalImported} questions imported</span>
            )}
          </div>

          {/* ── Live progress bar + stage chip ───────────────── */}
          <div className="mt-2.5">
            <div className="mb-1 flex items-center gap-2 text-[11px]">
              <StageIcon stage={stage} />
              <span className="font-medium text-ivory">
                {STAGE_LABEL[stage] ?? job.progress?.stage_label ?? stage}
              </span>
              {isActive && job.started_at && <ElapsedTime startedAt={job.started_at} />}
              {job.progress?.message && (
                <span className="truncate text-taupe">— {job.progress.message}</span>
              )}
              {job.progress?.updated_at && (
                <span className="ml-auto shrink-0 text-taupe">
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
            <div className="mt-2 flex items-start gap-1.5 text-xs text-error-bright">
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
  // Map covers BOTH v1 (legacy daemon) and v2 (Gemini pipeline)
  // stages so this legacy /admin/jobs view renders both row
  // generations without crashing. The newer /admin/pdf-pipeline/
  // jobs/[id] view is the preferred surface for v2 jobs.
  // Partial — only the stages we give bespoke icons. Any stage not listed
  // (incl. newer v2 orchestrator stages + future ones) falls back below
  // instead of crashing the page on an undefined destructure.
  const map: Partial<
    Record<
      PdfJobStage,
      { icon: React.ComponentType<{ className?: string }>; className: string; spin?: boolean }
    >
  > = {
    queued: { icon: Clock, className: "text-taupe" },
    // v1 — old daemon
    pulled: { icon: Download, className: "text-taupe" },
    processing: { icon: Sparkles, className: "text-gold", spin: false },
    finalizing: { icon: UploadIcon, className: "text-info" },
    ingesting: { icon: Database, className: "text-gold" },
    // v2 — Gemini pipeline (full 14-stage orchestrator)
    extracting: { icon: Sparkles, className: "text-gold" },
    figures: { icon: Sparkles, className: "text-info" },
    csv: { icon: UploadIcon, className: "text-info" },
    importing: { icon: Database, className: "text-gold" },
    answer_key: { icon: Download, className: "text-success" },
    crops: { icon: FileText, className: "text-info" },
    visuals: { icon: Sparkles, className: "text-gold" },
    figure_structure: { icon: Sparkles, className: "text-info" },
    math_repair: { icon: Sparkles, className: "text-warning" },
    fill_gate: { icon: Clock, className: "text-taupe" },
    filling: { icon: Sparkles, className: "text-gold" },
    qa_filling: { icon: Sparkles, className: "text-gold" },
    grading: { icon: Sparkles, className: "text-warning" },
    auditing: { icon: AlertTriangle, className: "text-warning" },
    validating: { icon: CheckCircle2, className: "text-info" },
    publishing: { icon: UploadIcon, className: "text-success" },
    done: { icon: CheckCircle2, className: "text-success" },
    // terminal (shared)
    complete: { icon: CheckCircle2, className: "text-success" },
    failed: { icon: XCircle, className: "text-error" },
  };
  // Fallback for any stage without a bespoke icon (keeps the page from
  // crashing on an unmapped/new stage — the original bug).
  const entry = map[stage] ?? { icon: Sparkles, className: "text-taupe" };
  const { icon: Icon, className } = entry;
  // Active (non-terminal, non-queued) stages get a soft pulse.
  const active =
    stage !== "queued" && stage !== "complete" && stage !== "done" && stage !== "failed";
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", className, active && "animate-pulse")} />;
}

function ProgressBar({ percent, stage }: { percent: number; stage: PdfJobStage }) {
  const barColor =
    stage === "failed"
      ? "bg-error/70"
      : stage === "complete"
        ? "bg-success/70"
        : stage === "queued"
          ? "bg-surface-raised"
          : "bg-gold/70";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
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
  return <span className="font-mono text-taupe">({formatDuration(elapsedSec)})</span>;
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
    queued: { label: "Queued", className: "bg-surface-raised text-ivory", icon: Clock },
    running: { label: "Running", className: "bg-gold/20 text-gold-bright", icon: Loader2 },
    partial: {
      label: "Partial",
      className: "bg-warning/20 text-warning-bright",
      icon: AlertTriangle,
    },
    complete: {
      label: "Complete",
      className: "bg-success/20 text-success-bright",
      icon: CheckCircle2,
    },
    failed: { label: "Failed", className: "bg-error/20 text-error-bright", icon: XCircle },
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
    pending: "border-bronze text-taupe",
    in_progress: "border-gold/50 text-gold-bright bg-gold/10",
    complete: "border-success/40 text-success-bright bg-success/10",
    failed: "border-error/40 text-error-bright bg-error/10",
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
        <span className="text-success/80">· {imported}</span>
      )}
    </span>
  );
}
