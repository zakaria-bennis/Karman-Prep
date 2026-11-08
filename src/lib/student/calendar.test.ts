import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIME_ZONE,
  changeFailedMessage,
  dayIn,
  dayLabel,
  insideChangeWindow,
  mark,
  minutesBetween,
  monthGrid,
  safeTimeZone,
  whenText,
  type MarkKind,
} from "./calendar";

// Sunday, Nov 8 2026, 2:15 PM in Chicago.
const NOW = Date.parse("2026-11-08T20:15:00Z");
const TZ = "America/Chicago";

describe("student calendar", () => {
  it("names days relative to today in the student's zone", () => {
    expect(whenText("2026-11-08T22:00:00Z", NOW, TZ)).toBe("Today, 4:00 PM");
    expect(whenText("2026-11-09T22:00:00Z", NOW, TZ)).toBe("Tomorrow, 4:00 PM");
    expect(whenText("2026-11-12T22:00:00Z", NOW, TZ)).toBe("Thu, Nov 12, 4:00 PM");
    // 11 PM Chicago on the 8th is already the 9th in New York.
    expect(dayIn("2026-11-09T05:00:00Z", TZ)).toBe("2026-11-08");
    expect(dayIn("2026-11-09T05:00:00Z", "America/New_York")).toBe("2026-11-09");
  });

  it("falls back to Central time for a missing or broken zone", () => {
    expect(safeTimeZone(null)).toBe(DEFAULT_TIME_ZONE);
    expect(safeTimeZone("Not/A_Zone")).toBe(DEFAULT_TIME_ZONE);
    expect(safeTimeZone("Europe/Paris")).toBe("Europe/Paris");
  });

  it("knows the 24-hour change window and session length", () => {
    expect(insideChangeWindow("2026-11-09T19:00:00Z", NOW)).toBe(true);
    expect(insideChangeWindow("2026-11-09T21:00:00Z", NOW)).toBe(false);
    expect(minutesBetween("2026-11-09T21:00:00Z", "2026-11-09T22:00:00Z")).toBe(60);
  });

  it("explains a failed change plainly", () => {
    expect(changeFailedMessage("cancel", 502)).toMatch(/aren.t available right now/);
    expect(changeFailedMessage("cancel", null)).toMatch(/Email your tutor/);
    expect(changeFailedMessage("move", 403)).toMatch(/already moved once/);
    expect(changeFailedMessage("cancel", 409)).toMatch(/Refresh/);
  });

  it("lays out the month from Sunday with marks", () => {
    const marks = new Map<string, Set<MarkKind>>();
    mark(marks, "2026-11-12", "test");
    mark(marks, "2026-11-12", "session");
    const grid = monthGrid("2026-11-08", marks);
    expect(grid.label).toBe("November 2026");
    expect(grid.lead).toBe(0); // Nov 1 2026 is a Sunday
    expect(grid.days).toHaveLength(30);
    const d12 = grid.days[11];
    expect(d12.marks).toEqual(["session", "test"]);
    expect(grid.days[7].isToday).toBe(true);
    expect(dayLabel(d12, grid.label)).toBe("November 12: a session, a test due");
    expect(dayLabel(grid.days[7], grid.label)).toBe("November 8, today: nothing booked");
    expect(monthGrid("2027-02-10", new Map()).days).toHaveLength(28);
    expect(monthGrid("2027-02-10", new Map()).lead).toBe(1); // Feb 1 2027 is a Monday
  });
});
