import {
  calendarDateInZone,
  requireStudentTimeZone,
  sessionHomeworkNoticeGrace,
  sessionLinkState,
} from "./session-homework-policy";

export type LinkedHomeworkNoticeCandidate = {
  assignmentId: string;
  bookingId: string;
  studentId: string;
  status: string;
  bookingStatus: string;
  sessionStartAtAssignment: string;
  currentSessionStart: string;
  studentTimeZone: string | null;
  completedAt: string | null;
};

export type NoticeDecision =
  | {
      kind: "eligible";
      studentId: string;
      localSessionDate: string;
      studentTimeZone: string;
      graceAt: string;
      assignmentIds: string[];
      bookingIds: string[];
    }
  | {
      kind:
        | "not_ready"
        | "complete"
        | "booking_changed"
        | "inactive"
        | "missing_timezone"
        | "no_incomplete_homework";
    };

/** Evaluate only a fresh, same-student read made inside the final claim transaction. */
export function decideHomeworkNotice(
  candidates: LinkedHomeworkNoticeCandidate[],
  checkedAt: string
): NoticeDecision {
  if (!candidates.length) return { kind: "no_incomplete_homework" };
  const now = new Date(checkedAt).getTime();
  if (!Number.isFinite(now)) throw new Error("Notice check time is invalid");
  const first = candidates[0];
  let zone: string;
  try {
    zone = requireStudentTimeZone(first.studentTimeZone);
  } catch {
    return { kind: "missing_timezone" };
  }
  const localSessionDate = calendarDateInZone(first.sessionStartAtAssignment, zone);
  const eligible: string[] = [];
  const bookingIds: string[] = [];
  let fallback: Exclude<NoticeDecision["kind"], "eligible"> = "no_incomplete_homework";
  for (const candidate of candidates) {
    if (
      candidate.studentId !== first.studentId ||
      candidate.studentTimeZone !== zone ||
      calendarDateInZone(candidate.sessionStartAtAssignment, candidate.studentTimeZone) !==
        localSessionDate
    )
      throw new Error("Notice candidates must belong to one student, zone, and local session day");
    if (candidate.status !== "active") {
      fallback = "inactive";
      continue;
    }
    if (
      sessionLinkState(
        candidate.sessionStartAtAssignment,
        candidate.currentSessionStart,
        candidate.bookingStatus
      ) !== "scheduled"
    ) {
      fallback = "booking_changed";
      continue;
    }
    if (candidate.completedAt) {
      fallback = "complete";
      continue;
    }
    eligible.push(candidate.assignmentId);
    bookingIds.push(candidate.bookingId);
  }
  const graceAt = sessionHomeworkNoticeGrace(first.sessionStartAtAssignment, zone);
  if (now < new Date(graceAt).getTime()) return { kind: "not_ready" };
  if (!eligible.length) return { kind: fallback };
  return {
    kind: "eligible",
    studentId: first.studentId,
    localSessionDate,
    studentTimeZone: zone,
    graceAt,
    assignmentIds: [...new Set(eligible)].sort(),
    bookingIds: [...new Set(bookingIds)].sort(),
  };
}
