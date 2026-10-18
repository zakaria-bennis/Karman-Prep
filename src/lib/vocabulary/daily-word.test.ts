import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { dailyWords, legacyDailyWords, wordPartCards } from "@/data/vocabulary/content";
import {
  gameOutcome,
  keyboardFeedback,
  legacyPuzzleForDay,
  millisecondsUntilNextUtcDay,
  parseAcceptedGuesses,
  puzzleForDay,
  restoreDailySession,
  savedGuesses,
  scoreGuess,
  utcDay,
} from "./daily-word";

describe("daily word rules", () => {
  it("parses the attributed guess-list format and rejects malformed spellings", () => {
    expect(
      parseAcceptedGuesses(
        "# Copyright 2000-2026 by Kevin Atkinson\n# See /vocabulary/NOTICE.txt\nlevel,lever\n",
        5
      )
    ).toEqual(new Set(["LEVEL", "LEVER"]));
    expect(() =>
      parseAcceptedGuesses("# Copyright 2000-2026 by Kevin Atkinson\nlevel,le-\n", 5)
    ).toThrow("Invalid accepted-guess list");
  });

  it("uses one UTC day regardless of local timezone", () => {
    expect(utcDay(new Date("2026-10-08T23:59:59.000Z"))).toBe("2026-10-08");
    expect(utcDay(new Date("2026-10-09T00:00:00.000Z"))).toBe("2026-10-09");
    expect(millisecondsUntilNextUtcDay(new Date("2026-10-08T23:59:59.500Z"))).toBe(500);
    expect(puzzleForDay("2026-10-08").word).toBe("ABATE");
    expect(legacyPuzzleForDay("2026-10-09").word).toBe("AUSTERE");
    const cycle = Array.from(
      { length: dailyWords.length + 1 },
      (_, offset) =>
        puzzleForDay(new Date(Date.UTC(2026, 9, 9 + offset)).toISOString().slice(0, 10)).id
    );
    expect(new Set(cycle.slice(0, dailyWords.length)).size).toBe(dailyWords.length);
    expect(cycle.at(-1)).toBe(cycle[0]);
  });

  it("pins old guesses to the legacy answer and new guesses to a stable word ID", () => {
    const day = "2026-10-09";
    const expanded = puzzleForDay(day);
    const old = restoreDailySession(day, '["OBLIQUE"]', null);
    expect(old).toEqual({
      word: legacyPuzzleForDay(day),
      guesses: ["OBLIQUE"],
      storageVersion: "v1",
    });
    expect(
      restoreDailySession(
        day,
        '["OBLIQUE"]',
        JSON.stringify({
          wordId: expanded.id,
          guesses: ["Z".repeat(expanded.word.length)],
        })
      ).storageVersion
    ).toBe("v1");
    const pinned = dailyWords.find((word) => word.word === "SYNCHRONIZATION")!;
    expect(
      restoreDailySession(
        day,
        null,
        JSON.stringify({ wordId: pinned.id, guesses: ["Z".repeat(pinned.word.length)] })
      )
    ).toEqual({ word: pinned, guesses: ["Z".repeat(15)], storageVersion: "v2" });
    expect(restoreDailySession(day, null, '{"wordId":"removed","guesses":[]}').word).toBe(expanded);
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
    expect(
      scoreGuess("RRRRRRRRRRR", "CORROBORATE").filter((result) => result !== "absent")
    ).toHaveLength(3);
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

describe("reviewed daily answer coverage", () => {
  it("has 73 verified practice choices plus 11 distinct starter answers and separate broad guess lists", () => {
    const raw = readFileSync("docs/vocabulary-source/reviewed-daily-words.json");
    const reviewed = JSON.parse(raw.toString("utf8"));
    expect(createHash("sha256").update(raw).digest("hex")).toBe(
      "0aca436362791691921fcf0ff90256787889630690ba0d00bb0313bc57ae325a"
    );
    expect(reviewed).toHaveLength(73);
    expect(
      reviewed.filter(
        (entry: { evidenceLevel: string }) => entry.evidenceLevel === "official_exact_form"
      )
    ).toHaveLength(65);
    expect(
      reviewed.filter(
        (entry: { evidenceLevel: string }) =>
          entry.evidenceLevel === "official_inflected_form_lemma_normalized"
      )
    ).toHaveLength(8);
    expect(legacyDailyWords).toHaveLength(12);
    expect(dailyWords).toHaveLength(84);
    expect(new Set(dailyWords.map((entry) => entry.word.toLowerCase())).size).toBe(84);
    expect(dailyWords.filter((entry) => entry.satSourceUrl)).toHaveLength(73);
    expect(dailyWords.find((entry) => entry.word === "TENUOUS")?.satSourceUrl).toContain(
      "collegeboard.org"
    );
    expect(Math.min(...dailyWords.map((entry) => entry.word.length))).toBe(5);
    expect(Math.max(...dailyWords.map((entry) => entry.word.length))).toBe(15);
    for (const source of reviewed) {
      const entry = dailyWords.find((word) => word.id === source.id);
      expect(entry?.word).toBe(source.word.toUpperCase());
      expect(entry?.meaning).toBe(source.definition);
      expect(entry?.partOfSpeech).toBe(source.partOfSpeech);
      expect(entry?.caution).toBe(source.ambiguityCaution);
      expect(entry?.satSourceUrl).toBe(source.satSourceUrl);
      expect(source.satEvidence.location).toBe("answer choice");
      expect(source.satEvidence.correctAnswerClaimed).toBe(false);
      expect(source.dictionaryVerification.status).toBe(
        "live_entry_read_spelling_pos_and_selected_meaning_checked"
      );
    }
    expect(dailyWords.find((entry) => entry.word === "SANCTION")?.meaning).toBe(
      "to formally approve or authorize"
    );
    expect(dailyWords.find((entry) => entry.word === "SANCTION")?.caution).toMatch(
      /authorize or penalize/
    );
    for (const entry of dailyWords) {
      expect(entry.word).toMatch(/^[A-Z]{5,15}$/);
      expect(entry.meaning.length).toBeGreaterThan(10);
      expect(entry.sourceUrl).toBe(
        `https://www.merriam-webster.com/dictionary/${entry.word.toLowerCase()}`
      );
      const list = readFileSync(`public/vocabulary/guesses-${entry.word.length}.txt`, "utf8");
      expect(parseAcceptedGuesses(list, entry.word.length).has(entry.word)).toBe(true);
    }
    let totalAccepted = 0;
    for (let length = 5; length <= 15; length++) {
      const list = readFileSync(`public/vocabulary/guesses-${length}.txt`, "utf8");
      expect(list).toMatch(/^# Copyright 2000-2026 by Kevin Atkinson\n/);
      const words = parseAcceptedGuesses(list, length);
      expect(words.size).toBeGreaterThan(1500);
      totalAccepted += words.size;
    }
    expect(totalAccepted).toBe(120327);
    const notice = readFileSync("public/vocabulary/NOTICE.txt", "utf8");
    expect(notice).toContain("Permission to use, copy, modify, distribute, and sell");
    expect(notice).toContain("fa1f9a1382df724be887d3a5d2d743095e6f33fc0949ebb22415c1554bb42fa7");
    expect(
      createHash("sha256")
        .update(notice.slice(notice.indexOf("Copyright 2000-2026")))
        .digest("hex")
    ).toBe("090575a131b4260926c7a6b30a90aca0f5db5fbb5c46778e0c5855227bf6ebc3");
    expect(
      parseAcceptedGuesses(readFileSync("public/vocabulary/guesses-15.txt", "utf8"), 15).has(
        "STRAIGHTFORWARD"
      )
    ).toBe(true);
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
