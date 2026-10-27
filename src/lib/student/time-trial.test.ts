import { describe, expect, it } from "vitest";
import {
  currentTarget,
  expectedDone,
  formatClock,
  goalSeconds,
  nextTarget,
  paceDelta,
  robustMeanSeconds,
  startingTarget,
  type TrialRun,
} from "./time-trial";

describe("goalSeconds", () => {
  it("multiplies College Board time by the accommodation", () => {
    expect(goalSeconds("reading", "standard")).toBe(1920);
    expect(goalSeconds("math", "time_and_half")).toBe(3150);
    expect(goalSeconds("math", "double")).toBe(4200);
  });
});

describe("robustMeanSeconds", () => {
  it("drops extreme outliers on both sides and averages the rest", () => {
    const times = [60, 70, 80, 75, 65, 72, 68, 90, 85, 77, 2400, 1];
    const r = robustMeanSeconds(times);
    expect(r.dropped).toBe(2);
    expect(r.kept).toBe(10);
    expect(r.mean).toBeCloseTo(74.2, 1);
  });
  it("keeps mild long thinks (only extreme ones go)", () => {
    const r = robustMeanSeconds([40, 55, 60, 70, 80, 90, 100, 120, 150, 260]);
    expect(r.kept).toBe(10);
  });
  it("ignores invalid times", () => {
    expect(robustMeanSeconds([0, -4, NaN]).mean).toBeNull();
  });
});

describe("startingTarget", () => {
  const steady = Array.from({ length: 40 }, (_, i) => 100 + (i % 5) * 4);
  it("uses the student's own pace times the module length", () => {
    const t = startingTarget("math", steady, "standard");
    expect(t.basis).toBe("history");
    expect(t.seconds).toBe(2375); // mean 108 s x 22 = 2376, to 5 s
  });
  it("falls back to 1.5x the goal with little history", () => {
    const t = startingTarget("reading", [50, 60, 70], "standard");
    expect(t).toMatchObject({ basis: "starting_pace", seconds: 2880, goal: 1920 });
  });
  it("never starts faster than the goal", () => {
    const fast = Array.from({ length: 20 }, () => 40);
    expect(startingTarget("math", fast, "standard").seconds).toBe(2100);
  });
  it("never starts slower than three times the goal", () => {
    const slow = Array.from({ length: 20 }, () => 600);
    expect(startingTarget("reading", slow, "standard").seconds).toBe(5760);
  });
  it("uses the accommodated goal", () => {
    const fast = Array.from({ length: 20 }, () => 40);
    expect(startingTarget("math", fast, "double").seconds).toBe(4200);
  });
});

describe("nextTarget", () => {
  const base = {
    target: 3000,
    goal: 2100,
    elapsedSeconds: 2900,
    finished: true,
    correct: 16,
    questions: 22,
    baselineAccuracy: 0.75,
  };
  it("moves 20% of the gap on a beat", () => {
    expect(nextTarget(base)).toEqual({ beat: true, reason: "beat", nextTarget: 2820 });
  });
  it("holds on a miss", () => {
    expect(nextTarget({ ...base, elapsedSeconds: 3001 })).toMatchObject({
      beat: false,
      reason: "over_time",
      nextTarget: 3000,
    });
  });
  it("holds when the module was not finished", () => {
    expect(nextTarget({ ...base, finished: false }).reason).toBe("unfinished");
  });
  it("holds when accuracy fell more than 15 points (rushed)", () => {
    expect(nextTarget({ ...base, correct: 12 })).toMatchObject({ beat: false, reason: "rushed" });
  });
  it("snaps to the goal when the gap is under 15 seconds", () => {
    expect(nextTarget({ ...base, target: 2115, elapsedSeconds: 2000 }).nextTarget).toBe(2100);
  });
  it("never goes faster than the goal", () => {
    expect(nextTarget({ ...base, target: 2100, elapsedSeconds: 1500 }).nextTarget).toBe(2100);
  });
  it("squeezes toward the accommodated goal at the same 20% step", () => {
    const r = nextTarget({ ...base, target: 6000, goal: 4200, elapsedSeconds: 5000 });
    expect(r.nextTarget).toBe(5640);
  });
  it("converges on the goal after repeated beats", () => {
    let t = 3600;
    for (let i = 0; i < 40; i++)
      t = nextTarget({ ...base, target: t, elapsedSeconds: t }).nextTarget;
    expect(t).toBe(2100);
  });
});

describe("pace", () => {
  it("knows where the student should be", () => {
    expect(expectedDone(1050, 2100, 22)).toBe(11);
    expect(paceDelta(13, 1050, 2100, 22)).toBe(2);
    expect(paceDelta(9, 1050, 2100, 22)).toBe(-2);
  });
  it("formats the clock", () => {
    expect(formatClock(2465)).toBe("41:05");
    expect(formatClock(-75)).toBe("1:15");
  });
});

describe("currentTarget", () => {
  const start = { seconds: 3000, goal: 2100, basis: "history" as const, sample: 40 };
  const run = (finishedAt: string, next: number): TrialRun => ({
    id: finishedAt,
    section: "math",
    target: 3000,
    elapsedSeconds: 2900,
    correct: 15,
    questions: 22,
    beat: true,
    nextTarget: next,
    finishedAt,
  });
  it("uses the latest run in the section", () => {
    const runs = [run("2026-10-01", 2900), run("2026-10-20", 2700)];
    expect(currentTarget("math", runs, start)).toBe(2700);
    expect(currentTarget("reading", runs, start)).toBe(3000);
  });
});
