"use client";

// ============================================================
// RejectedClient — list of rejected_questions rows with per-row
// Restore and Permanent-delete buttons. No filtering / search
// yet — recovery is a low-volume flow (the admin only comes
// here when they realize they shouldn't have rejected something).
//
// Pattern matches /admin/questions/review:
//   · cards collapsed by default (just the preview + meta)
//   · expand to see the full question_text + choices
//   · destructive button (Permanent delete) is rose-tinted and
//     gated behind window.confirm
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Trash2,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-400">
        Nothing rejected yet. Questions removed via the preview page land here for safekeeping.
      </div>
    );
  }

  return (
    <>
      {banner && (
        <div
          className={cn(
            "mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            banner.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-200"
              : "border-rose-500/30 bg-rose-500/[0.06] text-rose-200"
          )}
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">{banner.text}</div>
          <button
            onClick={() => setBanner(null)}
            className={cn(
              "text-xs hover:opacity-100",
              banner.kind === "ok" ? "text-emerald-300/70" : "text-rose-300/70"
            )}
          >
            dismiss
          </button>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <RejectedCard
            key={r.id}
            row={r}
            busy={pendingId === r.id}
            expanded={expandedIds.has(r.id)}
            onToggleExpanded={() => toggleExpanded(r.id)}
            onRestore={() => handleRestore(r.id)}
            onHardDelete={() => handleHardDelete(r.id, r.question_preview)}
          />
        ))}
      </div>
    </>
  );
}

interface CardProps {
  row: RejectedQuestionRow;
  busy: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}

function RejectedCard({
  row,
  busy,
  expanded,
  onToggleExpanded,
  onRestore,
  onHardDelete,
}: CardProps) {
  const snapshot = row.question_snapshot as Record<string, unknown>;
  const questionText =
    (snapshot.question_text as string | null | undefined) ?? row.question_preview ?? "";
  const passage = snapshot.passage as string | null | undefined;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40">
      {/* ── Collapsed header (always visible) ─────────────── */}
      <button
        onClick={onToggleExpanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-900/60"
      >
        <div className="mt-0.5 text-slate-500">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm text-slate-200">
            {row.question_preview || "(no preview captured)"}
          </div>
          <MetaRow row={row} />
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3">
          {passage && (
            <div className="mb-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Passage
              </div>
              <div className="whitespace-pre-wrap rounded border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
                {passage}
              </div>
            </div>
          )}
          <div className="mb-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Question
            </div>
            <div className="whitespace-pre-wrap text-sm text-slate-100">{questionText}</div>
          </div>
          {row.choices_snapshot.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Choices
              </div>
              <ol className="space-y-1 text-xs text-slate-300">
                {row.choices_snapshot.map((c) => (
                  <li key={c.letter}>
                    <span className="font-mono font-bold text-slate-400">{c.letter}.</span>{" "}
                    {c.choice_text}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {row.rejected_reason && (
            <div className="mb-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Reason given at reject time
              </div>
              <div className="rounded border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2 text-xs text-amber-200">
                {row.rejected_reason}
              </div>
            </div>
          )}

          <ActionRow busy={busy} onRestore={onRestore} onHardDelete={onHardDelete} />
        </div>
      )}
    </div>
  );
}

function MetaRow({ row }: { row: RejectedQuestionRow }) {
  const when = (row.rejected_at ?? "").replace("T", " ").slice(0, 16);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
      <span className="inline-flex items-center gap-1">
        <span className="text-slate-600">rejected</span>
        <span className="font-mono text-slate-400">{when} UTC</span>
      </span>
      {row.source_pdf && (
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" />
          <span className="font-mono text-slate-400">
            {row.source_pdf}
            {row.source_page != null ? ` p${row.source_page}` : ""}
          </span>
        </span>
      )}
      {row.domain && (
        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
          {row.domain}
        </span>
      )}
      {row.subject && (
        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
          {row.subject}
        </span>
      )}
      {row.rejected_reason && (
        <span className="inline-flex items-center gap-1 text-amber-400/80">
          <AlertCircle className="h-3 w-3" />
          <span className="italic">reason on file</span>
        </span>
      )}
    </div>
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
    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={onRestore}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50",
          "bg-emerald-500 text-white hover:bg-emerald-400 disabled:hover:bg-emerald-500"
        )}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
        Restore to bank
      </button>
      <button
        onClick={onHardDelete}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50",
          "bg-rose-600 text-white hover:bg-rose-500 disabled:hover:bg-rose-600"
        )}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        Permanent delete
      </button>
    </div>
  );
}
