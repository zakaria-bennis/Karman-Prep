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
      <div className="rounded-xl border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] px-6 py-12 text-center text-sm text-[color:var(--mute)]">
        <FileText className="mx-auto mb-2 h-6 w-6 text-[color:var(--mute)]" />
        No PDFs uploaded yet. Upload one from{" "}
        <a
          href="/admin/questions/import"
          className="text-[color:var(--accent-text)] underline hover:text-[color:var(--accent-text)]"
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
          className="inline-flex items-center gap-1 text-[color:var(--mute)] hover:text-[color:var(--ink)]"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-[color:var(--mute)]">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-[color:var(--accent)]"
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
    <article className="rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_60%,transparent)] px-4 py-3">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--mute)]" />
        <div className="min-w-0 flex-1">
          {/* ── Title row ───────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-[color:var(--ink)]">{job.source_pdf}</span>
            <JobStatusBadge status={job.status} />
            <span className="text-[11px] text-[color:var(--mute)]">
              {new Date(job.uploaded_at).toLocaleString()}
            </span>
            {job.pdf_size_bytes != null && (
              <span className="text-[11px] text-[color:var(--mute)]">
                {(job.pdf_size_bytes / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
            {job.pdf_page_count != null && (
              <span className="text-[11px] text-[color:var(--mute)]">{job.pdf_page_count} pages</span>
            )}
            {totalImported > 0 && (
              <span className="text-[11px] text-[color:var(--good)]">{totalImported} questions imported</span>
            )}
          </div>

          {/* ── Live progress bar + stage chip ───────────────── */}
          <div className="mt-2.5">
            <div className="mb-1 flex items-center gap-2 text-[11px]">
              <StageIcon stage={stage} />
              <span className="font-medium text-[color:var(--ink)]">
                {STAGE_LABEL[stage] ?? job.progress?.stage_label ?? stage}
              </span>
              {isActive && job.started_at && <ElapsedTime startedAt={job.started_at} />}
              {job.progress?.message && (
                <span className="truncate text-[color:var(--mute)]">— {job.progress.message}</span>
              )}
              {job.progress?.updated_at && (
                <span className="ml-auto shrink-0 text-[color:var(--mute)]">
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
            <div className="mt-2 flex items-start gap-1.5 text-xs text-[color:var(--late)]">
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
    queued: { icon: Clock, className: "text-[color:var(--mute)]" },
    // v1 — old daemon
    pulled: { icon: Download, className: "text-[color:var(--mute)]" },
    processing: { icon: Sparkles, className: "text-[color:var(--accent-text)]", spin: false },
    finalizing: { icon: UploadIcon, className: "text-[color:var(--info)]" },
    ingesting: { icon: Database, className: "text-[color:var(--accent-text)]" },
    // v2 — Gemini pipeline (full 14-stage orchestrator)
    extracting: { icon: Sparkles, className: "text-[color:var(--accent-text)]" },
    figures: { icon: Sparkles, className: "text-[color:var(--info)]" },
    csv: { icon: UploadIcon, className: "text-[color:var(--info)]" },
    importing: { icon: Database, className: "text-[color:var(--accent-text)]" },
    answer_key: { icon: Download, className: "text-[color:var(--good)]" },
    crops: { icon: FileText, className: "text-[color:var(--info)]" },
    visuals: { icon: Sparkles, className: "text-[color:var(--accent-text)]" },
    figure_structure: { icon: Sparkles, className: "text-[color:var(--info)]" },
    math_repair: { icon: Sparkles, className: "text-[color:var(--warn)]" },
    fill_gate: { icon: Clock, className: "text-[color:var(--mute)]" },
    filling: { icon: Sparkles, className: "text-[color:var(--accent-text)]" },
    qa_filling: { icon: Sparkles, className: "text-[color:var(--accent-text)]" },
    grading: { icon: Sparkles, className: "text-[color:var(--warn)]" },
    auditing: { icon: AlertTriangle, className: "text-[color:var(--warn)]" },
    validating: { icon: CheckCircle2, className: "text-[color:var(--info)]" },
    publishing: { icon: UploadIcon, className: "text-[color:var(--good)]" },
    done: { icon: CheckCircle2, className: "text-[color:var(--good)]" },
    // terminal (shared)
    complete: { icon: CheckCircle2, className: "text-[color:var(--good)]" },
    failed: { icon: XCircle, className: "text-[color:var(--late)]" },
  };
  // Fallback for any stage without a bespoke icon (keeps the page from
  // crashing on an unmapped/new stage — the original bug).
  const entry = map[stage] ?? { icon: Sparkles, className: "text-[color:var(--mute)]" };
  const { icon: Icon, className } = entry;
  // Active (non-terminal, non-queued) stages get a soft pulse.
  const active =
    stage !== "queued" && stage !== "complete" && stage !== "done" && stage !== "failed";
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", className, active && "animate-pulse")} />;
}

function ProgressBar({ percent, stage }: { percent: number; stage: PdfJobStage }) {
  const barColor =
    stage === "failed"
      ? "bg-[color-mix(in_srgb,var(--late)_70%,transparent)]"
      : stage === "complete"
        ? "bg-[color-mix(in_srgb,var(--good)_70%,transparent)]"
        : stage === "queued"
          ? "bg-[color:var(--raised)]"
          : "bg-[color-mix(in_srgb,var(--accent)_70%,transparent)]";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--raised)]">
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
  return <span className="font-mono text-[color:var(--mute)]">({formatDuration(elapsedSec)})</span>;
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
    queued: { label: "Queued", className: "bg-[color:var(--raised)] text-[color:var(--ink)]", icon: Clock },
    running: { label: "Running", className: "bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[color:var(--accent-text)]", icon: Loader2 },
    partial: {
      label: "Partial",
      className: "bg-[color-mix(in_srgb,var(--warn)_20%,transparent)] text-[color:var(--warn)]",
      icon: AlertTriangle,
    },
    complete: {
      label: "Complete",
      className: "bg-[color-mix(in_srgb,var(--good)_20%,transparent)] text-[color:var(--good)]",
      icon: CheckCircle2,
    },
    failed: { label: "Failed", className: "bg-[color-mix(in_srgb,var(--late)_20%,transparent)] text-[color:var(--late)]", icon: XCircle },
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
    pending: "border-[color:var(--line)] text-[color:var(--mute)]",
    in_progress: "border-[color-mix(in_srgb,var(--accent)_50%,transparent)] text-[color:var(--accent-text)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]",
    complete: "border-[color-mix(in_srgb,var(--good)_40%,transparent)] text-[color:var(--good)] bg-[color-mix(in_srgb,var(--good)_10%,transparent)]",
    failed: "border-[color-mix(in_srgb,var(--late)_40%,transparent)] text-[color:var(--late)] bg-[color-mix(in_srgb,var(--late)_10%,transparent)]",
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
        <span className="text-[color-mix(in_srgb,var(--good)_80%,transparent)]">· {imported}</span>
      )}
    </span>
  );
}
