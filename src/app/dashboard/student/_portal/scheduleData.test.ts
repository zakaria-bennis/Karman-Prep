import { describe, expect, it, vi } from "vitest";

// The portal's today is the real one; these rules are checked on the Sunday they were written for
// (Nov 15, 2026), set before the modules below read the clock.
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 15, 9) });
});
import {
  DAY,
  EXAM_REVIEW,
  HOUR,
  MIN,
  PACING,
  RECOMMENDED,
  RULES,
  changeOf,
  choices,
  doorOf,
  expiresAt,
  hours,
  lengthsFor,
  meetingOf,
  movesLeft,
  priceOf,
  recommend,
  recordingUntil,
  standIn,
  subjectOf,
  tutorStarts,
  weekStart,
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

describe("what to work on", () => {
  const pick = (skill: string, subject: "rw" | "math", level: number) => ({
    skill,
    subject,
    level,
  });

  it("is five things: three skills, the weakest first, then pacing and an exam's review", () => {
    expect(RECOMMENDED).toHaveLength(5);
    const skills = RECOMMENDED.slice(0, 3);
    for (let i = 1; i < skills.length; i++)
      expect(skills[i].level!).toBeGreaterThanOrEqual(skills[i - 1].level!);
    expect(RECOMMENDED.slice(3).map((p) => p.skill)).toEqual([PACING, EXAM_REVIEW]);
  });

  it("gives pacing the student's pace now, never a level", () => {
    const pacing = RECOMMENDED.find((p) => p.skill === PACING)!;
    expect(pacing.level).toBeUndefined();
    expect(pacing.value).toMatch(/^\d:\d\d a question$/);
  });

  it("does not offer test-taking strategy", () => {
    expect(RECOMMENDED.map((p) => p.skill.toLowerCase()).join(" ")).not.toContain("strategy");
  });

  it("takes the weakest skills before anything stronger, whatever the subject", () => {
    const list = recommend(
      [pick("a", "math", 3), pick("b", "rw", 0), pick("c", "rw", 0), pick("d", "math", 1)],
      3
    );
    expect(list.map((p) => p.skill)).toEqual(["b", "c", "d"]);
  });

  it("lets the subjects take turns among skills on the same level", () => {
    const list = recommend(
      [pick("r1", "rw", 0), pick("r2", "rw", 0), pick("m1", "math", 0), pick("m2", "math", 0)],
      4
    );
    expect(list.map((p) => p.subject)).toEqual(["rw", "math", "rw", "math"]);
  });

  it("knows what each belongs to", () => {
    expect(subjectOf("Solving linear equations")).toBe("math");
    expect(subjectOf("Main idea")).toBe("rw");
    expect(subjectOf(PACING)).toBe("test");
    expect(subjectOf(EXAM_REVIEW)).toBe("exam");
  });
});

describe("the tutor's hours", () => {
  // Central time is six hours behind UTC in November, Eastern five
  const central = (day: number, hour: number) => Date.UTC(2026, 10, day, hour + 6);
  const eastern = (day: number, hour: number) => Date.UTC(2026, 10, day, hour + 5);

  it("run from 8 am to midnight on the tutor's clock", () => {
    const day = tutorStarts(central(18, 0), central(19, 0), 60);
    expect(day[0]).toBe(central(18, 8));
    // an hour's session can begin as late as 11 pm
    expect(day.at(-1)).toBe(central(18, 23));
    expect(day).toHaveLength(31);
  });

  it("leave room for the whole session before the tutor's midnight", () => {
    expect(tutorStarts(central(18, 0), central(19, 0), 120).at(-1)).toBe(central(18, 22));
  });

  it("fall under the student's next day once they pass the student's midnight", () => {
    // 11 pm Tuesday for the tutor is midnight Wednesday in New York
    const wednesday = tutorStarts(eastern(18, 0), eastern(19, 0), 60);
    expect(wednesday[0]).toBe(central(17, 23));
    expect(wednesday[0]).toBe(eastern(18, 0));
    // then nothing until 8 am for the tutor, which is 9 am in New York
    expect(wednesday[1]).toBe(eastern(18, 9));
    // and Wednesday's own 11 pm belongs to New York's Thursday
    expect(wednesday).not.toContain(central(18, 23));
    expect(tutorStarts(eastern(19, 0), eastern(20, 0), 60)[0]).toBe(central(18, 23));
  });

  it("are closed on the tutor's Sunday", () => {
    expect(tutorStarts(central(15, 0), central(16, 0), 60)).toEqual([]);
  });
});

describe("the week", () => {
  it("runs Sunday to Saturday", () => {
    const start = new Date(weekStart(NOW));
    expect(start.getDay()).toBe(0);
    expect(start.getHours()).toBe(0);
    // the page's own today is a Sunday: its week begins that day
    expect(start.toDateString()).toBe(new Date(NOW).toDateString());
    expect(new Date(weekStart(NOW + 6 * DAY)).toDateString()).toBe(start.toDateString());
    expect(new Date(weekStart(NOW + 7 * DAY)).toDateString()).not.toBe(start.toDateString());
  });
});

describe("times that are not open", () => {
  it("are still listed, so they can be shown grayed out", () => {
    const a = fresh();
    const day = choices(a, NOW, 60).find(
      (d) => d.slots.some((s) => !s.open) && d.times.length > 0
    )!;
    expect(day.slots.length).toBeGreaterThan(day.times.length);
    expect(day.slots.filter((s) => s.open).map((s) => s.t)).toEqual(day.times);
  });

  it("are all closed on a day a rule shuts", () => {
    const a = fresh("private-10");
    const shut = choices(a, NOW, 60).find((d) => d.why === "week")!;
    expect(shut.slots.length).toBeGreaterThan(0);
    expect(shut.slots.every((s) => !s.open)).toBe(true);
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

  it("Join opens the session's meeting, when it has a safe link", () => {
    expect(meetingOf(s)).toBeNull();
    expect(meetingOf({ ...s, joinUrl: "https://zoom.us/j/123" })).toBe("https://zoom.us/j/123");
    expect(meetingOf({ ...s, joinUrl: "javascript:alert(1)" })).toBeNull();
    expect(meetingOf({ ...s, joinUrl: "not a link" })).toBeNull();
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
