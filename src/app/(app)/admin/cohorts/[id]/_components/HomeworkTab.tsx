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
        <li key={h.id} className="rounded-xl border border-bronze bg-surface/40 p-5">
          <div className="mb-2 flex items-start justify-between gap-4">
            <h3 className="font-semibold text-ivory">{h.title}</h3>
            <DueBadge dueAt={h.due_at} />
          </div>
          {h.body && (
            <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-taupe">{h.body}</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-taupe">
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
    classes = "bg-surface-raised/20 text-taupe border-bronze/30";
  } else if (days <= 1) {
    label = days === 0 ? "due today" : "due tomorrow";
    classes = "bg-error/10 text-error-bright border-error/20";
  } else if (days <= 3) {
    label = `due in ${days}d`;
    classes = "bg-warning/10 text-warning-bright border-warning/20";
  } else {
    label = `due in ${days}d`;
    classes = "bg-success/10 text-success-bright border-success/20";
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
