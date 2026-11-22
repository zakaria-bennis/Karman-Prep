import type { LessonChecks } from "./types";

// Solved blind by a second writer.
const checks: LessonChecks = {
  examples: [
    // visit fee is the start, 45 per hour is the rate
    (h) => 60 + 45 * h,
    // 600 - 15m = 240
    (600 - 240) / 15,
  ],
  check: (t) => 20 - 1.5 * t,
  quiz: [
    // 80 - 4c = 32
    (80 - 32) / 4,
    { text: "the 25 dollar fee is the start" },
    { text: "the rate needs a minus sign" },
    // 40 is the start, 15 is the rate per hour
    { text: "costs 40 dollars, plus 15 dollars for each hour" },
    // 1 gallon per 30 miles, going down from 14
    (m) => 14 - m / 30,
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [(m: number) => 50 + 30 * m, (d: number) => 4 + 2 * d],
    [(900 - 300) / 20, (30 - 12) / 2],
  ],
};

export default checks;
