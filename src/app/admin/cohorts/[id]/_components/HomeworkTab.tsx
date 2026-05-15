"use client";

// ============================================================
// Homework tab — read-only display of the tutor's assignments
// + a due-date badge that colours by proximity. CRUD lives in
// the tutor portal.
// Carved out of the old monolithic CohortDetailClient.tsx
// (audit M1).
// ============================================================

import { cn } from "@/lib/utils";
import type { HomeworkRow } from "@/lib/supabase/queries/cohorts";
import { EmptyBlock, formatDateTime, tutorDisplay } from "./shared";

export function HomeworkTab({ homework }: { homework: HomeworkRow[] }) {
  if (homework.length === 0) {
    return (
      <EmptyBlock
        title="No homework posted yet"
        subtitle="Assignments the tutor posts from the tutor portal will appear here."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {homework.map((h) => (
        <li key={h.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-2 flex items-start justify-between gap-4">
            <h3 className="font-semibold text-white">{h.title}</h3>
            <DueBadge dueAt={h.due_at} />
          </div>
          {h.body && (
            <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">
              {h.body}
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>Assigned {formatDateTime(h.assigned_at)}</span>
            {h.due_at && <span>· Due {formatDateTime(h.due_at)}</span>}
            <span>· by {tutorDisplay(h.created_by)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DueBadge({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const ms = due.getTime() - now.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));

  let label: string;
  let classes: string;
  if (ms < 0) {
    label = days <= -1 ? `${Math.abs(days)}d overdue` : "due earlier";
    classes = "bg-slate-700/20 text-slate-400 border-slate-600/30";
  } else if (days <= 1) {
    label = days === 0 ? "due today" : "due tomorrow";
    classes = "bg-rose-400/10 text-rose-300 border-rose-400/20";
  } else if (days <= 3) {
    label = `due in ${days}d`;
    classes = "bg-amber-400/10 text-amber-300 border-amber-400/20";
  } else {
    label = `due in ${days}d`;
    classes = "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
  }
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold",
        classes
      )}
    >
      {label}
    </span>
  );
}
