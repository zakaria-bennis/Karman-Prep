"use client";

// ============================================================
// Homework tab: the tutor's assignments, read-only, with a due
// pill coloured by how close the due date is. Tutors post and
// edit homework in the tutor portal.
// ============================================================

import { WbPill, WbTable, type Tone } from "@/components/admin/workbench";
import type { HomeworkRow } from "@/lib/supabase/queries/cohorts";
import { formatDay, tutorDisplay } from "./shared";

export function HomeworkTab({ homework }: { homework: HomeworkRow[] }) {
  return (
    <WbTable<HomeworkRow>
      caption="Homework for this cohort"
      rows={homework}
      rowKey={(h) => h.id}
      empty={
        <>
          <b>No homework yet.</b>
          Homework the tutor posts in the tutor portal shows up here.
        </>
      }
      columns={[
        {
          key: "title",
          label: "Homework",
          cell: (h) => (
            <span style={{ minWidth: 0, overflowWrap: "anywhere", textAlign: "left" }}>
              <b>{h.title}</b>
              {h.body && <small style={{ whiteSpace: "pre-wrap", marginTop: 2 }}>{h.body}</small>}
            </span>
          ),
        },
        { key: "assigned", label: "Assigned", cell: (h) => formatDay(h.assigned_at) },
        {
          key: "due",
          label: "Due",
          cell: (h) =>
            h.due_at ? (
              <span>
                {formatDay(h.due_at)}
                <DuePill dueAt={h.due_at} />
              </span>
            ) : (
              "No due date"
            ),
        },
        { key: "by", label: "Posted by", cell: (h) => tutorDisplay(h.created_by) },
      ]}
    />
  );
}

function DuePill({ dueAt }: { dueAt: string }) {
  const ms = new Date(dueAt).getTime() - Date.now();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));

  let label: string;
  let tone: Tone;
  if (ms < 0) {
    label = days <= -1 ? `${Math.abs(days)}d overdue` : "Due earlier";
    tone = "neutral";
  } else if (days <= 1) {
    label = days === 0 ? "Due today" : "Due tomorrow";
    tone = "fail";
  } else if (days <= 3) {
    label = `Due in ${days}d`;
    tone = "warn";
  } else {
    label = `Due in ${days}d`;
    tone = "ok";
  }
  return (
    <span style={{ display: "block", marginTop: 2 }}>
      <WbPill tone={tone}>{label}</WbPill>
    </span>
  );
}
