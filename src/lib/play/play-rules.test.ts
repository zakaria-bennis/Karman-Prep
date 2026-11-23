import { describe, expect, it } from "vitest";
import { answerCoins, coinsFor, COIN_STAND_INS } from "@/lib/coins/earn";
import { multiplierOn } from "@/lib/coins/multiplier";
import { bestRun, dailyMoves, setMove } from "./mastery";
import type { Level72 } from "./types";

const oks = (pattern: string) => [...pattern].map((c) => ({ ok: c === "1" }));

describe("skill set mastery (3, 4, 5 right in a row)", () => {
  it("counts the longest run, a rescued miss counting as right", () => {
    expect(bestRun(oks("11011100"))).toBe(3);
    expect(bestRun([{ ok: true }, { ok: false, rescued: true }, { ok: true }])).toBe(3);
    expect(bestRun([{ ok: true, hint: true }, { ok: true }])).toBe(1);
  });
  it("moves up one level when the run reaches the next mark", () => {
    expect(setMove(0, oks("11100000"), true).to).toBe(1);
    expect(setMove(1, oks("11100000"), true).to).toBe(1);
    expect(setMove(1, oks("01111000"), true).to).toBe(2);
    expect(setMove(2, oks("11110111"), true).to).toBe(2);
    expect(setMove(2, oks("01111100"), true).to).toBe(3);
    expect(setMove(3, oks("11111111"), true).to).toBe(3);
  });
  it("never moves a half-finished set, and never more than one level", () => {
    expect(setMove(0, oks("11111"), false).to).toBe(0);
    expect(setMove(0, oks("11111111"), true).to).toBe(1);
  });
});

describe("Daily 10 moves", () => {
  const levels: Record<string, Level72> = { a: 0, b: 1, c: 2, d: 3 };
  const of = (id: string) => levels[id] ?? 0;
  it("all right moves a skill up one; any miss moves it down one, never below Learning", () => {
    const moves = dailyMoves(of, [
      { skillId: "a", ok: true },
      { skillId: "b", ok: false },
      { skillId: "c", ok: false },
      { skillId: "d", ok: true },
      { skillId: "d", ok: true },
    ]);
    expect(moves).toEqual([
      { skillId: "a", from: 0, to: 1 },
      { skillId: "c", from: 2, to: 1 },
    ]);
  });
  it("a Not started skill stays put on a miss", () => {
    expect(dailyMoves(of, [{ skillId: "a", ok: false }])).toEqual([]);
  });
});

describe("coins", () => {
  it("pays weak skills more and repeats less", () => {
    const fresh = answerCoins({ ok: true, difficulty: 3, level: 0, before: 0 });
    const strong = answerCoins({ ok: true, difficulty: 3, level: 3, before: 0 });
    const repeat = answerCoins({ ok: true, difficulty: 3, level: 3, before: 1 });
    expect(fresh).toBeGreaterThan(strong);
    expect(repeat).toBe(strong / 2);
    expect(answerCoins({ ok: false, difficulty: 7, level: 0, before: 0 })).toBe(0);
  });
  it("multiplies every coin, capped at x3", () => {
    const a = { ok: true, difficulty: 3, level: 3, before: 0 };
    const one = coinsFor({ activity: "skill-set", answers: [a], levelsUp: 1, multiplier: 1 });
    const three = coinsFor({ activity: "skill-set", answers: [a], levelsUp: 1, multiplier: 9 });
    expect(one.total).toBe(COIN_STAND_INS.right + COIN_STAND_INS.finish["skill-set"] + 40);
    expect(three.total).toBe(one.total * 3);
    expect(three.multiplier).toBe(3);
  });
  it("an endless run pays its finishing coins only from ten answers", () => {
    const miss = { ok: false, difficulty: 3, level: 1, before: 0 };
    expect(
      coinsFor({ activity: "endless", answers: [miss], levelsUp: 0, multiplier: 1 }).total
    ).toBe(0);
  });
  it("comes to roughly 1,100 a week for a steady student before the multiplier", () => {
    const day = (right: number, total: number, level = 1) =>
      Array.from({ length: total }, (_, i) => ({ ok: i < right, difficulty: 3, level, before: 0 }));
    let week = 0;
    for (let d = 1; d <= 7; d++) {
      week += coinsFor({
        activity: "daily-ten",
        answers: day(6, 10),
        levelsUp: 0,
        streakDays: d,
        multiplier: 1,
      }).total;
      week += coinsFor({
        activity: "skill-set",
        answers: day(5, 8),
        levelsUp: d % 3 === 0 ? 1 : 0,
        multiplier: 1,
      }).total;
      week += coinsFor({
        activity: "challenge",
        answers: day(1, 2),
        levelsUp: 0,
        multiplier: 1,
      }).total;
    }
    expect(week).toBeGreaterThan(900);
    expect(week).toBeLessThan(1400);
  });
});

describe("challenge multiplier", () => {
  it("goes up 0.1 a right answer and 0.05 a wrong one", () => {
    const days = [
      { day: "2026-11-20", answers: [{ ok: true }, { ok: false }] },
      { day: "2026-11-21", answers: [{ ok: true }, { ok: true }] },
    ];
    expect(multiplierOn(days, "2026-11-22")).toBe(1.35);
  });
  it("resets after a whole day missed, including all of yesterday", () => {
    const days = [
      { day: "2026-11-18", answers: [{ ok: true }, { ok: true }] },
      { day: "2026-11-20", answers: [{ ok: true }] },
    ];
    expect(multiplierOn(days, "2026-11-21")).toBe(1.1);
    expect(multiplierOn(days, "2026-11-22")).toBe(1);
  });
  it("keeps going over a day kept with a Streak saver, adding nothing for it", () => {
    const days = [
      { day: "2026-11-19", answers: [{ ok: true }, { ok: true }] },
      { day: "2026-11-21", answers: [{ ok: true }] },
    ];
    expect(multiplierOn(days, "2026-11-22")).toBe(1.1);
    expect(multiplierOn(days, "2026-11-22", ["2026-11-20"])).toBe(1.3);
    // yesterday saved: today has not reset it
    expect(multiplierOn(days.slice(0, 1), "2026-11-21", ["2026-11-20"])).toBe(1.2);
  });
  it("is capped at x3", () => {
    const days = Array.from({ length: 15 }, (_, i) => ({
      day: `2026-11-${String(i + 1).padStart(2, "0")}`,
      answers: [{ ok: true }, { ok: true }],
    }));
    expect(multiplierOn(days, "2026-11-16")).toBe(3);
  });
});
