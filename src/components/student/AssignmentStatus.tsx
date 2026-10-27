import type { Assignment, AssignmentState } from "@/lib/student/unlocks";
import { LockIcon } from "./icons";
import s from "./student.module.css";

export const dayLabel = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/** One line that says whether the student can start this, and who opens it. */
export function AssignmentStatus({
  a,
  tutor,
}: {
  a: (Assignment & { state: AssignmentState }) | null;
  tutor: string;
}) {
  if (!a)
    return (
      <span className={s.status} data-state="locked">
        <LockIcon size={14} /> Nothing planned yet. Ask {tutor}.
      </span>
    );
  if (a.state === "open")
    return (
      <span className={s.status} data-state="open">
        Unlocked by {a.tutor}
      </span>
    );
  if (a.state === "done")
    return (
      <span className={s.status} data-state="done">
        Done
      </span>
    );
  return (
    <span className={s.status} data-state={a.state}>
      <LockIcon size={14} /> {dayLabel(a.scheduledFor)} · {a.tutor} unlocks it
    </span>
  );
}
