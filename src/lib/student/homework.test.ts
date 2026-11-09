import { describe, expect, it } from "vitest";

import {
  DEFAULT_PACE_SECONDS,
  activeSeconds,
  blendedPace,
  dueText,
  estimateMinutes,
  formatMinutes,
  groupFor,
  groupHomework,
  lateNudge,
  mostUrgent,
  resultText,
  sizeText,
  weekSummary,
  type StudentHomeworkItem,
} from "./homework-model";

// Sunday 8 November 2026, 9:00 AM in Chicago (15:00 UTC).
const NOW = Date.parse("2026-11-08T15:00:00Z");

const item = (over: Partial<StudentHomeworkItem>): StudentHomeworkItem => ({
  key: over.key ?? "tutor:1",
  source: "tutor",
  title: "Practice: Transitions",
  size: { questions: 10 },
  dueOn: "2026-11-08",
  dueAt: null,
  state: "open",
  href: "/learn/practice/rw-skill-transitions",
  note: null,
  from: "David",
  completedAt: null,
  result: null,
  ...over,
});

describe("homework lists", () => {
  it("puts work in Past due, Tonight, Tomorrow, This week and Later", { timeout: 20_000 }, () => {
    expect(groupFor(item({ dueOn: "2026-11-06" }), NOW)).toBe("past");
    expect(groupFor(item({ dueOn: "2026-11-08" }), NOW)).toBe("tonight");
    expect(groupFor(item({ dueOn: "2026-11-09" }), NOW)).toBe("tomorrow");
    expect(groupFor(item({ dueOn: "2026-11-14" }), NOW)).toBe("week");
    expect(groupFor(item({ dueOn: "2026-11-15" }), NOW)).toBe("later");
    expect(groupFor(item({ dueOn: null }), NOW)).toBe("later");
  });

  it("uses the exact due time when there is one", () => {
    expect(groupFor(item({ dueOn: null, dueAt: "2026-11-08T14:00:00Z" }), NOW)).toBe("past");
    expect(groupFor(item({ dueOn: null, dueAt: "2026-11-08T20:00:00Z" }), NOW)).toBe("tonight");
  });

  it("never calls work late that the tutor hasn't opened", () => {
    expect(groupFor(item({ state: "scheduled", dueOn: "2026-11-01" }), NOW)).toBe("later");
    expect(dueText(item({ state: "scheduled", dueOn: "2026-11-01" }), NOW)).toEqual({
      text: "Waiting for your tutor",
      late: false,
    });
    expect(dueText(item({ state: "scheduled", dueOn: "2026-11-11" }), NOW).text).toBe(
      "Opens Wed, Nov 11"
    );
    expect(dueText(item({ state: "locked", dueOn: null }), NOW).text).toBe("Your tutor opens it");
  });

  it("writes the due line", () => {
    expect(dueText(item({ dueOn: "2026-11-06" }), NOW)).toEqual({
      text: "Was due Fri, Nov 6",
      late: true,
    });
    expect(dueText(item({ dueOn: "2026-11-08" }), NOW).text).toBe("Tonight, 11:59 PM");
    expect(dueText(item({ dueOn: "2026-11-09" }), NOW).text).toBe("Tomorrow");
    expect(dueText(item({ dueOn: "2026-11-11" }), NOW).text).toBe("Wed, Nov 11");
    expect(dueText(item({ dueOn: null, dueAt: "2026-11-09T01:30:00Z" }), NOW).text).toBe(
      "Tonight, 7:30 PM"
    );
    expect(dueText(item({ dueOn: null, dueAt: "2026-11-08T18:00:00Z" }), NOW).text).toBe(
      "Today, 12:00 PM"
    );
  });

  it("sorts lists soonest first, done newest first, and picks the most urgent", () => {
    const items = [
      item({ key: "a", dueOn: "2026-11-12" }),
      item({ key: "b", dueOn: "2026-11-05" }),
      item({ key: "c", dueOn: "2026-11-03" }),
      item({ key: "d", state: "done", completedAt: "2026-11-02T10:00:00Z" }),
      item({ key: "e", state: "done", completedAt: "2026-11-04T10:00:00Z" }),
    ];
    const { groups, done } = groupHomework(items, NOW);
    expect(groups.map((g) => g.group)).toEqual(["past", "week"]);
    expect(groups[0].items.map((i) => i.key)).toEqual(["c", "b"]);
    expect(done.map((i) => i.key)).toEqual(["e", "d"]);
    expect(mostUrgent(items, NOW)?.key).toBe("c");
    expect(mostUrgent([item({ href: null })], NOW)).toBeNull();
  });

  it("nudges once, gently", () => {
    expect(lateNudge(0)).toBeNull();
    expect(lateNudge(1)).toBe("One piece is late. It still counts, so start with it tonight.");
    expect(lateNudge(2)).toBe(
      "Two pieces are late. They still count, so start with the oldest tonight."
    );
    expect(lateNudge(14)).toContain("14 pieces");
  });

  it("sums the week from Sunday to Saturday, with late work in the time left", () => {
    const items = [
      item({ key: "a", dueOn: "2026-11-03" }),
      item({ key: "b", dueOn: "2026-11-08", state: "done" }),
      item({ key: "c", dueOn: "2026-11-08" }),
      item({ key: "d", dueOn: "2026-11-14", size: { questions: 98, timedMinutes: 134 } }),
      item({ key: "e", dueOn: "2026-11-15" }),
      item({ key: "f", dueOn: "2026-11-12", state: "locked" }),
    ];
    const w = weekSummary(items, 60, NOW);
    expect(w.assigned).toBe(3);
    expect(w.done).toBe(1);
    expect(w.minutesLeft).toBe(10 + 10 + 134);
  });
});

describe("time estimates", () => {
  it("caps long pauses and drops rushed sets", () => {
    const kept = activeSeconds([
      { sessionId: "s1", seconds: 60 },
      { sessionId: "s1", seconds: 900 },
      { sessionId: "rushed", seconds: 3 },
      { sessionId: "rushed", seconds: 4 },
      { sessionId: "rushed", seconds: 50 },
    ]);
    expect(kept).toEqual([60, 120]);
  });

  it("blends the student's pace with everyone's until 30 answers", () => {
    expect(blendedPace([], null)).toBe(DEFAULT_PACE_SECONDS);
    expect(blendedPace([], 90)).toBe(90);
    expect(blendedPace(Array(15).fill(60), 90)).toBe(75);
    expect(blendedPace(Array(40).fill(60), 90)).toBe(60);
  });

  it("estimates and formats", () => {
    expect(estimateMinutes({ questions: 10 }, 72)).toBe(12);
    expect(estimateMinutes({ questions: 27, timedMinutes: 32 }, 72)).toBe(32);
    expect(estimateMinutes(null, 72)).toBeNull();
    expect(formatMinutes(134)).toBe("2 hr 14 min");
    expect(formatMinutes(120)).toBe("2 hr");
    expect(sizeText({ questions: 10 }, 72)).toBe("10 questions · about 12 min");
    expect(sizeText({ questions: 98, timedMinutes: 134 }, 72)).toBe("98 questions · 2 hr 14 min");
    expect(resultText({ correct: 9, total: 10, seconds: 660, reviewHref: null })).toBe(
      "9 of 10 right · 11 min"
    );
    expect(resultText({ correct: 3, total: 10, seconds: null, reviewHref: null })).toBe(
      "3 of 10 right"
    );
  });
});
