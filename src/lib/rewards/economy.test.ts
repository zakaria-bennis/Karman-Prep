import { describe, expect, it } from "vitest";
import { ACCESSORY_IDS, BOX_BONUS_TOKENS, BOX_COST } from "./catalog";
import {
  BEAR_ANSWERS,
  balanceOf,
  boxProgress,
  boxesAffordable,
  earnedCompanions,
  endingPhases,
  longestRun,
  pickPrize,
  shuffledAccessories,
  type RewardFacts,
} from "./economy";

const none: RewardFacts = {
  dailyTenDays: [],
  fullTests: 0,
  trialBeaten: false,
  answered: 0,
  conquered: 0,
};

describe("token balance", () => {
  it("is earned tokens minus each box's cost plus its bonus", () => {
    expect(balanceOf(640, [])).toBe(640);
    expect(balanceOf(640, [{ cost: BOX_COST, bonus: 0 }])).toBe(340);
    expect(balanceOf(640, [{ cost: BOX_COST, bonus: BOX_BONUS_TOKENS }])).toBe(490);
  });
  it("never shows a negative balance", () => {
    expect(balanceOf(100, [{ cost: BOX_COST, bonus: 0 }])).toBe(0);
  });
  it("says how far the next box is, and how many the balance pays for", () => {
    expect(boxProgress(0)).toEqual({ ready: false, toGo: BOX_COST, share: 0 });
    expect(boxProgress(150)).toEqual({ ready: false, toGo: 150, share: 0.5 });
    expect(boxProgress(BOX_COST).ready).toBe(true);
    expect(boxesAffordable(BOX_COST * 2 + 10)).toBe(2);
    expect(boxesAffordable(-5)).toBe(0);
  });
});

describe("the prize in a box", () => {
  it("is the first accessory in the order the student does not own", () => {
    expect(pickPrize([], ["cap", "bow"])).toEqual({ kind: "accessory", id: "cap" });
    expect(pickPrize(["cap"], ["cap", "bow"])).toEqual({ kind: "accessory", id: "bow" });
  });
  it("is tokens back once every accessory is owned, never money", () => {
    expect(pickPrize([...ACCESSORY_IDS], [...ACCESSORY_IDS])).toEqual({
      kind: "tokens",
      bonus: BOX_BONUS_TOKENS,
    });
    expect(BOX_BONUS_TOKENS).toBeLessThan(BOX_COST);
  });
  it("shuffles every accessory exactly once", () => {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const order = shuffledAccessories(random);
    expect([...order].sort()).toEqual([...ACCESSORY_IDS].sort());
  });
});

describe("companions", () => {
  it("starts everyone with the fox", () => {
    expect(earnedCompanions(none)).toEqual(["fox"]);
  });
  it("brings the bunny for 7 Daily 10s in a row, not 7 scattered ones", () => {
    const week = [
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ];
    expect(earnedCompanions({ ...none, dailyTenDays: week })).toContain("bunny");
    const gaps = [
      "2026-11-01",
      "2026-11-03",
      "2026-11-05",
      "2026-11-07",
      "2026-11-09",
      "2026-11-11",
      "2026-11-13",
    ];
    expect(earnedCompanions({ ...none, dailyTenDays: gaps })).not.toContain("bunny");
  });
  it("brings each other companion for its own milestone", () => {
    const all = earnedCompanions({
      dailyTenDays: [],
      fullTests: 1,
      trialBeaten: true,
      answered: BEAR_ANSWERS,
      conquered: 1,
    });
    expect(all).toEqual(["fox", "cat", "owl", "bear", "wolf"]);
    expect(earnedCompanions({ ...none, answered: BEAR_ANSWERS - 1 })).toEqual(["fox"]);
  });
  it("counts the longest run of days, crossing months, once per day", () => {
    expect(longestRun([])).toBe(0);
    expect(longestRun(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-01"])).toBe(3);
    expect(longestRun(["2026-11-05", "2026-11-01", "2026-11-02"])).toBe(2);
  });
});

describe("the Daily 10 ending", () => {
  it("goes new companion, then the box, then the results", () => {
    expect(endingPhases({ newCompanions: 1, tokensToday: 40 })).toEqual([
      "companion",
      "box",
      "results",
    ]);
  });
  it("skips the box when nothing was earned, and the moment when no one joined", () => {
    expect(endingPhases({ newCompanions: 0, tokensToday: 0 })).toEqual(["results"]);
    expect(endingPhases({ newCompanions: 0, tokensToday: 10 })).toEqual(["box", "results"]);
  });
});
