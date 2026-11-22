import type { LessonChecks } from "./types";

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const mean = (a: number[]) => sum(a) / a.length;
const ex0 = [12, 15, 15, 18, 20, 22, 45];

const checks: LessonChecks = {
  examples: [mean(ex0) - mean(ex0.slice(0, -1)), 84 * 5 - sum([78, 85, 90, 81])],
  // mean 8 -> 56/6; median 7 -> (7 + 9) / 2 = 8: both rise
  check: { text: "The mean and the median both increase." },
  quiz: [
    15 * 6 - sum([12, 18, 9, 20, 14]),
    { text: "Put the numbers in order" },
    // 2, 5, 8, 10, 14: the middle value
    8,
    // A: mean 103, spread 1 apart; B: mean 60, spread 20 apart
    { text: "Set A has the larger mean; set B has the larger standard deviation" },
    // (70 - 34) / 9 = 4; 34 stays above the median 28
    { text: "The mean decreases by 4, and the median is unchanged" },
  ],
};

export default checks;
