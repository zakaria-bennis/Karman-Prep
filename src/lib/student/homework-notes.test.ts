import { describe, expect, it } from "vitest";
import { NOTE_AUTHOR, homeworkNote } from "./homework-notes";

describe("homework notes signed David", () => {
  it("is signed David", () => {
    expect(NOTE_AUTHOR).toBe("David");
  });

  it("matches the line to the result", () => {
    const fast = homeworkNote({ key: "a", correct: 10, total: 10, seconds: 300, paceSeconds: 75 });
    expect(fast).toMatch(/Fast and accurate|Quick and clean/);
    const great = homeworkNote({ key: "a", correct: 9, total: 10, seconds: 900, paceSeconds: 75 });
    expect(great).toMatch(/Excellent|Nearly perfect|Great set/);
    expect(homeworkNote({ key: "a", correct: 7, total: 10 })).toMatch(/Nice work|Good set/);
    expect(homeworkNote({ key: "a", correct: 5, total: 10 })).toMatch(/Good effort|Halfway/);
    expect(homeworkNote({ key: "a", correct: 2, total: 10 })).toMatch(/Tough set|still new/);
    expect(homeworkNote({ key: "a" })).toMatch(/Done|Finished/);
  });

  it("talks about the clock, not videos, for timed work", () => {
    expect(homeworkNote({ key: "t", correct: 20, total: 22, timed: true })).toMatch(/clock|pace/);
    expect(homeworkNote({ key: "t", correct: 15, total: 22, timed: true })).toMatch(/pace|time/);
    expect(homeworkNote({ key: "t", correct: 8, total: 22, timed: true })).toMatch(/clock|time/);
    expect(homeworkNote({ key: "t", correct: 8, total: 22, timed: true })).not.toMatch(/video/);
  });

  it("gives the same item the same line every time, and is one short line", () => {
    const first = homeworkNote({ key: "tutor:abc", correct: 8, total: 10 });
    expect(homeworkNote({ key: "tutor:abc", correct: 8, total: 10 })).toBe(first);
    for (const key of ["a", "b", "c", "d", "e"]) {
      const line = homeworkNote({ key, correct: 6, total: 10 });
      expect(line.length).toBeLessThan(80);
      expect(line).not.toContain("\n");
    }
  });
});
