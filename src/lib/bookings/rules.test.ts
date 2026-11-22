import { describe, expect, it } from "vitest";
import {
  BOOKING,
  CALENDAR_LENGTH,
  FALLBACK_ZONE,
  checkBook,
  checkCancel,
  checkMove,
  countedMoves,
  hoursLedger,
  inWindow,
  isLate,
  latePassLeft,
  lengthOf,
  lengthsFor,
  monthIn,
  movesLeftIn,
  overWeek,
  packHours,
  refusal,
  stateOfBooking,
  weekIn,
  zoneOr,
  type Change,
} from "./rules";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NY = "America/New_York";
// Wednesday, November 18, 2026, noon in New York (Eastern is five hours behind UTC in November)
const NOW = Date.UTC(2026, 10, 18, 17);
const ny = (month: number, day: number, hour: number, minute = 0) =>
  Date.UTC(2026, month - 1, day, hour + (month >= 11 || month <= 2 ? 5 : 4), minute);

const change = (at: number, over: Partial<Change> = {}): Change => ({
  kind: "move",
  at,
  byTutor: false,
  usedLatePass: false,
  passBack: false,
  ...over,
});

describe("the package", () => {
  it("takes its hours and sessions a week from the offer file", () => {
    expect(packHours("private-10")).toBe(10);
    expect(packHours("private-20")).toBe(20);
    expect(lengthsFor("private-10")).toEqual([60]);
    expect(lengthsFor("private-20")).toEqual([60, 90, 120]);
  });

  it("reads a stored session's length as one of the three", () => {
    expect(lengthOf(60)).toBe(60);
    expect(lengthOf(58)).toBe(60);
    expect(lengthOf(90)).toBe(90);
    expect(lengthOf(120)).toBe(120);
  });
});

describe("hours", () => {
  const sessions = [
    { minutes: 60, state: "done" as const },
    { minutes: 90, state: "missed" as const },
    { minutes: 120, state: "booked" as const },
    { minutes: 60, state: "canceled" as const },
  ];

  it("counts hours, not sessions: a canceled session gives its hours back", () => {
    expect(hoursLedger({ bought: 10, bonusMinutes: 0, sessions })).toEqual({
      total: 10,
      used: 2.5,
      booked: 2,
      left: 5.5,
    });
  });

  it("never goes below nothing left", () => {
    expect(hoursLedger({ bought: 2, bonusMinutes: 0, sessions }).left).toBe(0);
  });

  it("counts a session held past its end, and a late cancel whose credit was lost, as used", () => {
    const at = { start: NOW - 2 * HOUR, minutes: 60, creditForfeited: false };
    expect(stateOfBooking({ ...at, status: "scheduled" }, NOW)).toBe("done");
    expect(stateOfBooking({ ...at, status: "scheduled", start: NOW + HOUR }, NOW)).toBe("booked");
    // in session now: still booked until it ends
    expect(stateOfBooking({ ...at, status: "scheduled", start: NOW - 30 * MIN }, NOW)).toBe(
      "booked"
    );
    expect(stateOfBooking({ ...at, status: "completed" }, NOW)).toBe("done");
    expect(stateOfBooking({ ...at, status: "no_show" }, NOW)).toBe("missed");
    expect(stateOfBooking({ ...at, status: "cancelled" }, NOW)).toBe("canceled");
    expect(stateOfBooking({ ...at, status: "cancelled", creditForfeited: true }, NOW)).toBe(
      "missed"
    );
  });
});

describe("the student's own calendar", () => {
  it("falls back to Central for a time zone that does not exist", () => {
    expect(zoneOr("Mars/Olympus")).toBe(FALLBACK_ZONE);
    expect(zoneOr(undefined)).toBe(FALLBACK_ZONE);
    expect(zoneOr(NY)).toBe(NY);
  });

  it("reads the month on the student's clock, not the server's", () => {
    // 11:30 pm on Halloween in New York is already November in UTC
    const halloween = ny(10, 31, 23, 30);
    expect(monthIn(halloween, NY)).toBe("2026-10");
    expect(monthIn(halloween, "UTC")).toBe("2026-11");
  });

  it("runs weeks Sunday to Saturday on the student's clock", () => {
    expect(weekIn(NOW, NY)).toBe("2026-11-15");
    expect(weekIn(ny(11, 21, 23, 59), NY)).toBe("2026-11-15");
    expect(weekIn(ny(11, 22, 0, 0), NY)).toBe("2026-11-22");
    // 11 pm Saturday in New York is Sunday in UTC
    expect(weekIn(ny(11, 21, 23), "UTC")).toBe("2026-11-22");
  });
});

describe("the booking window", () => {
  it("opens 24 hours ahead, with two minutes' grace for clocks", () => {
    expect(inWindow(NOW + 24 * HOUR, NOW)).toBe(true);
    expect(inWindow(NOW + 24 * HOUR - 2 * MIN, NOW)).toBe(true);
    expect(inWindow(NOW + 24 * HOUR - 3 * MIN, NOW)).toBe(false);
    expect(inWindow(NOW + HOUR, NOW)).toBe(false);
  });

  it("closes 4 weeks ahead", () => {
    expect(inWindow(NOW + 28 * DAY, NOW)).toBe(true);
    expect(inWindow(NOW + 28 * DAY + 3 * MIN, NOW)).toBe(false);
  });
});

describe("booking", () => {
  const base = {
    pack: "private-20" as const,
    minutes: 60,
    start: NOW + 3 * DAY,
    now: NOW,
    zone: NY,
    left: 10,
    others: [],
  };

  it("lets Private 20 book 60, 90 or 120 minutes", () => {
    for (const minutes of [60, 90, 120]) expect(checkBook({ ...base, minutes }).ok).toBe(true);
  });

  it("books Private 10 for 60 minutes only", () => {
    expect(checkBook({ ...base, pack: "private-10" }).ok).toBe(true);
    for (const minutes of [90, 120])
      expect(checkBook({ ...base, pack: "private-10", minutes })).toMatchObject({
        ok: false,
        why: "length",
        message: "Private 10 sessions are 60 minutes.",
      });
  });

  it("refuses any other length", () => {
    for (const minutes of [30, 45, 75, 150])
      expect(checkBook({ ...base, minutes })).toMatchObject({ ok: false, why: "length" });
  });

  it("refuses a time sooner than 24 hours or later than 4 weeks", () => {
    expect(checkBook({ ...base, start: NOW + 23 * HOUR })).toMatchObject({ why: "window" });
    expect(checkBook({ ...base, start: NOW + 29 * DAY })).toMatchObject({ why: "window" });
  });

  it("needs the session's whole length in hours left", () => {
    expect(checkBook({ ...base, left: 1 }).ok).toBe(true);
    expect(checkBook({ ...base, left: 1, minutes: 90 })).toMatchObject({
      why: "hours",
      message: "Not enough hours left for this length.",
    });
    expect(checkBook({ ...base, left: 1.5, minutes: 90 }).ok).toBe(true);
    expect(checkBook({ ...base, left: 1.5, minutes: 120 })).toMatchObject({ why: "hours" });
    expect(checkBook({ ...base, left: 0.5 })).toMatchObject({ why: "hours" });
    expect(checkBook({ ...base, left: 0 })).toMatchObject({ why: "hours" });
  });

  it("holds Private 10 to one session a week, Sunday to Saturday on the student's clock", () => {
    const p10 = { ...base, pack: "private-10" as const };
    // Friday the 20th is in the week of the 15th, like Monday the 16th
    const friday = ny(11, 20, 16);
    expect(checkBook({ ...p10, start: friday, others: [{ start: ny(11, 16, 16) }] })).toMatchObject(
      { why: "week", status: 409 }
    );
    // a session held earlier in the week counts too
    expect(checkBook({ ...p10, start: friday, others: [{ start: ny(11, 15, 9) }] })).toMatchObject({
      why: "week",
    });
    // Sunday the 22nd begins the next week
    expect(
      checkBook({ ...p10, start: ny(11, 22, 16), others: [{ start: ny(11, 16, 16) }] }).ok
    ).toBe(true);
    // a Saturday-night session in New York belongs to that week, though it is Sunday in UTC
    expect(
      checkBook({ ...p10, start: ny(11, 23, 16), others: [{ start: ny(11, 28, 23) }] })
    ).toMatchObject({ why: "week" });
  });

  it("puts no weekly cap on Private 20", () => {
    const others = [{ start: ny(11, 23, 9) }, { start: ny(11, 24, 9) }];
    expect(checkBook({ ...base, start: ny(11, 25, 9), others }).ok).toBe(true);
    expect(overWeek("private-20", ny(11, 25, 9), others, NY)).toBe(false);
  });
});

describe("the 24-hour edge", () => {
  it("is late with less than 24 hours to go, and the last two minutes go the student's way", () => {
    expect(isLate(NOW + 24 * HOUR, NOW)).toBe(false);
    expect(isLate(NOW + 24 * HOUR - 1, NOW)).toBe(true);
    const grace = BOOKING.graceMinutes * MIN;
    expect(isLate(NOW + 24 * HOUR - grace, NOW, grace)).toBe(false);
    expect(isLate(NOW + 24 * HOUR - grace - 1, NOW, grace)).toBe(true);
  });

  it("a cancel exactly at the edge does not spend the pass; a minute past it does", () => {
    const at = { now: NOW, byTutor: false, latePass: true };
    expect(checkCancel({ ...at, start: NOW + 24 * HOUR })).toEqual({
      ok: true,
      late: false,
      usesPass: false,
    });
    expect(checkCancel({ ...at, start: NOW + 24 * HOUR - 3 * MIN })).toEqual({
      ok: true,
      late: true,
      usesPass: true,
    });
  });
});

describe("the late pass", () => {
  it("is there until a change spends it", () => {
    expect(latePassLeft([], null)).toBe(true);
    expect(latePassLeft([change(NOW - DAY, { kind: "cancel" })], null)).toBe(true);
    expect(latePassLeft([change(NOW - DAY, { usedLatePass: true })], null)).toBe(false);
  });

  it("comes with each package: one spent before this package began does not count", () => {
    const spent = [change(NOW - 30 * DAY, { usedLatePass: true, kind: "cancel" })];
    expect(latePassLeft(spent, NOW - 10 * DAY)).toBe(true);
    expect(latePassLeft(spent, NOW - 40 * DAY)).toBe(false);
  });

  it("comes back when the tutor gives it back", () => {
    expect(latePassLeft([change(NOW - DAY, { usedLatePass: true, passBack: true })], null)).toBe(
      true
    );
    expect(
      latePassLeft(
        [
          change(NOW - 5 * DAY, { usedLatePass: true, passBack: true }),
          change(NOW - DAY, { usedLatePass: true }),
        ],
        null
      )
    ).toBe(false);
  });

  it("lets a late cancel through once, then refuses it: the session counts as used", () => {
    const late = { start: NOW + 5 * HOUR, now: NOW, byTutor: false };
    expect(checkCancel({ ...late, latePass: true })).toEqual({
      ok: true,
      late: true,
      usesPass: true,
    });
    expect(checkCancel({ ...late, latePass: false })).toMatchObject({
      ok: false,
      why: "pass",
      status: 403,
    });
  });

  it("is not needed with more than 24 hours to go", () => {
    expect(
      checkCancel({ start: NOW + 2 * DAY, now: NOW, byTutor: false, latePass: false })
    ).toEqual({ ok: true, late: false, usesPass: false });
  });

  it("lets a late move through once, then refuses it", () => {
    const move = {
      pack: "private-20" as const,
      session: { start: NOW + 5 * HOUR, moved: false },
      to: NOW + 3 * DAY,
      now: NOW,
      zone: NY,
      byTutor: false,
      moves: [],
      others: [],
    };
    expect(checkMove({ ...move, latePass: true })).toEqual({
      ok: true,
      late: true,
      usesPass: true,
    });
    expect(checkMove({ ...move, latePass: false })).toMatchObject({ ok: false, why: "pass" });
  });
});

describe("moves", () => {
  const move = {
    pack: "private-20" as const,
    session: { start: NOW + 3 * DAY, moved: false },
    to: NOW + 5 * DAY,
    now: NOW,
    zone: NY,
    byTutor: false,
    latePass: true,
    moves: [] as number[],
    others: [],
  };

  it("three a month across all sessions: the fourth is refused, a cancel is not", () => {
    const three = [NOW - DAY, NOW - 2 * DAY, NOW - 3 * DAY];
    expect(movesLeftIn(three.slice(0, 2), NOW, NY)).toBe(1);
    expect(checkMove({ ...move, moves: three.slice(0, 2) }).ok).toBe(true);
    expect(checkMove({ ...move, moves: three })).toMatchObject({
      ok: false,
      why: "moves",
      message: "You have used this month's 3 moves. They come back on the 1st.",
    });
    expect(
      checkCancel({ start: move.session.start, now: NOW, byTutor: false, latePass: true }).ok
    ).toBe(true);
  });

  it("come back on the 1st of the month, on the student's own clock", () => {
    // three moves on Halloween night in New York: still October there
    const halloween = [ny(10, 31, 23, 0), ny(10, 31, 23, 15), ny(10, 31, 23, 30)];
    const nov2 = ny(11, 2, 9);
    expect(movesLeftIn(halloween, nov2, NY)).toBe(3);
    // the same moves are November's on a clock in London
    expect(movesLeftIn(halloween, nov2, "Europe/London")).toBe(0);
    // and on Halloween itself, New York's October has none left
    expect(movesLeftIn(halloween, ny(10, 31, 23, 45), NY)).toBe(0);
  });

  it("count by when each move was made, not by the session's new date", () => {
    // moved on January 31 to a session in February: January's move
    const jan31 = Date.UTC(2027, 0, 31, 20);
    expect(movesLeftIn([jan31], Date.UTC(2027, 1, 1, 20), NY)).toBe(3);
    expect(movesLeftIn([jan31], Date.UTC(2027, 0, 31, 23), NY)).toBe(2);
  });

  it("count the student's moves only: not the tutor's, and not cancels", () => {
    const changes = [
      change(NOW - DAY),
      change(NOW - DAY, { byTutor: true }),
      change(NOW - DAY, { kind: "cancel" }),
    ];
    expect(countedMoves(changes)).toEqual([NOW - DAY]);
  });

  it("move a session once only (the bookings table's own cap stops daisy chaining)", () => {
    expect(checkMove({ ...move, session: { ...move.session, moved: true } })).toMatchObject({
      ok: false,
      why: "moved",
    });
  });

  it("need the new time inside the booking window", () => {
    expect(checkMove({ ...move, to: NOW + 20 * HOUR })).toMatchObject({ why: "window" });
    expect(checkMove({ ...move, to: NOW + 30 * DAY })).toMatchObject({ why: "window" });
  });

  it("keep Private 10 to one session a week, but may land in the session's own week", () => {
    const p10 = { ...move, pack: "private-10" as const };
    const session = { start: ny(11, 24, 16), moved: false };
    // the student's other session is in the week of the 29th
    const others = [{ start: ny(11, 30, 16) }];
    expect(checkMove({ ...p10, session, others, to: ny(11, 26, 16) }).ok).toBe(true);
    expect(checkMove({ ...p10, session, others, to: ny(12, 2, 16) })).toMatchObject({
      why: "week",
    });
  });

  it("cannot change a session that has begun", () => {
    const begun = { start: NOW - MIN, moved: false };
    expect(checkMove({ ...move, session: begun })).toMatchObject({ why: "started" });
    expect(
      checkCancel({ start: NOW - MIN, now: NOW, byTutor: false, latePass: true })
    ).toMatchObject({ why: "started" });
  });
});

describe("the tutor", () => {
  it("can always move or cancel, and it never costs the student", () => {
    const worst = {
      pack: "private-10" as const,
      session: { start: NOW + HOUR, moved: true },
      to: NOW + 2 * HOUR,
      now: NOW,
      zone: NY,
      byTutor: true,
      latePass: false,
      moves: [NOW - DAY, NOW - 2 * DAY, NOW - 3 * DAY],
      others: [{ start: NOW + 3 * HOUR }],
    };
    expect(checkMove(worst)).toEqual({ ok: true, late: true, usesPass: false });
    expect(checkCancel({ start: NOW + HOUR, now: NOW, byTutor: true, latePass: false })).toEqual({
      ok: true,
      late: true,
      usesPass: false,
    });
  });

  it("never spends the student's pass", () => {
    expect(latePassLeft([change(NOW - DAY, { byTutor: true, usedLatePass: true })], null)).toBe(
      true
    );
  });
});

describe("what a refusal says", () => {
  it("is one short plain sentence, with no dashes", () => {
    const whys = ["plan", "length", "window", "week", "hours", "started", "moved", "pass", "moves"];
    for (const why of whys) {
      const { message, status } = refusal(why as Parameters<typeof refusal>[0]);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(message.length).toBeLessThan(120);
      expect(message).not.toMatch(/[–—]/);
    }
    expect(CALENDAR_LENGTH).toBe("Your tutor's calendar takes 60-minute sessions for now.");
  });
});
