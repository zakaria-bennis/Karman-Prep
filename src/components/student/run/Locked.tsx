"use client";
import type { Assignment, AssignmentState } from "@/lib/student/unlocks";
import { dayLabel } from "../AssignmentStatus";
import { LockIcon } from "../icons";
import { ResultActions, ResultsFrame } from "./Results";
import x from "./results.module.css";

/** Shown instead of a run when the tutor has not opened it, or it was already taken. */
export function Locked({
  a,
  back,
  trial,
}: {
  a: (Assignment & { state: AssignmentState }) | undefined;
  back: string;
  trial?: boolean;
}) {
  return (
    <ResultsFrame trial={trial}>
      <span className={x.eyebrow} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <LockIcon size={16} /> {a?.title ?? "Locked"}
      </span>
      <p className={x.verdict}>
        {!a
          ? "This one is not on your plan."
          : a.state === "done"
            ? "You have taken this one. Your tutor schedules the next."
            : `Planned for ${dayLabel(a.scheduledFor)}. ${a.tutor} unlocks it when it is time.`}
      </p>
      <ResultActions primary={{ href: back, label: "Back" }} />
    </ResultsFrame>
  );
}
