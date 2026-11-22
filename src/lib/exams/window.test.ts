import { describe, expect, it } from "vitest";
import { examWindow, howToOpen, localParts, validTimeZone, zonedInstant } from "./window";

const CHICAGO = "America/Chicago";

describe("the Saturday exam window", () => {
  it("opens at 6 am Saturday and closes at midnight, in the student's zone", () => {
    // Saturday 2026-11-28, Chicago is UTC-6 in November.
    expect(examWindow(new Date("2026-11-28T11:59:00Z"), CHICAGO).open).toBe(false); // 5:59 am
    expect(examWindow(new Date("2026-11-28T12:00:00Z"), CHICAGO).open).toBe(true); // 6:00 am
    expect(examWindow(new Date("2026-11-29T05:59:00Z"), CHICAGO).open).toBe(true); // 11:59 pm
    expect(examWindow(new Date("2026-11-29T06:00:00Z"), CHICAGO).open).toBe(false); // midnight
  });

  it("names this Saturday's window while open and the next one otherwise", () => {
    const open = examWindow(new Date("2026-11-28T15:00:00Z"), CHICAGO);
    expect(open.opensAt.toISOString()).toBe("2026-11-28T12:00:00.000Z");
    expect(open.closesAt.toISOString()).toBe("2026-11-29T06:00:00.000Z");
    // Sunday after the window: next Saturday.
    const sunday = examWindow(new Date("2026-11-29T15:00:00Z"), CHICAGO);
    expect(sunday.open).toBe(false);
    expect(sunday.opensAt.toISOString()).toBe("2026-12-05T12:00:00.000Z");
    // Friday evening: tomorrow.
    const friday = examWindow(new Date("2026-11-28T02:00:00Z"), CHICAGO);
    expect(friday.opensAt.toISOString()).toBe("2026-11-28T12:00:00.000Z");
  });

  it("follows the student's own zone, not the server's", () => {
    // 6:30 am Saturday in Tokyo is 9:30 pm Friday UTC.
    const at = new Date("2026-11-27T21:30:00Z");
    expect(examWindow(at, "Asia/Tokyo").open).toBe(true);
    expect(examWindow(at, "America/New_York").open).toBe(false);
  });

  it("keeps 6 am across daylight saving changes", () => {
    // Saturday 2027-03-13 is the day before the US spring change; 2026-10-31 the day before the fall one.
    expect(examWindow(new Date("2027-03-13T12:00:00Z"), CHICAGO).opensAt.toISOString()).toBe(
      "2027-03-13T12:00:00.000Z"
    );
    expect(examWindow(new Date("2027-03-20T11:00:00Z"), CHICAGO).opensAt.toISOString()).toBe(
      "2027-03-20T11:00:00.000Z"
    );
    expect(examWindow(new Date("2026-10-31T11:00:00Z"), CHICAGO).opensAt.toISOString()).toBe(
      "2026-10-31T11:00:00.000Z"
    );
  });

  it("falls back to Central time for an unknown zone", () => {
    expect(validTimeZone("Mars/Olympus")).toBeNull();
    expect(validTimeZone(CHICAGO)).toBe(CHICAGO);
    expect(examWindow(new Date("2026-11-28T12:00:00Z"), "Mars/Olympus").zone).toBe(CHICAGO);
  });

  it("reads wall-clock parts and finds instants", () => {
    expect(localParts(new Date("2026-11-28T12:00:00Z"), CHICAGO)).toMatchObject({
      weekday: 6,
      hour: 6,
      day: 28,
    });
    expect(zonedInstant("Asia/Kolkata", 2026, 11, 28, 6).toISOString()).toBe(
      "2026-11-28T00:30:00.000Z"
    );
  });

  it("opens by window first, then the test switch, then a pass", () => {
    const closed = examWindow(new Date("2026-11-25T15:00:00Z"), CHICAGO);
    const open = examWindow(new Date("2026-11-28T15:00:00Z"), CHICAGO);
    expect(howToOpen({ window: open, testSwitch: true, passes: 2 })).toBe("window");
    expect(howToOpen({ window: closed, testSwitch: true, passes: 2 })).toBe("test-switch");
    expect(howToOpen({ window: closed, testSwitch: false, passes: 1 })).toBe("pass");
    expect(howToOpen({ window: closed, testSwitch: false, passes: 0 })).toBeNull();
  });
});
