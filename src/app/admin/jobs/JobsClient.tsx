"use client";

// ============================================================
// JobsClient — the PDF-job table with status tabs, a file-name
// search and auto-refresh.
//
// Polls /admin/jobs (via router.refresh) every 10s while the
// page is open so admins see status changes pushed by the local
// runner without a manual refresh.
// ============================================================

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WbPill, WbTable, formatDateTime, type Tone } from "@/components/admin/workbench";
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

type StatusFilter = "all" | "active" | "failed" | "complete";

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Queued or running" },
  { value: "failed", label: "Failed" },
  { value: "complete", label: "Complete" },
];

function matchesFilter(job: PdfProcessingJob, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return job.status === "queued" || job.status === "running";
  if (filter === "failed") return job.status === "failed" || job.status === "partial";
  return job.status === "complete";
}

export default function JobsClient({ initialJobs }: { initialJobs: PdfProcessingJob[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

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
      <div className="wb-empty">
        <b>No PDFs uploaded yet.</b>
        Upload one from <Link href="/admin/questions/import">the import page</Link>.
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const searched = q
    ? initialJobs.filter((j) => j.source_pdf.toLowerCase().includes(q))
    : initialJobs;
  const shown = searched.filter((j) => matchesFilter(j, filter));
  const clearAll = () => {
    setQuery("");
    setFilter("all");
  };

  return (
    <>
      <div className="wb-toolbar">
        <div className="wb-tabs" role="group" aria-label="Job status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className="wb-tab"
              aria-pressed={filter === f.value}
              aria-current={filter === f.value ? "page" : undefined}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              <small>{searched.filter((j) => matchesFilter(j, f.value)).length}</small>
            </button>
          ))}
        </div>
        <div className="wb-search" role="search">
          <input
            className="wb-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="File name"
            aria-label="Search by file name"
          />
        </div>
        <button
          type="button"
          className="wb-btn"
          onClick={() => startTransition(() => router.refresh())}
        >
          Refresh
        </button>
        <label className="wb-note" style={{ display: "inline-flex", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          Auto-refresh while jobs are running
        </label>
      </div>

      <WbTable<PdfProcessingJob>
        caption="PDF processing jobs"
        rows={shown}
        rowKey={(j) => j.id}
        empty={
          <>
            <b>No job matches.</b>
            <button type="button" className="wb-btn" onClick={clearAll}>
              {q ? "Clear the search" : "Clear filters"}
            </button>
          </>
        }
        columns={[
          { key: "file", label: "File", cell: (j) => <FileCell job={j} /> },
          { key: "status", label: "Status", cell: (j) => <JobStatusPill status={j.status} /> },
          { key: "stage", label: "Stage", cell: (j) => <StageCell job={j} /> },
          { key: "modules", label: "Modules", cell: (j) => <ModuleList job={j} /> },
          {
            key: "imported",
            label: "Imported",
            numeric: true,
            cell: (j) => totalImported(j).toLocaleString("en-US"),
          },
        ]}
      />
    </>
  );
}

function totalImported(job: PdfProcessingJob): number {
  return Object.values(job.imported_counts ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);
}

function FileCell({ job }: { job: PdfProcessingJob }) {
  const meta = [
    formatDateTime(job.uploaded_at),
    job.pdf_size_bytes != null ? `${(job.pdf_size_bytes / 1024 / 1024).toFixed(1)} MB` : null,
    job.pdf_page_count != null ? `${job.pdf_page_count} pages` : null,
  ].filter(Boolean);
  return (
    <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
      <span style={{ fontWeight: 600 }}>{job.source_pdf}</span>
      <small>{meta.join(" · ")}</small>
      {job.error_message && (
        <small role="alert" style={{ color: "var(--late)" }}>
          {job.error_message}
        </small>
      )}
    </span>
  );
}

function StageCell({ job }: { job: PdfProcessingJob }) {
  // Derive the visible stage. `progress` arrives populated for jobs
  // run by the new daemon; older rows fall back to the status enum.
  const stage = deriveStage(job);
  // Prefer the runner-computed overall percent (v2 jobs always set it);
  // fall back to the static per-stage map, then 0 for any unknown stage.
  const stagePercent = job.progress?.percent ?? STAGE_PERCENT[stage] ?? 0;
  const isActive =
    stage !== "complete" && stage !== "failed" && stage !== "queued" && stage !== "done";
  return (
    <span style={{ display: "block", minWidth: 0, flex: "1 1 auto", textAlign: "left" }}>
      <span style={{ fontWeight: 600 }}>
        {STAGE_LABEL[stage] ?? job.progress?.stage_label ?? stage}
      </span>
      {isActive && job.started_at && (
        <>
          {" "}
          <ElapsedTime startedAt={job.started_at} />
        </>
      )}
      {job.progress?.message && <small>{job.progress.message}</small>}
      <ProgressBar percent={stagePercent} stage={stage} />
      {job.progress?.updated_at && <small>Updated {timeAgo(job.progress.updated_at)}</small>}
    </span>
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

function ProgressBar({ percent, stage }: { percent: number; stage: PdfJobStage }) {
  const bar =
    stage === "failed"
      ? "var(--late)"
      : stage === "complete" || stage === "done"
        ? "var(--good)"
        : stage === "queued"
          ? "var(--line)"
          : "var(--accent)";
  return (
    <span
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progress"
      style={{
        display: "block",
        height: 6,
        margin: "6px 0 2px",
        borderRadius: 4,
        overflow: "hidden",
        background: "var(--sunk, var(--line))",
      }}
    >
      <span
        style={{
          display: "block",
          height: "100%",
          width: `${percent}%`,
          background: bar,
          transition: "width 700ms ease-out",
        }}
      />
    </span>
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
  return <span style={{ color: "var(--mute)" }}>({formatDuration(elapsedSec)})</span>;
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

const STATUS_PILL: Record<PdfJobStatus, { label: string; tone: Tone }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "info" },
  partial: { label: "Partial", tone: "warn" },
  complete: { label: "Complete", tone: "ok" },
  failed: { label: "Failed", tone: "fail" },
};

function JobStatusPill({ status }: { status: PdfJobStatus }) {
  const entry = STATUS_PILL[status] ?? { label: status, tone: "neutral" as Tone };
  return <WbPill tone={entry.tone}>{entry.label}</WbPill>;
}

const MODULE_TONE: Record<PdfModuleStatus, Tone> = {
  pending: "neutral",
  in_progress: "info",
  complete: "ok",
  failed: "fail",
};

function ModuleList({ job }: { job: PdfProcessingJob }) {
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
      {PDF_MODULE_KEYS.map((m) => {
        const status = job.module_status?.[m] ?? "pending";
        const imported = job.imported_counts?.[m];
        return (
          <WbPill key={m} tone={MODULE_TONE[status] ?? "neutral"}>
            {PDF_MODULE_LABELS[m]}
            {imported != null && status === "complete" && ` · ${imported}`}
          </WbPill>
        );
      })}
    </span>
  );
}
