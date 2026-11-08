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
import { WbPill, WbSection, WbTable, type Tone } from "@/components/admin/workbench";
import type { PdfProcessingJob } from "@/types/pdf-job";
import { STAGE_LABEL } from "@/types/pdf-job";

// ── Pipeline stage definitions for the v2 (Gemini) flow ──
//   Order matters: rendered top-to-bottom as a checklist.
const V2_STAGES = [
  { key: "extracting", label: "Extract questions" },
  { key: "figures", label: "Crop figures" },
  { key: "csv", label: "Generate CSV" },
  { key: "importing", label: "Write to database" },
  { key: "filling", label: "Generate explanations" },
  { key: "grading", label: "Validate answer keys" },
] as const;

type Stage = (typeof V2_STAGES)[number];

const V2_STAGE_ORDER = V2_STAGES.map((s) => s.key) as readonly string[];

type StageState = "pending" | "active" | "complete" | "failed";

function stageStatus(rowStage: string, rowStatus: string, targetStage: string): StageState {
  if (rowStatus === "failed" && rowStage === targetStage) return "failed";
  if (rowStatus === "complete" || rowStage === "done") return "complete";
  const rowIdx = V2_STAGE_ORDER.indexOf(rowStage);
  const tgtIdx = V2_STAGE_ORDER.indexOf(targetStage);
  if (rowIdx < 0) return "pending";
  if (tgtIdx < rowIdx) return "complete";
  if (tgtIdx === rowIdx) return "active";
  return "pending";
}

const STAGE_PILL: Record<StageState, { label: string; tone: Tone }> = {
  pending: { label: "Waiting", tone: "neutral" },
  active: { label: "Running", tone: "info" },
  complete: { label: "Done", tone: "ok" },
  failed: { label: "Failed", tone: "fail" },
};

function stageDetail(stage: Stage, s: StageState, job: PdfProcessingJob): string | null {
  const stats = job.progress?.stats ?? {};
  const parts: string[] = [];
  if (stage.key === "extracting" && typeof stats.questions_extracted === "number") {
    parts.push(`${stats.questions_extracted} questions`);
  }
  if (stage.key === "figures" && typeof stats.figures_extracted === "number") {
    parts.push(`${stats.figures_extracted} figures`);
  }
  if (s === "active" && job.progress?.message) parts.push(job.progress.message);
  return parts.length ? parts.join(" · ") : null;
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
  const statusTone: Tone =
    job.status === "complete" ? "ok" : job.status === "failed" ? "fail" : "info";
  const bar =
    job.status === "failed"
      ? "var(--late)"
      : job.status === "complete"
        ? "var(--good)"
        : "var(--accent)";

  return (
    <>
      {/* Top: status pill + progress bar */}
      <WbSection title="Progress">
        <div className="wb-toolbar" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <WbPill tone={statusTone}>{job.status}</WbPill>
            <span className="wb-note">{STAGE_LABEL[rowStage] ?? rowStage}</span>
          </span>
          <b style={{ fontSize: "1.25rem" }}>{percent}%</b>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Job progress"
          style={{
            height: 8,
            marginTop: 10,
            borderRadius: 4,
            overflow: "hidden",
            background: "var(--sunk, var(--line))",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(0, Math.min(100, percent))}%`,
              background: bar,
              transition: "width 500ms",
            }}
          />
        </div>
        {job.progress?.message && (
          <p className="wb-note" style={{ marginTop: 8 }}>
            {job.progress.message}
          </p>
        )}
      </WbSection>

      {/* Error panel */}
      {job.status === "failed" && job.error_message && (
        <div className="wb-alert" role="alert">
          <b>
            Failed at stage:{" "}
            <code>{job.progress?.error_stage ?? job.progress?.stage ?? "unknown"}</code>
          </b>
          <pre
            style={{
              margin: "6px 0 0",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontSize: "0.75rem",
            }}
          >
            {job.error_message}
          </pre>
          {job.progress?.github_run_url && (
            <a
              href={job.progress.github_run_url}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-block", marginTop: 8, fontWeight: 600 }}
            >
              View full logs on GitHub Actions
            </a>
          )}
        </div>
      )}

      {/* Pipeline stage checklist */}
      <WbTable<Stage>
        caption="Pipeline stages"
        rows={[...V2_STAGES]}
        rowKey={(s) => s.key}
        empty="No stages."
        columns={[
          { key: "stage", label: "Stage", cell: (s) => s.label },
          {
            key: "status",
            label: "Status",
            cell: (s) => {
              const pill = STAGE_PILL[stageStatus(rowStage, job.status, s.key)];
              return <WbPill tone={pill.tone}>{pill.label}</WbPill>;
            },
          },
          {
            key: "detail",
            label: "Detail",
            cell: (s) => stageDetail(s, stageStatus(rowStage, job.status, s.key), job) ?? "—",
          },
        ]}
      />

      {/* Footer: result links when complete */}
      {job.status === "complete" && (
        <div className="wb-alert" data-tone="ok" role="status">
          <b>Pipeline complete.</b>{" "}
          {typeof job.progress?.stats?.questions_extracted === "number" && (
            <>
              {job.progress.stats.questions_extracted} questions extracted,{" "}
              {job.progress?.stats?.figures_extracted ?? 0} figures.{" "}
            </>
          )}
          <Link href={`/admin/questions/review?source_pdf=${encodeURIComponent(job.source_pdf)}`}>
            View extracted questions in the review queue
          </Link>
        </div>
      )}

      {/* Footer: live run link */}
      {polling && job.progress?.github_run_url && (
        <p className="wb-note">
          <a href={job.progress.github_run_url} target="_blank" rel="noreferrer">
            Watching GitHub Actions run
          </a>
        </p>
      )}
    </>
  );
}
