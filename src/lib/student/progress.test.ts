import { describe, expect, it } from "vitest";
import { DECAY_DAYS } from "./levels";
import {
  activeSeconds,
  clock,
  formatEffort,
  monthEffort,
  mysteryBox,
  personalBests,
  practiceSets,
  predictedFromRange,
  scoreChange,
  scoreHistory,
  trendGeometry,
  dailyEffort,
  whatMoved,
} from "./progress";

const DAY = 86_400_000;
// Sunday 8 November 2026, noon Central (18:00 UTC).
const NOW = Date.parse("2026-11-08T18:00:00Z");

describe("predicted score", () => {
  it("is one number: the midpoint of a range, to the nearest 10", () => {
    expect(predictedFromRange(1178, 1258)).toBe(1220);
    expect(predictedFromRange(1278, 1358)).toBe(1320);
    expect(predictedFromRange(1590, 1600)).toBe(1600);
    expect(predictedFromRange(200, 220)).toBe(400);
  });

  it("orders history oldest first and words the change", () => {
    const history = scoreHistory([
      { taken_at: "2026-11-02T15:00:00Z", score_range_low: 1278, score_range_high: 1358 },
      { taken_at: "2026-10-04T15:00:00Z", score_range_low: 1178, score_range_high: 1258 },
    ]);
    expect(history.map((p) => p.score)).toEqual([1220, 1320]);
    expect(scoreChange(history)).toBe("Up 100 since Oct 4");
    expect(scoreChange(history.slice(0, 1))).toBeNull();
    expect(scoreChange([history[1], { at: "2026-11-05T15:00:00Z", score: 1300 }])).toBe(
      "Down 20 since Nov 2"
    );
  });

  it("lays the line out inside the box, higher scores higher up", () => {
    const g = trendGeometry([
      { at: "2026-10-04T15:00:00Z", score: 1220 },
      { at: "2026-11-02T15:00:00Z", score: 1320 },
    ]);
    expect(g.points).toHaveLength(2);
    expect(g.points[1].y).toBeLessThan(g.points[0].y);
    for (const p of g.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(g.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(g.height);
    }
    expect(trendGeometry([{ at: "2026-10-04T15:00:00Z", score: 1220 }]).points[0].x).toBe(150);
  });
});

describe("what moved this week", () => {
  const labels = new Map([
    ["a", "Transitions"],
    ["b", "Circles"],
    ["c", "Percentages"],
  ]);
  const answers = (skillId: string, pattern: string, startMs: number) =>
    [...pattern].map((ch, i) => ({ skillId, correct: ch === "1", at: startMs + i * 60_000 }));

  it("lists ups first, then downs, and leaves still skills out", () => {
    const moved = whatMoved(
      [
        // a: New before the week, then a run of 3 this week -> Learning.
        ...answers("a", "0", NOW - 10 * DAY),
        ...answers("a", "111", NOW - 2 * DAY),
        // b: Learning long ago, idle since -> decays during the week.
        ...answers("b", "0111", NOW - (DECAY_DAYS + 3) * DAY),
        // c: unchanged.
        ...answers("c", "0", NOW - 20 * DAY),
      ],
      labels,
      NOW
    );
    expect(moved.map((m) => [m.label, m.from, m.to])).toEqual([
      ["Transitions", 1, 2],
      ["Circles", 2, 1],
    ]);
  });

  it("a first answer this week is a move from not started", () => {
    expect(whatMoved(answers("c", "1", NOW - DAY), labels, NOW)).toEqual([
      { skillId: "c", label: "Percentages", from: 0, to: 1 },
    ]);
  });
});

describe("time and effort", () => {
  it("caps pauses at 2 minutes", () => {
    expect(activeSeconds(30)).toBe(30);
    expect(activeSeconds(900)).toBe(120);
    expect(activeSeconds(-5)).toBe(0);
  });

  it("sums active time per day for the last week, oldest first, with the busiest day full", () => {
    const days = dailyEffort(
      [
        { at: NOW, seconds: 100 }, // today
        { at: NOW, seconds: 100 },
        { at: NOW - DAY, seconds: 60 }, // yesterday
        { at: NOW - DAY, seconds: 5000 }, // a pause: counts 120
        { at: NOW - 30 * DAY, seconds: 60 }, // too old
      ],
      NOW
    );
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ label: "Today", seconds: 200, share: 1 });
    expect(days[5].seconds).toBe(180);
    expect(days[5].share).toBeCloseTo(0.9);
    expect(days[5].label).toMatch(/^[A-Z][a-z]{2}$/);
    expect(days[0].seconds).toBe(0);
  });

  it("formats effort and the month", () => {
    expect(formatEffort(0)).toBe("0");
    expect(formatEffort(1500)).toBe("25 min");
    expect(formatEffort(11_160)).toBe("3.1 hr");
    expect(monthEffort([], NOW)).toEqual({ questions: 0, paceSeconds: null });
    expect(
      monthEffort(
        [
          { at: NOW - DAY, seconds: 50 },
          { at: NOW - 2 * DAY, seconds: 300 },
          { at: NOW - 30 * DAY, seconds: 10 },
        ],
        NOW
      )
    ).toEqual({ questions: 2, paceSeconds: 85 });
  });
});

describe("personal bests and rewards", () => {
  it("shows only the bests that exist", () => {
    expect(personalBests({ sets: [], trials: [] })).toEqual([]);
    const sets = practiceSets([
      ...[1, 1, 1, 0, 1, 1, 1, 1, 1, 1].map((c, i) => ({
        sessionId: "s1",
        correct: c === 1,
        at: NOW - DAY + i,
      })),
      ...[1, 1, 1].map((c, i) => ({ sessionId: "short", correct: c === 1, at: NOW + i })),
    ]);
    expect(sets).toHaveLength(1);
    const bests = personalBests({
      sets,
      trials: [
        { beat: false, finished: true, elapsed_seconds: 200, section: "math" },
        { beat: true, finished: true, elapsed_seconds: 372, section: "math" },
        { beat: true, finished: true, elapsed_seconds: 410, section: "reading" },
      ],
    });
    expect(bests.map((b) => [b.value, b.label])).toEqual([
      ["9 of 10", "Best practice set"],
      ["6:12", "Fastest Math time trial"],
    ]);
  });

  it("formats a clock and counts to the next mystery box", () => {
    expect(clock(372)).toBe("6:12");
    expect(clock(59)).toBe("0:59");
    expect(mysteryBox(0)).toEqual({ share: 0, toGo: 300 });
    expect(mysteryBox(240)).toEqual({ share: 0.8, toGo: 60 });
    expect(mysteryBox(610)).toEqual({ share: 10 / 300, toGo: 290 });
  });
});
