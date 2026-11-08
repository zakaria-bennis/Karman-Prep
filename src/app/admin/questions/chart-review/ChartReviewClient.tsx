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
import { WbPill } from "@/components/admin/workbench";
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
    <>
      {feedback && (
        <div
          className="wb-alert"
          data-tone={feedback.kind === "success" ? "ok" : undefined}
          role={feedback.kind === "error" ? "alert" : "status"}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <span style={{ flex: 1 }}>{feedback.message}</span>
          <button type="button" className="wb-btn" onClick={() => setFeedback(null)}>
            Dismiss
          </button>
        </div>
      )}

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

      {/* Edit modal */}
      {editing && (
        <EditModal
          row={editing}
          busy={busyId === editing.question_id}
          onSave={(edited) => saveEdit(editing, edited)}
          onCancel={() => setEditing(null)}
        />
      )}
    </>
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
  const label = `${row.source_pdf ?? "(no pdf)"}, page ${row.source_page ?? "?"}`;
  return (
    <article className="wb-section" aria-label={label} style={{ display: "grid", gap: 12 }}>
      {/* Metadata strip — most prominent: source PDF + page */}
      <div className="wb-toolbar">
        <dl className="wb-dl" style={{ flex: "1 1 260px" }}>
          <dt>Source</dt>
          <dd>
            <code>{row.source_pdf ?? "(no pdf)"}</code>
          </dd>
          <dt>Page</dt>
          <dd>{row.source_page ?? "?"}</dd>
          <dt>Subject</dt>
          <dd>
            {row.subject}
            {row.domain && <span className="wb-note"> · {row.domain.replace(/_/g, " ")}</span>}
          </dd>
        </dl>
        <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
          <ConfidencePill confidence={conf} />
          {row.is_live ? (
            <WbPill tone="ok">Live to students</WbPill>
          ) : (
            <WbPill tone="warn">Pending: screenshot still showing</WbPill>
          )}
        </span>
      </div>

      {/* Question stem preview — helps the admin know what the chart
          is supposed to show without leaving the page. */}
      <p className="wb-note">{row.question_text}</p>

      {/* Side-by-side: original screenshot vs AI re-render */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <figure style={{ margin: 0, minWidth: 0 }}>
          <figcaption className="wb-note" style={{ marginBottom: 6 }}>
            Original screenshot
          </figcaption>
          {row.image_url ? (
            <FigureFrame
              src={row.image_url}
              alt={row.image_alt ?? "Original figure"}
              maxHeightClass="max-h-72"
            />
          ) : (
            <div className="wb-empty">No image_url on this question</div>
          )}
        </figure>
        <figure style={{ margin: 0, minWidth: 0 }}>
          <figcaption className="wb-note" style={{ marginBottom: 6 }}>
            AI re-render
          </figcaption>
          <ChartFigure data={row.chart_data} subject={row.subject} />
        </figure>
      </div>

      {row.chart_data.extractor_note && (
        <p className="wb-note">Extractor note: {row.chart_data.extractor_note}</p>
      )}

      {/* Action bar */}
      <div className="wb-toolbar">
        <button type="button" className="wb-btn" onClick={onEdit} disabled={busy}>
          Edit
        </button>
        {!row.is_live && (
          <button type="button" className="wb-btn" onClick={onApprove} disabled={busy}>
            {busy ? "Approving…" : "Approve as-is"}
          </button>
        )}
        <button
          type="button"
          className="wb-btn"
          data-variant="danger"
          onClick={onReject}
          disabled={busy}
        >
          Reject
        </button>
        <Link className="wb-btn" href={row.inspect_href} style={{ marginLeft: "auto" }}>
          Inspector detail
        </Link>
      </div>
    </article>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone = confidence >= 0.8 ? "ok" : confidence >= 0.5 ? "warn" : "fail";
  return <WbPill tone={tone}>AI confidence {pct}%</WbPill>;
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      style={{ background: "color-mix(in srgb, var(--sunk, #000) 70%, transparent)" }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-edit-title"
        className="wb my-8 w-full max-w-6xl"
        style={{
          background: "var(--card, var(--bg, #fff))",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="wb-head">
          <div>
            <h2 id="chart-edit-title">Edit chart</h2>
            <p>
              {row.source_pdf ?? "(no pdf)"} · page {row.source_page ?? "?"}
            </p>
          </div>
          <button
            type="button"
            className="wb-btn"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close editor"
          >
            Close
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
