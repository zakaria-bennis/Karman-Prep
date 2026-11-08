// ============================================================
// /admin/pdf-pipeline/jobs — list of all PDF processing jobs.
// Pulls from pdf_processing_jobs, newest first.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  WbPage,
  WbPill,
  WbStats,
  WbTable,
  WbTabs,
  formatDateTime,
  type Tone,
} from "@/components/admin/workbench";
import { selectRecentPdfJobs, selectPdfJobCounts } from "@/lib/supabase/queries/pdf-jobs";
import { STAGE_LABEL } from "@/types/pdf-job";

export const metadata: Metadata = { title: "Admin — PDF jobs | Karman" };
export const dynamic = "force-dynamic";

const PATH = "/admin/pdf-pipeline/jobs";

const STATUS_TONE: Record<string, Tone> = {
  queued: "neutral",
  running: "info",
  partial: "warn",
  complete: "ok",
  failed: "fail",
};

const FILTERS = ["all", "queued", "running", "complete", "failed"] as const;
type Filter = (typeof FILTERS)[number];

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

type Job = Awaited<ReturnType<typeof selectRecentPdfJobs>>[number];

export default async function PdfJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(status ?? "")
    ? (status as Filter)
    : "all";
  const [jobs, counts] = await Promise.all([selectRecentPdfJobs(50), selectPdfJobCounts()]);
  const shown = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
  const countIn = (f: Filter) =>
    f === "all" ? jobs.length : jobs.filter((j) => j.status === f).length;

  return (
    <WbPage
      title="PDF processing jobs"
      summary="Every PDF uploaded for the automated pipeline, newest first (last 50). Open a job for its progress."
      actions={
        <>
          <Link className="wb-btn" href="/admin/questions/import">
            Upload PDF
          </Link>
          <Link className="wb-btn" href="/admin/curriculum">
            Back to admin
          </Link>
        </>
      }
    >
      <WbStats
        items={[
          { label: "Queued", value: counts.queued },
          { label: "Running", value: counts.running },
          { label: "Complete", value: counts.complete },
          { label: "Failed", value: counts.failed },
          { label: "Total", value: counts.total },
        ]}
      />

      <WbTabs
        label="Job status"
        param="status"
        value={filter}
        basePath={PATH}
        options={FILTERS.map((f) => ({
          value: f,
          label: f === "all" ? "All" : f[0].toUpperCase() + f.slice(1),
          count: countIn(f),
        }))}
      />

      <WbTable<Job>
        caption="PDF processing jobs"
        rows={shown}
        rowKey={(j) => j.id}
        empty={
          jobs.length === 0 ? (
            <>
              <b>No PDF jobs yet.</b>
              Upload one on <Link href="/admin/questions/import">the import page</Link>.
            </>
          ) : (
            <>
              <b>No job has this status.</b>
              <Link href={PATH}>Clear filters</Link>
            </>
          )
        }
        columns={[
          {
            key: "pdf",
            label: "PDF",
            cell: (job) => (
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <Link href={`${PATH}/${job.id}`}>{job.source_pdf}</Link>
              </span>
            ),
          },
          {
            key: "status",
            label: "Status",
            cell: (job) => (
              <WbPill tone={STATUS_TONE[job.status] ?? "neutral"}>{job.status}</WbPill>
            ),
          },
          {
            key: "stage",
            label: "Stage",
            cell: (job) => {
              const stage = job.progress?.stage ?? "queued";
              return job.progress?.stage_label ?? STAGE_LABEL[stage] ?? stage;
            },
          },
          {
            key: "progress",
            label: "Progress",
            cell: (job) => {
              const percent = job.progress?.percent ?? 0;
              const bar =
                job.status === "failed"
                  ? "var(--late)"
                  : job.status === "complete"
                    ? "var(--good)"
                    : "var(--accent)";
              return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${job.source_pdf} progress`}
                    style={{
                      display: "block",
                      width: 96,
                      height: 6,
                      borderRadius: 4,
                      overflow: "hidden",
                      background: "var(--sunk, var(--line))",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${Math.max(0, Math.min(100, percent))}%`,
                        background: bar,
                      }}
                    />
                  </span>
                  {percent}%
                </span>
              );
            },
          },
          {
            key: "size",
            label: "Size",
            numeric: true,
            cell: (job) => formatBytes(job.pdf_size_bytes),
          },
          {
            key: "uploaded",
            label: "Uploaded",
            cell: (job) => (
              <span title={formatDateTime(job.uploaded_at)}>{formatAgo(job.uploaded_at)}</span>
            ),
          },
        ]}
      />
    </WbPage>
  );
}
