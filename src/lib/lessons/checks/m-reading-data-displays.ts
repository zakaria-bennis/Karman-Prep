import type { LessonChecks } from "./types";

// Example figures (read from the figure data only): a dot plot of books read, a table of pets.
const books = [0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4];

function median(a: number[]): number {
  const s = [...a].sort((p, q) => p - q);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const checks: LessonChecks = {
  examples: [
    books.reduce((s, v) => s + v, 0) / books.length,
    // 15 families (4, 5, 3, 2, 1): the 8th value falls in the 1-pet row
    1,
  ],
  check: 97 - 52,
  quiz: [
    // 21 students; the 11th: cumulative 1, 3, 10, 16 -> 3 siblings
    3,
    { text: "Multiply each score by its count" },
    { text: "a box plot does not show the mean" },
    { text: "The classes have the same median score" },
    // 30 students; 15th and 16th: cumulative 3, 9, 18 -> 40 to 60
    { text: "40 to 60 minutes" },
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [
      ((a: number[]) => a.reduce((s, v) => s + v, 0) / a.length)([
        0, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4,
      ]),
      ((a: number[]) => a.reduce((s, v) => s + v, 0) / a.length)([1, 1, 2, 3, 3, 4, 4, 4, 4, 5]),
    ],
    // the median of the table's values, each listed as many times as its count
    [
      median([0, 1, 2, 3, 4].flatMap((v, i) => Array<number>([1, 2, 3, 4, 6][i]).fill(v))),
      median([0, 1, 2, 3, 4].flatMap((v, i) => Array<number>([6, 3, 4, 5, 1][i]).fill(v))),
    ],
  ],
};

export default checks;
