import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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
      expect(entry.meaning.length).toBeGreaterThan(10);
      expect(entry.sourceUrl).toBe(
        `https://www.merriam-webster.com/dictionary/${entry.word.toLowerCase()}`
      );
      const list = readFileSync(`public/vocabulary/guesses-${entry.word.length}.txt`, "utf8");
      expect(list.trim().split(",")).toContain(entry.word.toLowerCase());
    }
  });

  it("includes all 415 reviewed word-part senses with distinct IDs and linked source metadata", () => {
    const raw = readFileSync("public/vocabulary/reviewed-word-parts.json");
    const source = JSON.parse(raw.toString("utf8"));
    expect(createHash("sha256").update(raw).digest("hex")).toBe(
      "f9ec3e8686a005da389099baed13d765350ccf079cb5f23dd6bcbe66454f1c1e"
    );
    expect(wordPartCards).toHaveLength(415);
    expect(wordPartCards.filter((card) => card.group === "prefix")).toHaveLength(83);
    expect(wordPartCards.filter((card) => card.group === "suffix")).toHaveLength(50);
    expect(wordPartCards.filter((card) => card.group === "root")).toHaveLength(282);
    expect(new Set(wordPartCards.map((card) => card.id)).size).toBe(wordPartCards.length);
    expect(new Set(wordPartCards.map((card) => `${card.group}:${card.front}`)).size).toBe(401);
    const inCards = wordPartCards.filter((card) => card.group === "prefix" && card.front === "in-");
    expect(inCards.map((card) => card.id).sort()).toEqual(["prefix-in-into", "prefix-in-negative"]);
    expect(new Set(inCards.map((card) => card.meaning)).size).toBe(2);
    expect(inCards[0].sameFrontCardIds).toContain(inCards[1].id);
    const erCards = wordPartCards.filter((card) => card.group === "suffix" && card.front === "-er");
    expect(new Set(erCards.map((card) => card.meaning)).size).toBe(2);
    for (const [index, card] of wordPartCards.entries()) {
      expect(card.id).toBe(source[index].id);
      expect(card.meaning).toBe(source[index].back);
      expect(source[index].back).toBe(source[index].meaning);
      expect(source[index].evidence.status).toBe("source_checked");
      expect(source[index].relevance.official_sat_list).toBe(false);
      expect(card.sourceUrls).toEqual(
        source[index].evidence.sources.map((item: { url: string }) => item.url)
      );
      expect(card.sourceUrls.every((url) => url.startsWith("https://"))).toBe(true);
      expect(card.sameFrontCardIds).toEqual(source[index].same_front_card_ids);
      expect(card).not.toHaveProperty("examples");
    }
  });
});
