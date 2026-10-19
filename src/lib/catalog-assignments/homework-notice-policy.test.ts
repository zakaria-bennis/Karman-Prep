import { describe, expect, it } from "vitest";
import { decideHomeworkNotice, type LinkedHomeworkNoticeCandidate } from "./homework-notice-policy";
import { sessionHomeworkDeadline, sessionHomeworkNoticeGrace } from "./session-homework-policy";

const one: LinkedHomeworkNoticeCandidate = {
  assignmentId: "assignment-a",
  bookingId: "booking-a",
  studentId: "student-a",
  status: "active",
  bookingStatus: "scheduled",
  sessionStartAtAssignment: "2026-03-08T16:00:00Z",
  currentSessionStart: "2026-03-08T16:00:00Z",
  studentTimeZone: "America/New_York",
  completedAt: null,
};

describe("session homework notice policy", () => {
  it("keeps 23:59 due time distinct from 08:00 grace across DST", () => {
    expect(
      sessionHomeworkDeadline("booking-a", one.sessionStartAtAssignment, one.studentTimeZone).dueAt
    ).toBe("2026-03-08T04:59:00.000Z");
    expect(sessionHomeworkNoticeGrace(one.sessionStartAtAssignment, one.studentTimeZone)).toBe(
      "2026-03-08T12:00:00.000Z"
    );
    expect(sessionHomeworkNoticeGrace("2026-11-01T17:00:00Z", "America/New_York")).toBe(
      "2026-11-01T13:00:00.000Z"
    );
    expect(sessionHomeworkNoticeGrace("2026-10-08T12:00:00Z", "Asia/Kathmandu")).toBe(
      "2026-10-08T02:15:00.000Z"
    );
  });

  it("waits until 8 a.m. and suppresses any completion observed before the final claim", () => {
    expect(decideHomeworkNotice([one], "2026-03-08T11:59:59Z")).toEqual({ kind: "not_ready" });
    expect(decideHomeworkNotice([one], "2026-03-08T12:00:00Z")).toMatchObject({
      kind: "eligible",
      assignmentIds: ["assignment-a"],
      localSessionDate: "2026-03-08",
    });
    expect(
      decideHomeworkNotice(
        [{ ...one, completedAt: "2026-03-08T11:59:00Z" }],
        "2026-03-08T12:00:00Z"
      )
    ).toEqual({ kind: "complete" });
    expect(
      decideHomeworkNotice(
        [{ ...one, completedAt: "2026-03-08T12:01:00Z" }],
        "2026-03-08T12:02:00Z"
      )
    ).toEqual({ kind: "complete" });
  });

  it("suppresses changed bookings, inactive assignments, and missing zones", () => {
    expect(
      decideHomeworkNotice([{ ...one, bookingStatus: "cancelled" }], "2026-03-08T12:00:00Z")
    ).toEqual({ kind: "booking_changed" });
    expect(
      decideHomeworkNotice(
        [{ ...one, currentSessionStart: "2026-03-09T16:00:00Z" }],
        "2026-03-08T12:00:00Z"
      )
    ).toEqual({ kind: "booking_changed" });
    expect(decideHomeworkNotice([{ ...one, status: "cancelled" }], "2026-03-08T12:00:00Z")).toEqual(
      { kind: "inactive" }
    );
    expect(
      decideHomeworkNotice([{ ...one, studentTimeZone: null }], "2026-03-08T12:00:00Z")
    ).toEqual({ kind: "missing_timezone" });
    expect(
      decideHomeworkNotice([{ ...one, studentTimeZone: "Invalid/Zone" }], "2026-03-08T12:00:00Z")
    ).toEqual({ kind: "missing_timezone" });
  });

  it("groups several incomplete sessions on one local day and refuses mixed students", () => {
    const two = {
      ...one,
      assignmentId: "assignment-b",
      sessionStartAtAssignment: "2026-03-08T19:00:00Z",
      currentSessionStart: "2026-03-08T19:00:00Z",
    };
    expect(decideHomeworkNotice([two, one, one], "2026-03-08T12:00:00Z")).toMatchObject({
      kind: "eligible",
      assignmentIds: ["assignment-a", "assignment-b"],
    });
    expect(() =>
      decideHomeworkNotice([one, { ...two, studentId: "student-b" }], "2026-03-08T12:00:00Z")
    ).toThrow("one student");
  });
});
