import type { ReactNode } from "react";
import { fmtDate } from "@/mock";
import { Initials } from "./Initials";

/*
 * NotesTimeline: a student's session notes as a rail of entries, newest
 * first, each with the tutor's initial, the session number and the date in
 * words at the right. The rail, the row shape and the right-aligned time are
 * ported from Activity Timeline (21st.dev 28340, olewandowski1); its day
 * separators, photo avatars and Lucide icon badges were not used.
 */
export interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  text: ReactNode;
  initial: string;
  hue: number;
  mark?: string;
}

export function Timeline({ entries, emptyText }: { entries: TimelineEntry[]; emptyText: string }) {
  if (!entries.length) return <p className="py-3 text-dense text-muted">{emptyText}</p>;
  return (
    <ol className="relative grid gap-4 py-1">
      <span className="absolute bottom-4 left-4 top-4 w-px bg-line" aria-hidden="true" />
      {entries.map((e) => (
        <li key={e.id} className="relative flex items-start gap-3">
          <Initials initial={e.initial} hue={e.hue} size={32} className="relative" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-dense font-semibold">{e.title}</p>
              <span className="tabular shrink-0 text-small text-muted">{fmtDate(e.date)}</span>
            </div>
            <p className="text-dense text-text/90">{e.text}</p>
            {e.mark ? <p className="mt-0.5 text-small text-muted">{e.mark}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
