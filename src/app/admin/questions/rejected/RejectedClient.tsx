"use client";

// ============================================================
// RejectedClient — list of rejected_questions rows with per-row
// Restore and Permanent-delete buttons. No filtering / search
// yet — recovery is a low-volume flow (the admin only comes
// here when they realize they shouldn't have rejected something).
//
// Dense table: each row shows the preview + meta; "Show" opens
// the full question_text, choices and reason underneath. The
// destructive button (Permanent delete) is gated behind
// window.confirm.
// ============================================================

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WbPill, formatDateTime } from "@/components/admin/workbench";
import {
  actionRestoreRejectedQuestion,
  actionHardDeleteRejectedQuestion,
} from "@/app/admin/actions";
import type { RejectedQuestionRow } from "@/lib/supabase/queries/quiz/rejected";

interface Props {
  rows: RejectedQuestionRow[];
}

export default function RejectedClient({ rows }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<
    { kind: "ok"; text: string } | { kind: "err"; text: string } | null
  >(null);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRestore(rejectedId: string) {
    setPendingId(rejectedId);
    setBanner(null);
    try {
      const r = await actionRestoreRejectedQuestion(rejectedId);
      if (r.restored) {
        setBanner({
          kind: "ok",
          text: `Restored to bank (id ${r.restoredQuestionId?.slice(0, 8)}…). Find it on /admin/questions/review.`,
        });
        startTransition(() => router.refresh());
      } else {
        setBanner({ kind: "err", text: "Restore failed — row not found." });
      }
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Restore failed (unknown error).",
      });
    } finally {
      setPendingId(null);
    }
  }

  async function handleHardDelete(rejectedId: string, preview: string | null) {
    if (
      !confirm(
        `Permanently delete this rejected question?\n\n` +
          `"${(preview ?? "(no preview)").slice(0, 140)}"\n\n` +
          `This drops the snapshot for good — no undo. The original was already removed from ` +
          `the bank when you rejected it; this just clears the recovery row.`
      )
    )
      return;
    setPendingId(rejectedId);
    setBanner(null);
    try {
      const r = await actionHardDeleteRejectedQuestion(rejectedId);
      if (r.deleted) {
        setBanner({ kind: "ok", text: "Permanently deleted." });
        startTransition(() => router.refresh());
      } else {
        setBanner({ kind: "err", text: "Delete failed — row not found." });
      }
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Delete failed (unknown error).",
      });
    } finally {
      setPendingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="wb-empty">
        <b>Nothing rejected yet.</b>
        Questions removed on the preview page land here for safekeeping.
      </div>
    );
  }

  return (
    <>
      {banner && (
        <div
          className="wb-alert"
          data-tone={banner.kind === "ok" ? "ok" : undefined}
          role={banner.kind === "err" ? "alert" : "status"}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <span style={{ flex: 1 }}>{banner.text}</span>
          <button type="button" className="wb-btn" onClick={() => setBanner(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="wb-table-wrap">
        <table className="wb-table">
          <caption className="sr-only">Rejected questions</caption>
          <thead>
            <tr>
              <th scope="col">Question</th>
              <th scope="col">Source</th>
              <th scope="col">Subject</th>
              <th scope="col">Rejected</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <RejectedRow
                key={r.id}
                row={r}
                busy={pendingId === r.id}
                expanded={expandedIds.has(r.id)}
                onToggleExpanded={() => toggleExpanded(r.id)}
                onRestore={() => handleRestore(r.id)}
                onHardDelete={() => handleHardDelete(r.id, r.question_preview)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface RowProps {
  row: RejectedQuestionRow;
  busy: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}

const LEFT = { minWidth: 0, overflowWrap: "anywhere", textAlign: "left" } as const;

function RejectedRow({ row, busy, expanded, onToggleExpanded, onRestore, onHardDelete }: RowProps) {
  const snapshot = row.question_snapshot as Record<string, unknown>;
  const questionText =
    (snapshot.question_text as string | null | undefined) ?? row.question_preview ?? "";
  const passage = snapshot.passage as string | null | undefined;
  const detailsId = `rejected-${row.id}`;

  return (
    <Fragment>
      <tr>
        <td data-label="Question">
          <span style={LEFT}>
            {row.question_preview || "(no preview captured)"}
            {row.rejected_reason && <small>Reason on file</small>}
            <button
              type="button"
              className="wb-btn"
              style={{ marginTop: 6, minHeight: 32 }}
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={onToggleExpanded}
            >
              {expanded ? "Hide details" : "Show details"}
            </button>
          </span>
        </td>
        <td data-label="Source">
          {row.source_pdf ? (
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              {row.source_pdf}
              {row.source_page != null && <small>p {row.source_page}</small>}
            </span>
          ) : (
            "—"
          )}
        </td>
        <td data-label="Subject">
          <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
            {row.subject && <WbPill tone="neutral">{row.subject}</WbPill>}
            {row.domain && <WbPill tone="neutral">{row.domain}</WbPill>}
            {!row.subject && !row.domain && "—"}
          </span>
        </td>
        <td data-label="Rejected">{formatDateTime(row.rejected_at)}</td>
        <td data-label="Actions">
          <ActionRow busy={busy} onRestore={onRestore} onHardDelete={onHardDelete} />
        </td>
      </tr>
      {expanded && (
        <tr id={detailsId}>
          <td colSpan={5} data-label="">
            <div style={{ ...LEFT, display: "grid", gap: 12, width: "100%" }}>
              {passage && (
                <div>
                  <b>Passage</b>
                  <p className="wb-note" style={{ whiteSpace: "pre-wrap", color: "var(--ink)" }}>
                    {passage}
                  </p>
                </div>
              )}
              <div>
                <b>Question</b>
                <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{questionText}</p>
              </div>
              {row.choices_snapshot.length > 0 && (
                <div>
                  <b>Choices</b>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 0, listStyle: "none" }}>
                    {row.choices_snapshot.map((c) => (
                      <li key={c.letter}>
                        <b>{c.letter}.</b> {c.choice_text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {row.rejected_reason && (
                <div>
                  <b>Reason given at reject time</b>
                  <p className="wb-note" style={{ marginTop: 4 }}>
                    {row.rejected_reason}
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function ActionRow({
  busy,
  onRestore,
  onHardDelete,
}: {
  busy: boolean;
  onRestore: () => void;
  onHardDelete: () => void;
}) {
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
      <button type="button" className="wb-btn" onClick={onRestore} disabled={busy}>
        {busy ? "Working…" : "Restore to bank"}
      </button>
      <button
        type="button"
        className="wb-btn"
        data-variant="danger"
        onClick={onHardDelete}
        disabled={busy}
      >
        Permanent delete
      </button>
    </span>
  );
}
