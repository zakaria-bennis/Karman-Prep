import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dailyWords, wordPartCards } from "@/data/vocabulary/content";
import {
  gameOutcome,
  keyboardFeedback,
  millisecondsUntilNextUtcDay,
  puzzleForDay,
  savedGuesses,
  scoreGuess,
  utcDay,
} from "./daily-word";

describe("daily word rules", () => {
  it("uses one UTC day regardless of local timezone", () => {
    expect(utcDay(new Date("2026-10-08T23:59:59.000Z"))).toBe("2026-10-08");
    expect(utcDay(new Date("2026-10-09T00:00:00.000Z"))).toBe("2026-10-09");
    expect(millisecondsUntilNextUtcDay(new Date("2026-10-08T23:59:59.500Z"))).toBe(500);
    expect(puzzleForDay("2026-10-08").word).toBe(dailyWords[0].word);
    expect(puzzleForDay("2026-10-09").word).toBe(dailyWords[1].word);
    expect(puzzleForDay("2026-10-20").word).toBe(dailyWords[0].word);
  });

  it("scores duplicate letters only as often as the answer contains them", () => {
    expect(scoreGuess("AAAAC", "AABBA")).toEqual([
      "correct",
      "correct",
      "present",
      "absent",
      "absent",
    ]);
    expect(scoreGuess("EERIE", "LEVEL")).toEqual([
      "present",
      "correct",
      "absent",
      "absent",
      "absent",
    ]);
  });

  it("keeps the strongest keyboard feedback for repeated letters", () => {
    expect(keyboardFeedback(["EERIE"], "LEVEL").get("E")).toBe("correct");
  });

  it("recognizes wins and losses and rejects malformed saved data", () => {
    expect(gameOutcome(["LUCID"], "LUCID")).toBe("won");
    expect(gameOutcome(["OTHER", "OTHER", "OTHER", "OTHER", "OTHER", "OTHER"], "LUCID")).toBe(
      "lost"
    );
    expect(savedGuesses('["LUCID","OTHER"]', 5)).toEqual(["LUCID", "OTHER"]);
    expect(savedGuesses('["LUCID",123]', 5)).toEqual([]);
    expect(savedGuesses('["<img>"]', 5)).toEqual([]);
    expect(savedGuesses("not json", 5)).toEqual([]);
  });
});

describe("reviewed starter coverage", () => {
  it("has distinct sourced words of varying lengths, with each answer in the valid-guess dictionary", () => {
    expect(dailyWords).toHaveLength(12);
    expect(new Set(dailyWords.map((entry) => entry.word)).size).toBe(dailyWords.length);
    expect(new Set(dailyWords.map((entry) => entry.word.length)).size).toBeGreaterThan(1);
    for (const entry of dailyWords) {
      expect(entry.word).toMatch(/^[A-Z]{5,8}$/);
      expect(entry.context).toContain("_____");
      expect(entry.meaning.length).toBeGreaterThan(10);
      expect(entry.sourceUrl).toBe(
        `https://www.merriam-webster.com/dictionary/${entry.word.toLowerCase()}`
      );
      const list = readFileSync(`public/vocabulary/guesses-${entry.word.length}.txt`, "utf8");
      expect(list.trim().split(",")).toContain(entry.word.toLowerCase());
    }
  });

  it("has six sourced entries in each literal word-part group", () => {
    for (const group of ["prefix", "suffix", "root"]) {
      expect(wordPartCards.filter((card) => card.group === group)).toHaveLength(6);
    }
    expect(new Set(wordPartCards.map((card) => card.id)).size).toBe(wordPartCards.length);
    expect(
      wordPartCards.every((card) => card.sourceUrl.startsWith("https://www.readingrockets.org/"))
    ).toBe(true);
  });
});
