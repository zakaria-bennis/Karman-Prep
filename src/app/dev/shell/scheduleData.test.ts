import { describe, expect, it } from "vitest";
import {
  DAY,
  HOUR,
  MIN,
  RULES,
  changeOf,
  choices,
  doorOf,
  expiresAt,
  hours,
  lengthsFor,
  movesLeft,
  priceOf,
  recordingUntil,
  standIn,
  weekStart,
  weeklyAfter,
  type Account,
  type Session,
} from "./scheduleData";
import { TODAY } from "./progressData";

// noon on the page's own "today" (a Sunday)
const NOW = TODAY.getTime() + 12 * HOUR;
const fresh = (pack: "private-10" | "private-20" = "private-20") => standIn(pack, NOW);
const booked = (a: Account) => a.sessions.filter((s) => s.state === "booked");

describe("hours", () => {
  it("counts hours, not sessions: used, booked and left add up to what was bought", () => {
    const h = hours(fresh());
    expect(h.total).toBe(20);
    expect(h.used + h.booked + h.left).toBe(20);
    // 60 + 90 + 60 + 60 + 60 minutes behind, 60 + 90 ahead
    expect(h.used).toBe(5.5);
    expect(h.booked).toBe(2.5);
  });

  it("a canceled session gives its hours back", () => {
    const a = fresh();
    const before = hours(a).left;
    a.sessions = a.sessions.map((s) => (s.state === "booked" ? { ...s, state: "canceled" } : s));
    expect(hours(a).left).toBe(before + 2.5);
  });

  it("a missed session uses its hours", () => {
    const a = fresh();
    const first = booked(a)[0];
    const before = hours(a).left;
    a.sessions = a.sessions.map((s) => (s.id === first.id ? { ...s, state: "missed" } : s));
    expect(hours(a).left).toBe(before);
    expect(hours(a).booked).toBe(1.5);
  });

  it("when the tutor misses one, 30 minutes come on top", () => {
    const a = fresh();
    a.bonusMinutes = RULES.tutorMissMinutes;
    expect(hours(a).total).toBe(20.5);
  });

  it("run out 12 months after they were bought", () => {
    const a = fresh();
    const end = new Date(expiresAt(a));
    const begun = new Date(a.boughtAt);
    expect(end.getFullYear()).toBe(begun.getFullYear() + 1);
    expect(end.getMonth()).toBe(begun.getMonth());
  });

  it("an extra hour is the price in the offer file, for both packages", () => {
    expect(priceOf(1)).toBe("$149.50");
    expect(priceOf(2)).toBe("$299");
  });
});

describe("booking", () => {
  it("offers nothing sooner than 24 hours or later than 4 weeks", () => {
    const days = choices(fresh(), NOW, 60);
    const all = days.flatMap((d) => d.times);
    expect(all.length).toBeGreaterThan(20);
    expect(Math.min(...all)).toBeGreaterThanOrEqual(NOW + 24 * HOUR);
    expect(Math.max(...all)).toBeLessThanOrEqual(NOW + 28 * DAY);
  });

  it("never offers a time that runs into one of the student's own sessions", () => {
    const a = fresh();
    for (const minutes of [60, 90, 120] as const)
      for (const t of choices(a, NOW, minutes).flatMap((d) => d.times))
        for (const s of booked(a))
          expect(t + minutes * MIN <= s.start || t >= s.start + s.minutes * MIN).toBe(true);
  });

  it("a longer session has no more open times than a shorter one", () => {
    const a = fresh();
    const count = (m: 60 | 90 | 120) => choices(a, NOW, m).flatMap((d) => d.times).length;
    expect(count(90)).toBeLessThanOrEqual(count(60));
    expect(count(120)).toBeLessThanOrEqual(count(90));
  });

  it("Private 10 books 60 minutes only, and one session a week", () => {
    expect(lengthsFor("private-10")).toEqual([60]);
    expect(lengthsFor("private-20")).toEqual([60, 90, 120]);
    const a = fresh("private-10");
    const taken = weekStart(booked(a)[0].start);
    const days = choices(a, NOW, 60);
    for (const d of days.filter((d) => weekStart(d.day) === taken)) {
      expect(d.times).toEqual([]);
      expect(d.why).toBe("week");
    }
    expect(days.some((d) => weekStart(d.day) !== taken && d.times.length > 0)).toBe(true);
  });

  it("moving a Private 10 session may land in its own week", () => {
    const a = fresh("private-10");
    const session = booked(a)[0];
    const days = choices(a, NOW, 60, session);
    expect(
      days.some((d) => weekStart(d.day) === weekStart(session.start) && d.times.length > 0)
    ).toBe(true);
  });

  it("offers nothing when the hours left are fewer than the session", () => {
    const a = standIn("private-20", NOW, { empty: true });
    expect(hours(a).left).toBe(0);
    const days = choices(a, NOW, 60);
    expect(days.every((d) => d.times.length === 0 && d.why === "hours")).toBe(true);
  });

  it("the weekly slot repeats only on open weeks, inside four weeks, within the hours left", () => {
    const a = fresh();
    const first = choices(a, NOW, 60).find((d) => d.times.length > 0)!.times[0];
    const more = weeklyAfter(a, NOW, first, 60);
    expect(more.length).toBeLessThanOrEqual(3);
    for (const t of more) {
      expect(t).toBeLessThanOrEqual(NOW + 28 * DAY);
      expect(new Date(t).getDay()).toBe(new Date(first).getDay());
      expect(new Date(t).getHours()).toBe(new Date(first).getHours());
    }
  });
});

describe("changing a session", () => {
  const session = (inHours: number): Session => ({
    id: "x",
    start: NOW + inHours * HOUR,
    minutes: 60,
    focus: [],
    state: "booked",
  });

  it("with more than 24 hours to go it can be moved or canceled, and the pass is untouched", () => {
    const c = changeOf(fresh(), session(30), NOW);
    expect(c).toMatchObject({ late: false, move: true, cancel: true });
  });

  it("inside 24 hours it takes the one free pass", () => {
    const a = fresh();
    expect(changeOf(a, session(5), NOW)).toMatchObject({ late: true, move: true, cancel: true });
    a.latePass = false;
    expect(changeOf(a, session(5), NOW)).toMatchObject({ move: false, cancel: false, why: "pass" });
  });

  it("three moves a month: the fourth is refused, canceling is not", () => {
    const a = fresh();
    a.moves = [NOW - DAY, NOW - 2 * DAY, NOW - 3 * DAY];
    expect(movesLeft(a, NOW)).toBe(0);
    expect(changeOf(a, session(60), NOW)).toMatchObject({
      move: false,
      cancel: true,
      why: "moves",
    });
  });

  it("last month's moves do not count", () => {
    const a = fresh();
    a.moves = [NOW - 40 * DAY, NOW - 41 * DAY, NOW - 42 * DAY];
    expect(movesLeft(a, NOW)).toBe(3);
  });

  it("once it has begun it cannot be changed", () => {
    expect(changeOf(fresh(), session(-0.1), NOW)).toMatchObject({ move: false, cancel: false });
  });
});

describe("the day of a session", () => {
  const s: Session = { id: "x", start: NOW, minutes: 60, focus: [], state: "booked" };

  it("Join opens 5 minutes before", () => {
    expect(doorOf(s, NOW - 6 * MIN)).toBe("early");
    expect(doorOf(s, NOW - 5 * MIN)).toBe("open");
  });

  it("there are 10 minutes of grace, then it is closed", () => {
    expect(doorOf(s, NOW + 10 * MIN)).toBe("open");
    expect(doorOf(s, NOW + 10 * MIN + 1)).toBe("closed");
  });

  it("someone who joined stays in until the booked end, which does not move", () => {
    const inside = { ...s, joined: true };
    expect(doorOf(inside, NOW + 59 * MIN)).toBe("in");
    expect(doorOf(inside, NOW + 60 * MIN)).toBe("over");
  });

  it("a recording is kept for 6 months", () => {
    const until = new Date(recordingUntil(s));
    const months =
      (until.getFullYear() - new Date(NOW).getFullYear()) * 12 +
      until.getMonth() -
      new Date(NOW).getMonth();
    expect(months).toBe(6);
  });
});
