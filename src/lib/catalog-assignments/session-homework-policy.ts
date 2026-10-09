export function requireStudentTimeZone(timeZone: string | null): string {
  if (!timeZone) throw new Error("Student timezone is required");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    throw new Error("Student timezone is invalid");
  }
  return timeZone;
}

function localParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function uniqueLocalInstant(target: ReturnType<typeof localParts>, timeZone: string): string {
  const naiveUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
  const matches: Date[] = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = new Date(naiveUtc - offset * 60_000);
    const parts = localParts(candidate, timeZone);
    if (
      Object.keys(target).every(
        (key) => parts[key as keyof typeof target] === target[key as keyof typeof target]
      )
    )
      matches.push(candidate);
  }
  if (matches.length !== 1) throw new Error("Student local time is ambiguous or unavailable");
  return matches[0].toISOString();
}

export function calendarDateInZone(
  instant: string | Date,
  recordedTimeZone: string | null
): string {
  const zone = requireStudentTimeZone(recordedTimeZone);
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (!Number.isFinite(date.getTime())) throw new Error("Date is invalid");
  const local = localParts(date, zone);
  return `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}

/** Pins the deadline at 23:59 on the day before the session in the student's recorded zone. */
export function sessionHomeworkDeadline(
  bookingId: string,
  scheduledStart: string,
  recordedTimeZone: string | null
) {
  const studentTimeZone = requireStudentTimeZone(recordedTimeZone);
  const start = new Date(scheduledStart);
  if (!Number.isFinite(start.getTime())) throw new Error("Session start is invalid");
  const localSession = localParts(start, studentTimeZone);
  const prior = new Date(Date.UTC(localSession.year, localSession.month - 1, localSession.day - 1));
  const target = {
    year: prior.getUTCFullYear(),
    month: prior.getUTCMonth() + 1,
    day: prior.getUTCDate(),
    hour: 23,
    minute: 59,
  };
  return {
    bookingId,
    sessionStartAtAssignment: start.toISOString(),
    studentTimeZone,
    dueAt: uniqueLocalInstant(target, studentTimeZone),
    dueLocalDate: `${target.year}-${String(target.month).padStart(2, "0")}-${String(target.day).padStart(2, "0")}`,
  };
}

/** The separate notice grace ends at 08:00 on the linked session's local calendar day. */
export function sessionHomeworkNoticeGrace(
  sessionStartAtAssignment: string,
  recordedTimeZone: string | null
): string {
  const zone = requireStudentTimeZone(recordedTimeZone);
  const start = new Date(sessionStartAtAssignment);
  if (!Number.isFinite(start.getTime())) throw new Error("Session start is invalid");
  return uniqueLocalInstant({ ...localParts(start, zone), hour: 8, minute: 0 }, zone);
}

export function sessionLinkState(
  originalStart: string,
  currentStart: string,
  currentStatus: string
) {
  if (currentStatus !== "scheduled") return "cancelled" as const;
  return new Date(originalStart).getTime() === new Date(currentStart).getTime()
    ? ("scheduled" as const)
    : ("rescheduled" as const);
}

/** Late answers stay recorded; this only classifies the original timestamp. */
export function attemptTiming(answeredAt: string, dueAt: string) {
  return new Date(answeredAt).getTime() <= new Date(dueAt).getTime()
    ? ("on_time" as const)
    : ("late" as const);
}
