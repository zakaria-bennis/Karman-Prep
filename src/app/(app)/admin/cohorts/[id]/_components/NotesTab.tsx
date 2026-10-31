"use client";

// ============================================================
// Notes tab — read-only display of the tutor's progress notes.
// Note authoring lives in the tutor portal; admin just sees them.
// Carved out of the old monolithic CohortDetailClient.tsx
// (audit M1).
// ============================================================

import { EmptyBlock } from "./shared";

export function NotesTab({ note, tutorName }: { note: string | null; tutorName: string }) {
  if (!note) {
    return (
      <EmptyBlock
        title="No notes yet"
        subtitle={`${tutorName} hasn't written any progress notes for this cohort. Notes are authored in the tutor portal.`}
      />
    );
  }
  return (
    <div className="rounded-xl border border-bronze bg-surface/40 p-6">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-taupe">
        Notes by {tutorName}
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-ivory">{note}</div>
    </div>
  );
}
