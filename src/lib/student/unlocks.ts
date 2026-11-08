import type { TrialSection } from "./time-trial";

/** Spec: Assigned modes. Full-length exams and Time Trials are made ahead, scheduled, and
 *  opened by the tutor. A student can start one only while it is open, and only once. */
export type AssignmentKind = "time_trial" | "full_length";

export type Assignment = {
  id: string;
  kind: AssignmentKind;
  /** Time Trials are per section; a full-length exam covers both. */
  section: TrialSection | null;
  title: string;
  /** The day the plan puts it on (YYYY-MM-DD). */
  scheduledFor: string;
  /** Set when the tutor opens it. */
  unlockedAt: string | null;
  completedAt: string | null;
  tutor: string;
};

export type AssignmentState = "done" | "open" | "scheduled" | "locked";

export function assignmentState(a: Assignment, nowMs: number): AssignmentState {
  if (a.completedAt) return "done";
  if (a.unlockedAt && Date.parse(a.unlockedAt) <= nowMs) return "open";
  return a.scheduledFor ? "scheduled" : "locked";
}

export function canStart(a: Assignment, nowMs: number): boolean {
  return assignmentState(a, nowMs) === "open";
}

/** Research-backed spacing the tutor sees before unlocking (spec: Spacing). Not a hard block:
 *  the tutor can still unlock, because they know the student's week. */
export const MIN_GAP_DAYS: Record<AssignmentKind, number> = { full_length: 14, time_trial: 2 };

export function spacingWarning(
  a: Assignment,
  all: readonly Assignment[],
  nowMs: number
): string | null {
  const last = all
    .filter(
      (x) => x.id !== a.id && x.kind === a.kind && x.section === a.section && x.completedAt !== null
    )
    .map((x) => Date.parse(x.completedAt!))
    .sort((p, q) => q - p)[0];
  if (last === undefined) return null;
  const days = (nowMs - last) / 86_400_000;
  const gap = MIN_GAP_DAYS[a.kind];
  if (days >= gap) return null;
  const left = Math.ceil(gap - days);
  return `Last one was ${Math.floor(days) === 0 ? "today" : `${Math.floor(days)} days ago`}. We suggest waiting ${left} more ${left === 1 ? "day" : "days"}.`;
}

/** The student's next item of each kind: open first, then the earliest scheduled. */
export function nextAssignment(
  all: readonly Assignment[],
  kind: AssignmentKind,
  section: TrialSection | null,
  nowMs: number
): Assignment | null {
  const rank: Record<AssignmentState, number> = { open: 0, scheduled: 1, locked: 2, done: 3 };
  return (
    all
      .filter((a) => a.kind === kind && (section === null || a.section === section))
      .filter((a) => assignmentState(a, nowMs) !== "done")
      .sort(
        (a, b) =>
          rank[assignmentState(a, nowMs)] - rank[assignmentState(b, nowMs)] ||
          a.scheduledFor.localeCompare(b.scheduledFor)
      )[0] ?? null
  );
}

/** Apply this browser's preview overrides (tutor unlocks, student completions). */
export function withOverrides(
  all: readonly Assignment[],
  unlocks: Record<string, string>,
  completions: Record<string, string>
): Assignment[] {
  return all.map((a) => ({
    ...a,
    unlockedAt: unlocks[a.id] ?? a.unlockedAt,
    completedAt: completions[a.id] ?? a.completedAt,
  }));
}
