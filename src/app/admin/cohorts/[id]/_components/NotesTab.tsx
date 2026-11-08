"use client";

// ============================================================
// Notes tab: the tutor's progress notes, read-only. Tutors write
// them in the tutor portal.
// ============================================================

import { WbEmpty, WbSection } from "@/components/admin/workbench";

export function NotesTab({ note, tutorName }: { note: string | null; tutorName: string }) {
  if (!note) {
    return (
      <WbEmpty title="No notes yet.">
        {tutorName} hasn&apos;t written notes for this cohort. Tutors write them in the tutor
        portal.
      </WbEmpty>
    );
  }
  return (
    <WbSection title={`Notes by ${tutorName}`}>
      <div style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: 1.6 }}>{note}</div>
    </WbSection>
  );
}
