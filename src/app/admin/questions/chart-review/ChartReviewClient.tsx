"use client";

// ============================================================
// ChartReviewClient — side-by-side review cards + edit-modal
// orchestration for /admin/questions/chart-review.
//
// One card per pending (or live) chart. Each card:
//   · LEFT  — original raster screenshot (image_url) inside
//             FigureFrame so it stays bounded
//   · RIGHT — AI's re-rendered ChartFigure SVG, subject-coded
//   · METADATA strip — source_pdf · page · subject · domain ·
//             confidence pill, prominent so the admin can locate
//             the question on the source PDF
//   · ACTIONS — Approve / Edit / Reject / Open in Inspector
//
// Clicking Edit opens a modal containing ChartFigureEditor
// (Desmos-style live preview). Saving commits via actionEditChart.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Pencil,
  XCircle,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ChartFigure from "@/components/learn/ChartFigure";
import FigureFrame from "@/components/learn/FigureFrame";
import ChartFigureEditor from "@/components/admin/ChartFigureEditor";
import { actionApproveChart, actionEditChart, actionRejectChart } from "@/app/admin/chart-actions";
import type { ChartReviewRow } from "@/lib/supabase/queries/quiz/charts";
import type { ChartFigure as ChartFigureType } from "@/types/chart";

interface Props {
  rows: ChartReviewRow[];
}

export default function ChartReviewClient({ rows }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ChartReviewRow | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function approve(row: ChartReviewRow) {
    setBusyId(row.question_id);
    setFeedback(null);
    startTransition(async () => {
      try {
        await actionApproveChart({ questionId: row.question_id });
        setFeedback({
          kind: "success",
          message: `Approved chart for ${row.source_pdf ?? "(no pdf)"} p${row.source_page ?? "?"}.`,
        });
        router.refresh();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Approve failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBusyId(null);
      }
    });
  }

  function reject(row: ChartReviewRow) {
    if (
      !confirm(
        `Reject the AI's chart for ${row.source_pdf ?? "(no pdf)"} p${row.source_page ?? "?"}? The original screenshot will keep showing to students.`
      )
    )
      return;
    setBusyId(row.question_id);
    setFeedback(null);
    startTransition(async () => {
      try {
        await actionRejectChart({ questionId: row.question_id });
        setFeedback({
          kind: "success",
          message: `Rejected chart for ${row.source_pdf ?? "(no pdf)"} p${row.source_page ?? "?"}.`,
        });
        router.refresh();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Reject failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBusyId(null);
      }
    });
  }

  function saveEdit(row: ChartReviewRow, edited: ChartFigureType) {
    setBusyId(row.question_id);
    setFeedback(null);
    startTransition(async () => {
      try {
        await actionEditChart({ questionId: row.question_id, chartData: edited });
        setFeedback({
          kind: "success",
          message: `Saved edited chart for ${row.source_pdf ?? "(no pdf)"} p${row.source_page ?? "?"}.`,
        });
        setEditing(null);
        router.refresh();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Save failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
            feedback.kind === "success"
              ? "border-success/40 bg-success/[0.06] text-success-bright"
              : "border-error/40 bg-error/[0.06] text-error-bright"
          )}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            dismiss
          </button>
        </div>
      )}

      <div className="space-y-5">
        {rows.map((row) => (
          <ReviewCard
            key={row.question_id}
            row={row}
            busy={busyId === row.question_id}
            onApprove={() => approve(row)}
            onReject={() => reject(row)}
            onEdit={() => setEditing(row)}
          />
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <EditModal
          row={editing}
          busy={busyId === editing.question_id}
          onSave={(edited) => saveEdit(editing, edited)}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Per-question side-by-side card ───────────────────────────

function ReviewCard({
  row,
  busy,
  onApprove,
  onReject,
  onEdit,
}: {
  row: ChartReviewRow;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  const conf = row.chart_data.confidence;
  return (
    <article className="rounded-xl border border-bronze bg-surface/40 p-5">
      {/* Metadata strip — most-prominent: source PDF + page */}
      <header className="mb-4 flex flex-wrap items-center gap-3 border-b border-bronze pb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-taupe">
            Source
          </span>
          <code className="rounded bg-night px-2 py-0.5 font-mono text-xs text-ivory">
            {row.source_pdf ?? "(no pdf)"}
          </code>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-taupe">
            Page
          </span>
          <code className="rounded bg-night px-2 py-0.5 font-mono text-xs text-ivory">
            {row.source_page ?? "?"}
          </code>
        </div>
        <span className="text-taupe">·</span>
        <span className="rounded bg-surface-raised px-2 py-0.5 text-[11px] font-semibold uppercase text-ivory">
          {row.subject}
        </span>
        {row.domain && (
          <span className="text-[11px] text-taupe">{row.domain.replace(/_/g, " ")}</span>
        )}
        <span className="text-taupe">·</span>
        <ConfidencePill confidence={conf} />
        <Link
          href={row.inspect_href}
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-taupe hover:text-ivory"
        >
          <ExternalLink className="h-3 w-3" /> Inspector detail
        </Link>
      </header>

      {/* Question stem preview — helps the admin know what the chart
          is supposed to show without leaving the page. */}
      <p className="mb-3 line-clamp-2 text-xs text-taupe">{row.question_text}</p>

      {/* Side-by-side: original screenshot vs AI re-render */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-taupe">
            Original screenshot
          </div>
          {row.image_url ? (
            <FigureFrame
              src={row.image_url}
              alt={row.image_alt ?? "Original figure"}
              maxHeightClass="max-h-72"
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-bronze text-xs text-taupe">
              No image_url on this question
            </div>
          )}
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-taupe">
            AI re-render
          </div>
          <ChartFigure data={row.chart_data} subject={row.subject} />
        </div>
      </div>

      {row.chart_data.extractor_note && (
        <p className="mt-3 rounded bg-night/60 px-3 py-2 text-[11px] italic text-taupe">
          Extractor note: {row.chart_data.extractor_note}
        </p>
      )}

      {/* Action bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-bronze pt-3">
        {row.is_live ? (
          <span className="rounded bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success-bright">
            Live to students
          </span>
        ) : (
          <span className="rounded bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-bright">
            Pending — screenshot still showing
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold-bright hover:bg-gold/25 disabled:opacity-40"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        {!row.is_live && (
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-success/15 px-3 py-1.5 text-xs font-semibold text-success-bright hover:bg-success/25 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Approve as-is
          </button>
        )}
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-error/15 px-3 py-1.5 text-xs font-semibold text-error-bright hover:bg-error/25 disabled:opacity-40"
        >
          <XCircle className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </article>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const cls =
    confidence >= 0.8
      ? "bg-success/15 text-success-bright"
      : confidence >= 0.5
        ? "bg-warning/15 text-warning-bright"
        : "bg-error/15 text-error-bright";
  return (
    <span className={cn("rounded px-2 py-0.5 font-mono text-[11px]", cls)}>AI conf {pct}%</span>
  );
}

// ── Edit modal ───────────────────────────────────────────────

function EditModal({
  row,
  busy,
  onSave,
  onCancel,
}: {
  row: ChartReviewRow;
  busy: boolean;
  onSave: (edited: ChartFigureType) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-night/70 p-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="my-8 w-full max-w-6xl rounded-2xl border border-bronze bg-night p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between border-b border-bronze pb-3">
          <div>
            <h2 className="text-base font-semibold text-ivory">Edit chart</h2>
            <p className="mt-0.5 text-[11px] text-taupe">
              {row.source_pdf ?? "(no pdf)"} · page {row.source_page ?? "?"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md p-1.5 text-taupe hover:bg-surface-raised hover:text-ivory"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <ChartFigureEditor
          initial={row.chart_data}
          subject={row.subject}
          onSave={onSave}
          onCancel={onCancel}
          saving={busy}
        />
      </div>
    </div>
  );
}
