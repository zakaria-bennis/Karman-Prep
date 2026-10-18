import { describe, expect, it } from "vitest";
import {
  attemptTiming,
  calendarDateInZone,
  sessionHomeworkDeadline,
  sessionLinkState,
} from "./session-homework-policy";

describe("session homework deadline", () => {
  it("pins the preceding student's calendar day across DST and quarter-hour offsets", () => {
    expect(sessionHomeworkDeadline("a", "2026-03-08T16:00:00Z", "America/New_York")).toMatchObject({
      dueLocalDate: "2026-03-07",
      dueAt: "2026-03-08T04:59:00.000Z",
      studentTimeZone: "America/New_York",
    });
    expect(sessionHomeworkDeadline("b", "2026-11-01T17:00:00Z", "America/New_York")).toMatchObject({
      dueLocalDate: "2026-10-31",
      dueAt: "2026-11-01T03:59:00.000Z",
    });
    expect(sessionHomeworkDeadline("c", "2026-10-08T12:00:00Z", "Asia/Kathmandu")).toMatchObject({
      dueLocalDate: "2026-10-07",
      dueAt: "2026-10-07T18:14:00.000Z",
    });
  });

  it("rejects missing timezone and preserves the pinned due time after booking changes", () => {
    expect(() => sessionHomeworkDeadline("a", "2026-10-08T15:00:00Z", null)).toThrow(
      "timezone is required"
    );
    expect(() => sessionHomeworkDeadline("a", "2026-10-08T15:00:00Z", "Unknown/Zone")).toThrow(
      "timezone is invalid"
    );
    const pinned = sessionHomeworkDeadline("a", "2026-10-08T15:00:00Z", "America/Los_Angeles");
    expect(
      sessionLinkState(pinned.sessionStartAtAssignment, "2026-10-09T15:00:00Z", "scheduled")
    ).toBe("rescheduled");
    expect(
      sessionLinkState(pinned.sessionStartAtAssignment, "2026-10-08T15:00:00Z", "cancelled")
    ).toBe("cancelled");
    expect(attemptTiming("2026-10-08T06:59:00Z", pinned.dueAt)).toBe("on_time");
    expect(attemptTiming("2026-10-08T07:00:00Z", pinned.dueAt)).toBe("late");
    expect(pinned.dueAt).toBe("2026-10-08T06:59:00.000Z");
  });

  it("groups a session on the educator's recorded calendar date", () => {
    expect(calendarDateInZone("2026-10-08T01:00:00Z", "America/Los_Angeles")).toBe("2026-10-07");
    expect(calendarDateInZone("2026-10-08T01:00:00Z", "Asia/Kathmandu")).toBe("2026-10-08");
    expect(() => calendarDateInZone("2026-10-08T01:00:00Z", null)).toThrow("timezone is required");
  });
});
